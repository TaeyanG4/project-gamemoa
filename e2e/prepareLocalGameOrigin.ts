import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256Hex, GAME_MANIFESTS } from "@owogg/core";
import type { GameManifest } from "../packages/game-sdk/src/contracts/manifest.js";
import type { GamePresentation } from "../packages/game-sdk/src/contracts/presentation.js";
import { writeReleaseMap } from "../scripts/official-game-bundle-publisher.js";
import { renderCoreRegistryModule } from "../scripts/registry-builder.js";

/**
 * Builds the platform-only local fixture this E2E suite serves games from — no real SYSTEM game,
 * no B2, no network. Two synthetic, catalog-only games (e2e-responsive, e2e-fixed) share the
 * exact same static HTML (e2e/fixtures/platform-test-game/index.html — not a game, no gameplay,
 * no Game Bridge handshake, just enough to prove a document loaded and read its own viewport; see
 * that file's own doc comment), differing only in the GamePresentation each is registered with.
 * This is deliberately NOT reaction-time or any other real game: this suite exists to verify
 * platform behavior (iframe security, Presentation's responsive/fixed viewport math in a real
 * browser), not any particular game's content, and a real game's manifest must never carry a
 * synthetic presentation value just to make a test possible (see docs/PR notes).
 *
 * Three side effects, all git-ignored or restored — see e2e/run.ts, which calls this and then
 * restores every touched tracked file via `git checkout` (verified with a `git status` check)
 * once the whole E2E run finishes:
 *   1. Copies e2e/fixtures/platform-test-game/ into
 *      e2e/.local-game-origin/official-games/<slug>/<version>/ for both slugs — what
 *      e2e/staticServer.ts serves on GAME_ORIGIN_PORT.
 *   2. Overwrites apps/web/app/features/game/runtime/systemGameReleaseMap.generated.ts with just
 *      these two slugs — same mechanism production's own deploy-time publish step uses (see that
 *      file's own doc comment), run locally against a local fixture.
 *   3. Overwrites packages/core/src/registry/gameRegistry.generated.ts with the real, current
 *      GAME_MANIFESTS (read before this function touches anything) plus the two synthetic
 *      manifests appended — rendered through registry-builder.ts's own
 *      renderCoreRegistryModule, the exact same codegen `pnpm generate:registry` uses for the
 *      real registry, not a hand-copied second template. This is what makes GameHost resolve
 *      each synthetic slug as a SYSTEM game with a real `presentation` value, through the same
 *      `gameManifests` catalog every real game goes through — no test-only runtime branch
 *      anywhere in application code.
 */

const E2E_RESPONSIVE_SLUG = "e2e-responsive";
const E2E_FIXED_SLUG = "e2e-fixed";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..");
const LOCAL_GAME_ORIGIN_ROOT = path.join(here, ".local-game-origin");
const FIXTURE_DIR = path.join(here, "fixtures", "platform-test-game");
const CORE_REGISTRY_PATH = path.join(
  REPO_ROOT,
  "packages",
  "core",
  "src",
  "registry",
  "gameRegistry.generated.ts",
);

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
}

/** Every field a real catalog entry needs, none of it exercised by these tests — see this file's
 * own top doc comment for what the fixture itself does and doesn't do. Unscored
 * (`supportsLeaderboard: false`, no `scoreConfig`) on purpose: this suite never asserts score
 * correctness. */
function syntheticManifest(slug: string, presentation: GamePresentation): GameManifest {
  return {
    id: slug,
    slug,
    title: `Platform E2E fixture (${slug})`,
    shortDescription: "Platform E2E fixture — not a real game.",
    description:
      "A synthetic, platform-only fixture used by the Browser E2E suite to verify iframe " +
      "security invariants and GamePresentation viewport behavior in a real browser. Never " +
      "shown in any real catalog — see e2e/prepareLocalGameOrigin.ts.",
    modes: ["single"],
    status: "published",
    categories: [],
    tags: [],
    minPlayers: 1,
    maxPlayers: 1,
    thumbnail: "/favicon.svg",
    requiresAuth: false,
    supportsLeaderboard: false,
    inputMethods: ["mouse"],
    supportsReplay: false,
    version: "0.0.0-e2e",
    presentation,
  };
}

/** Requests a design resolution well beyond the ~390px-wide viewport presentation.spec.ts drives
 * this through — the whole point is proving the platform, not the game, has the final say. */
const RESPONSIVE_PRESENTATION: GamePresentation = {
  viewport: { mode: "responsive", preferredWidth: 800, minWidth: 600 },
  fullscreen: { supported: false },
  mobile: { support: "supported" },
};

/** 1280x720 (16:9) — a plain, real design resolution, tested from an available box much smaller
 * than that in both dimensions (see presentation.spec.ts). */
const FIXED_PRESENTATION: GamePresentation = {
  viewport: { mode: "fixed", preferredWidth: 1280, preferredHeight: 720 },
  fullscreen: { supported: false },
  mobile: { support: "unsupported" },
};

async function main(): Promise<void> {
  // Read the real registry BEFORE gameRegistry.generated.ts gets overwritten below — GAME_MANIFESTS
  // was already resolved at this module's import time, so this is safe regardless of ordering.
  const realManifests = GAME_MANIFESTS;

  const fixtureBytes = fs.readFileSync(path.join(FIXTURE_DIR, "index.html"));
  const version = await sha256Hex(
    fixtureBytes.buffer.slice(
      fixtureBytes.byteOffset,
      fixtureBytes.byteOffset + fixtureBytes.byteLength,
    ) as ArrayBuffer,
  );

  fs.rmSync(LOCAL_GAME_ORIGIN_ROOT, { recursive: true, force: true });
  for (const slug of [E2E_RESPONSIVE_SLUG, E2E_FIXED_SLUG]) {
    const versionDir = path.join(LOCAL_GAME_ORIGIN_ROOT, "official-games", slug, version);
    copyDirRecursive(FIXTURE_DIR, versionDir);
  }

  writeReleaseMap(REPO_ROOT, {
    [E2E_RESPONSIVE_SLUG]: { version, entry: "index.html" },
    [E2E_FIXED_SLUG]: { version, entry: "index.html" },
  });

  const syntheticManifests = [
    syntheticManifest(E2E_RESPONSIVE_SLUG, RESPONSIVE_PRESENTATION),
    syntheticManifest(E2E_FIXED_SLUG, FIXED_PRESENTATION),
  ];
  fs.writeFileSync(
    CORE_REGISTRY_PATH,
    renderCoreRegistryModule([...realManifests, ...syntheticManifests]),
    "utf-8",
  );

  console.log(
    `✅ Local E2E game origin ready: ${E2E_RESPONSIVE_SLUG} and ${E2E_FIXED_SLUG} @ ${version}`,
  );
}

main().catch((err: unknown) => {
  console.error("❌ prepareLocalGameOrigin failed:", err);
  process.exit(1);
});
