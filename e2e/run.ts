import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GAME_ORIGIN_URL, WEB_API_URL } from "./config.js";

/**
 * The one entry point (`pnpm e2e`) for the whole browser E2E suite: prepares purely local,
 * platform-only game bytes, rebuilds apps/web pointed at the local game origin and central local
 * generic API fixture, then runs Playwright against the result. Never touches production B2 or the
 * real deployed site.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..");

function run(command: string, extraEnv: Record<string, string> = {}): void {
  execSync(command, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
}

function main(): void {
  run("tsx e2e/prepareLocalGameOrigin.ts");

  console.log("\n🏗️  Rebuilding apps/web against the local E2E game origin...");
  run("pnpm --filter @owogg/web build", {
    VITE_GAME_ORIGIN: GAME_ORIGIN_URL,
    VITE_API_URL: WEB_API_URL,
  });

  console.log("\n🎭 Running Playwright...");
  run("playwright test --config=e2e/playwright.config.ts");
}

try {
  main();
  console.log("\n✅ e2e passed");
} catch (err: unknown) {
  console.error("\n❌ e2e failed:", err);
  process.exitCode = 1;
}
