import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import { zipSync, unzipSync } from "fflate";
import { prepareBundleFromArchive, sha256Hex } from "@owogg/core";
import type { BundleArchiveReader } from "@owogg/core";
import type { PreparedBundle } from "@owogg/core";
import type { BackblazeB2Config } from "@owogg/db";

/**
 * Build/validation input for generic OWOGG bootstrap, kept in its own
 * no-top-level-side-effects module — same split as scripts/registry-builder.ts vs.
 * scripts/generate-game-registry.ts — so its tests can import these functions without triggering
 * a real build/B2/D1 bootstrap as a side effect of import.
 *
 * The ZIP's sha256 is the generic version's content hash; a validation or consumer failure stops
 * the deploy before Web publication.
 */

export interface MigratedGame {
  slug: string;
  /** Workspace package name, for `pnpm --filter <pkg> build`. */
  pkg: string;
  /** Absolute path to the package's standalone build output (index.html + assets/*). */
  distDir: string;
}

/** Receives one exact deterministic ZIP/hash and validated file set for generic publication.
 * Throwing aborts the deploy before the Web build. */
export interface OfficialBundlePreparedConsumer {
  onBundlePrepared(input: {
    slug: string;
    zipBytes: Uint8Array;
    contentHash: string;
    prepared: PreparedBundle;
    publishedAt: string;
  }): Promise<void>;
}

/** Every OWOGG game built as a standalone Game Bridge bundle for generic bootstrap. */
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

/**
 * Local re-implementation of apps/api/src/infrastructure/games/FflateBundleArchiveReader.ts —
 * that class deliberately lives in the API app's own infrastructure layer, not @owogg/core. Same
 * fflate calls and metadata-first validation shape; the provider-neutral
 * prepareBundleFromArchive primitive performs the validation.
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
 * different ZIP — and therefore a different sha256 content hash — on
 * every single deploy, even when nothing about the game actually changed. */
const ZIP_DETERMINISTIC_MTIME = new Date(Date.UTC(1980, 0, 1));

/**
 * Zips `files` with a fixed entry order (sorted by path, independent of whatever order the caller
 * happened to build the object in) and a fixed mtime on every entry, so the exact same input bytes
 * always produce the exact same ZIP bytes byte-for-byte — and therefore the exact same sha256
 * content hash — regardless of filesystem directory-listing order or wall-clock time. See
 * official-game-bundle-builder.test.ts for the two properties this exists to guarantee: identical
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

/**
 * Builds, hashes, validates, and hands every OWOGG bundle to the generic bootstrap consumer.
 * The hash is over the final deterministic ZIP bytes, so unchanged input reuses the existing
 * generic numeric version and changed input allocates exactly one new version.
 */
export async function buildOfficialGameBundles(
  repoRoot: string,
  consumer: OfficialBundlePreparedConsumer,
): Promise<void> {
  const archives = new FflateArchiveReader();
  const publishedAt = new Date().toISOString();

  for (const game of migratedGames(repoRoot)) {
    const zipBytes = buildAndZip(game, repoRoot);
    const archive = toArrayBuffer(zipBytes);
    const contentHash = await sha256Hex(archive);
    const prepared: PreparedBundle = prepareBundleFromArchive(archives, archive);
    await consumer.onBundlePrepared({
      slug: game.slug,
      zipBytes,
      contentHash,
      prepared,
      publishedAt,
    });
    console.log(`✅ Generic OWOGG bootstrap converged ${game.slug}@${contentHash}`);
  }
}
