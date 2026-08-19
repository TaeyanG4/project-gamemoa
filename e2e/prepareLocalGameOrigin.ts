import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256Hex } from "@owogg/core";
import {
  migratedGames,
  buildAndZip,
  toArrayBuffer,
  writeReleaseMap,
} from "../scripts/official-game-bundle-publisher.js";

/**
 * Builds the ONE SYSTEM game this E2E suite exercises (reaction-time — see this task's own
 * "대표 SYSTEM 게임 1개" scope) and makes it servable from a purely local fixture, without ever
 * touching B2 or any real network: reuses the exact same pure build/hash logic
 * scripts/official-game-bundle-publisher.ts uses for a real production publish (buildAndZip,
 * sha256Hex, writeReleaseMap) — never `publishAllMigratedGames`/`SystemGameBundlePublisher`/
 * `BackblazeB2GameBundleRepository`, which are the only pieces that actually need B2 credentials
 * or network access. Reusing the real hash-computation path (rather than inventing a fake
 * "e2e-test" version string) is deliberate: it's what proves this harness is exercising the same
 * `officialGameEntryUrl(slug, {version, entry})` construction production does, not a special case
 * carved out for tests.
 *
 * Two side effects, both git-ignored / restored — see e2e/run.ts, which calls this and then
 * restores systemGameReleaseMap.generated.ts via `git checkout` once the whole E2E run finishes:
 *   1. Copies the built games/reaction-time/standalone/dist/ files into
 *      e2e/.local-game-origin/official-games/reaction-time/<version>/ — what
 *      e2e/staticServer.ts serves on GAME_ORIGIN_PORT.
 *   2. Overwrites apps/web/app/features/game/runtime/systemGameReleaseMap.generated.ts with JUST
 *      this one game — the file production's own deploy-time publish step also overwrites (see
 *      that file's own doc comment); this is the same mechanism, run locally, pointed at a local
 *      fixture instead of B2. Every other SYSTEM game is deliberately left OUT of this map, so
 *      GameHost.tsx's resolveGameRuntimeKind resolves them to "legacy" here — this suite only
 *      asserts on reaction-time's iframe runtime, not a full migrated-fleet rebuild.
 */

const E2E_SLUG = "reaction-time";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..");
const LOCAL_GAME_ORIGIN_ROOT = path.join(here, ".local-game-origin");

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
}

async function main(): Promise<void> {
  const game = migratedGames(REPO_ROOT).find((g) => g.slug === E2E_SLUG);
  if (!game) {
    throw new Error(
      `"${E2E_SLUG}" is not in migratedGames() (scripts/official-game-bundle-publisher.ts) — nothing for this E2E fixture to build`,
    );
  }

  console.log(`📦 Building ${E2E_SLUG} for the local E2E game origin...`);
  const zipBytes = buildAndZip(game, REPO_ROOT); // also (re)builds games/reaction-time/standalone/dist
  const version = await sha256Hex(toArrayBuffer(zipBytes));

  fs.rmSync(LOCAL_GAME_ORIGIN_ROOT, { recursive: true, force: true });
  const versionDir = path.join(LOCAL_GAME_ORIGIN_ROOT, "official-games", E2E_SLUG, version);
  copyDirRecursive(game.distDir, versionDir);

  writeReleaseMap(REPO_ROOT, { [E2E_SLUG]: { version, entry: "index.html" } });

  console.log(`✅ Local E2E game origin ready: official-games/${E2E_SLUG}/${version}/`);
}

main().catch((err: unknown) => {
  console.error("❌ prepareLocalGameOrigin failed:", err);
  process.exit(1);
});
