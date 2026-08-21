import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { E2E_PUBLIC_GAMES } from "./publicGameFixture.js";

/**
 * Builds the platform-only local game-origin fixture this E2E suite serves — no real game, no B2,
 * and no network. Every synthetic game shares the same static HTML (not a game, no gameplay, no
 * Game Bridge handshake, just enough to prove a document loaded and read its own viewport).
 * Presentation metadata is served by the central generic PublicGame API fixture in
 * `e2e/apiServer.ts`, so this preparer never mutates the production registry or release map.
 *
 * The only side effect is a git-ignored directory populated at the C-1 primary `/play/<slug>`
 * paths. The static server in `e2e/playwright.config.ts` serves those bytes on GAME_ORIGIN_PORT.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_GAME_ORIGIN_ROOT = path.join(here, ".local-game-origin");
const FIXTURE_DIR = path.join(here, "fixtures", "platform-test-game");

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
}

function main(): void {
  fs.rmSync(LOCAL_GAME_ORIGIN_ROOT, { recursive: true, force: true });
  for (const { slug } of E2E_PUBLIC_GAMES) {
    copyDirRecursive(FIXTURE_DIR, path.join(LOCAL_GAME_ORIGIN_ROOT, "play", slug));
  }

  console.log(`✅ Local E2E game origin ready: ${E2E_PUBLIC_GAMES.map((g) => g.slug).join(", ")}`);
}

try {
  main();
} catch (err: unknown) {
  console.error("❌ prepareLocalGameOrigin failed:", err);
  process.exit(1);
}
