import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import { zipSync, unzipSync } from "fflate";
import { SystemGameBundlePublisher, sha256Hex } from "@owogg/core";
import type { BundleArchiveReader } from "@owogg/core";
import type { PreparedBundle } from "@owogg/core";
import { BackblazeB2GameBundleRepository } from "@owogg/db";
import type { BackblazeB2Config } from "@owogg/db";

/**
 * Pure(-ish) logic behind scripts/publish-official-game-bundles.ts, kept in its own
 * no-top-level-side-effects module — same split as scripts/registry-builder.ts vs.
 * scripts/generate-game-registry.ts — so scripts/publish-official-game-bundles.test.ts can import
 * these functions directly without triggering a real build+B2 publish as a side effect of import
 * (the runner script's `main()` call happens unconditionally at its own module's top level).
 *
 * See publish-official-game-bundles.ts's own doc comment for the full publish contract (why
 * `version` is the ZIP's own sha256, why a failure here must stop the whole deploy job).
 */

export interface MigratedGame {
  slug: string;
  /** Workspace package name, for `pnpm --filter <pkg> build`. */
  pkg: string;
  /** Absolute path to the package's standalone build output (index.html + assets/*). */
  distDir: string;
}

export interface ReleaseMapEntry {
  version: string;
  entry: string;
}

/** Optional B-1 observer. It receives the exact deterministic ZIP/hash and validated file set the
 * legacy publisher just used, so generic shadow publication cannot drift to a separately-built
 * artifact. Throwing aborts this deploy step before the release map/Web deployment proceeds. */
export interface OfficialBundlePreparedObserver {
  onBundlePrepared(input: {
    slug: string;
    zipBytes: Uint8Array;
    contentHash: string;
    prepared: PreparedBundle;
    publishedAt: string;
  }): Promise<void>;
}

/** Every SYSTEM game that has been migrated onto the standalone-bundle + Game Bridge + IframeRuntime
 * path (see GameHost.tsx's resolveGameRuntimeKind) — all four as of 2026-08-19. Adding a slug here
 * is the ONE thing that turns it on: publishAllMigratedGames below builds+publishes it and adds it
 * to the release map, and GameHost.tsx switches it to IframeRuntime the moment the release map has
 * an entry for it — no other code path needs to change. */
export function migratedGames(repoRoot: string): readonly MigratedGame[] {
  return [
    {
      slug: "reaction-time",
      pkg: "@owogg/game-reaction-time",
      distDir: path.join(repoRoot, "games", "reaction-time", "standalone", "dist"),
    },
    {
      slug: "aim-test",
      pkg: "@owogg/game-aim-test",
      distDir: path.join(repoRoot, "games", "aim-test", "standalone", "dist"),
    },
    {
      slug: "memory-test",
      pkg: "@owogg/game-memory-test",
      distDir: path.join(repoRoot, "games", "memory-test", "standalone", "dist"),
    },
    {
      slug: "typing-test",
      pkg: "@owogg/game-typing-test",
      distDir: path.join(repoRoot, "games", "typing-test", "standalone", "dist"),
    },
  ];
}

export function releaseMapPath(repoRoot: string): string {
  return path.join(
    repoRoot,
    "apps",
    "web",
    "app",
    "features",
    "game",
    "runtime",
    "systemGameReleaseMap.generated.ts",
  );
}

/**
 * Local re-implementation of apps/api/src/infrastructure/games/FflateBundleArchiveReader.ts —
 * that class deliberately lives in the API app's own infrastructure layer, not @owogg/core (core
 * stays free of a zip-library dependency; see that file's own doc comment), so it isn't something
 * this script can import. Same fflate calls, same "metadata pass never touches compressed bytes"
 * property that class documents — this script's own zip is small and self-produced, so the
 * zip-bomb defense those checks exist for isn't the concern here; reusing the exact same reader
 * shape is what lets SystemGameBundlePublisher.prepare() run its normal validation unmodified.
 */
export class FflateArchiveReader implements BundleArchiveReader {
  readMetadata(archive: ArrayBuffer) {
    const entries: Array<{ path: string; declaredSize: number; compressedSize: number }> = [];
    unzipSync(new Uint8Array(archive), {
      filter: (file) => {
        entries.push({
          path: file.name,
          declaredSize: file.originalSize,
          compressedSize: file.size,
        });
        return false;
      },
    });
    return entries;
  }

  read(archive: ArrayBuffer): Record<string, Uint8Array> {
    return unzipSync(new Uint8Array(archive));
  }
}

export function readB2ConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): BackblazeB2Config | undefined {
  const { B2_ENDPOINT, B2_REGION, B2_BUCKET_NAME, B2_KEY_ID, B2_APPLICATION_KEY } = env;
  if (!B2_ENDPOINT || !B2_REGION || !B2_BUCKET_NAME || !B2_KEY_ID || !B2_APPLICATION_KEY) {
    return undefined;
  }
  return {
    endpoint: B2_ENDPOINT,
    region: B2_REGION,
    bucket: B2_BUCKET_NAME,
    keyId: B2_KEY_ID,
    applicationKey: B2_APPLICATION_KEY,
  };
}

/** Sorted by entry.name at every level — fs.readdirSync's own order is filesystem-dependent (not
 * guaranteed stable across machines or even repeated runs on the same machine), and this
 * generator's traversal order is what determines the order files are inserted into buildAndZip's
 * `files` object below. zipFilesDeterministically sorts again immediately before zipping (the
 * property that actually matters — see its own doc comment), so this sort is defense in depth,
 * not the sole guarantee, but it keeps the traversal itself predictable too. */
function* walk(dir: string): Generator<string> {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** ZIP/DOS date format's own epoch floor — zipSync's header writer rejects a file whose
 * `getFullYear() - 1980` is negative (see fflate's wzh()), so 1980-01-01 is the standard "no real
 * timestamp" choice for a reproducible zip. Used as every entry's fixed mtime: fflate defaults an
 * unset one to `Date.now()`, which would otherwise make the exact same dist/ bytes produce a
 * different ZIP — and therefore a different sha256 `version` (see publishAllMigratedGames) — on
 * every single deploy, even when nothing about the game actually changed. */
const ZIP_DETERMINISTIC_MTIME = new Date(Date.UTC(1980, 0, 1));

/**
 * Zips `files` with a fixed entry order (sorted by path, independent of whatever order the caller
 * happened to build the object in) and a fixed mtime on every entry, so the exact same input bytes
 * always produce the exact same ZIP bytes byte-for-byte — and therefore the exact same sha256
 * `version` — regardless of filesystem directory-listing order or wall-clock time. See
 * publish-official-game-bundles.test.ts for the two properties this exists to guarantee: identical
 * input -> identical output, and any single changed file -> a different hash.
 */
export function zipFilesDeterministically(files: Record<string, Uint8Array>): Uint8Array {
  const sortedEntries = Object.entries(files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const sorted: Record<string, Uint8Array> = {};
  for (const [filePath, bytes] of sortedEntries) {
    sorted[filePath] = bytes;
  }
  return zipSync(sorted, { mtime: ZIP_DETERMINISTIC_MTIME });
}

/** Builds one migrated game's standalone bundle, then zips its dist/ output into memory. Never
 * writes the zip to disk — the bytes only ever need to exist long enough to hash and publish. */
export function buildAndZip(game: MigratedGame, repoRoot: string): Uint8Array {
  console.log(`\n📦 Building ${game.slug} (${game.pkg})...`);
  execSync(`pnpm --filter ${game.pkg} build`, {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (!fs.existsSync(game.distDir)) {
    throw new Error(`${game.slug}: build did not produce ${game.distDir}`);
  }

  const files: Record<string, Uint8Array> = {};
  for (const filePath of walk(game.distDir)) {
    const rel = path.relative(game.distDir, filePath).split(path.sep).join("/");
    files[rel] = new Uint8Array(fs.readFileSync(filePath));
  }

  if (!files["index.html"]) {
    throw new Error(`${game.slug}: build output has no index.html at its root (${game.distDir})`);
  }

  return zipFilesDeterministically(files);
}

/** `Uint8Array.buffer` can be a view over a larger backing buffer — this normalizes to exactly
 * the bytes this array holds, the same slicing BackblazeB2GameBundleRepository.putObject does for
 * the same reason. */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Pure string-rendering half of the release map write — separated from the fs.writeFileSync call
 * in writeReleaseMap so this can be asserted on directly, with no filesystem involved. */
export function renderReleaseMapModule(releases: Record<string, ReleaseMapEntry>): string {
  const entries = Object.entries(releases)
    .map(
      ([slug, r]) =>
        `  ${JSON.stringify(slug)}: { version: ${JSON.stringify(r.version)}, entry: ${JSON.stringify(r.entry)} },`,
    )
    .join("\n");

  return `// AUTO-GENERATED FILE — see scripts/publish-official-game-bundles.ts. DO NOT EDIT BY HAND.
//
// Written by the production deploy workflow's "Publish Official Game Bundles" step, immediately
// before "Build Web Frontend" runs — see .github/workflows/deploy.yml. Overwrites this exact
// file's committed-empty default (systemGameReleaseMap.generated.ts's own doc comment explains
// why an empty default is checked into git). Never committed back — this is deploy-time state,
// not source.
export interface SystemGameRelease {
  /** The bundle's own sha256 content hash — also its \`/official-games/:slug/:version/\` path
   * segment (see scripts/publish-official-game-bundles.ts). */
  version: string;
  /** Entry HTML file inside the published bundle, relative to its version root. */
  entry: string;
}

export const SYSTEM_GAME_RELEASES: Readonly<Record<string, SystemGameRelease>> = {
${entries}
};
`;
}

export function writeReleaseMap(repoRoot: string, releases: Record<string, ReleaseMapEntry>): void {
  fs.writeFileSync(releaseMapPath(repoRoot), renderReleaseMapModule(releases), "utf-8");
}

/**
 * Builds, hashes, and publishes every migrated game, then writes the release map. `version` is the
 * sha256 of the FINAL ZIP BYTES this function itself produces from the build output — not a
 * version number a developer picks. Two consequences: (1) a re-run against unchanged source
 * produces the exact same version and simply finds it already published (idempotent, no wasted
 * upload — see the readManifest check below), and (2) there is never a "wrong" version to
 * accidentally publish, since the version IS the content.
 */
export async function publishAllMigratedGames(
  repoRoot: string,
  b2Config: BackblazeB2Config,
  observer?: OfficialBundlePreparedObserver,
): Promise<Record<string, ReleaseMapEntry>> {
  const storage = new BackblazeB2GameBundleRepository(b2Config);
  const publisher = new SystemGameBundlePublisher(storage, new FflateArchiveReader());
  const publishedAt = new Date().toISOString();

  const releases: Record<string, ReleaseMapEntry> = {};

  for (const game of migratedGames(repoRoot)) {
    const zipBytes = buildAndZip(game, repoRoot);
    const version = await sha256Hex(toArrayBuffer(zipBytes));
    // B-1 reuses this exact validation result for the generic B2 layout, whether the legacy
    // official path was newly published or already present from an earlier deploy.
    const prepared = observer ? publisher.prepare(toArrayBuffer(zipBytes)) : null;

    console.log(`🔎 ${game.slug}: checking whether ${version} is already published...`);
    const existing = await publisher.readManifest(game.slug, version);
    if (existing) {
      console.log(`✅ ${game.slug}@${version} already published — reusing it, no upload needed.`);
    } else {
      const bundle = prepared ?? publisher.prepare(toArrayBuffer(zipBytes));
      console.log(
        `⬆️  Publishing ${game.slug}@${version} (${bundle.files.length} files, ${bundle.totalSize} bytes)...`,
      );
      await publisher.publish({ slug: game.slug, version, prepared: bundle, publishedAt });
      console.log(`✅ Published official-games/${game.slug}/${version}/`);
    }

    if (observer) {
      await observer.onBundlePrepared({
        slug: game.slug,
        zipBytes,
        contentHash: version,
        // observer exists iff this was prepared above
        prepared: prepared as PreparedBundle,
        publishedAt,
      });
    }

    releases[game.slug] = { version, entry: "index.html" };
  }

  return releases;
}
