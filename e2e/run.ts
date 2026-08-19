import { execSync, execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GAME_ORIGIN_URL, WEB_API_URL } from "./config.js";

/**
 * The one entry point (`pnpm e2e`) for the whole browser E2E suite: prepares a purely local
 * fixture for the one SYSTEM game this suite exercises (reaction-time — see
 * prepareLocalGameOrigin.ts), rebuilds apps/web pointed at that local fixture instead of
 * production's play.owogg.com/B2, then runs Playwright against the result. Never touches
 * production B2 or the real deployed site — see prepareLocalGameOrigin.ts's own doc comment for
 * how the local fixture is built without either.
 *
 * Wrapped in try/finally specifically so systemGameReleaseMap.generated.ts — overwritten by
 * prepareLocalGameOrigin.ts the same way production's own deploy-time publish step overwrites it
 * — always gets restored to whatever HEAD has, even if the build or the tests themselves fail.
 * That file is checked in EMPTY and has no legitimate reason to ever hold a hand/local edit (see
 * its own doc comment), so unconditionally restoring it here is safe.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..");
const RELEASE_MAP_PATH = path.join(
  REPO_ROOT,
  "apps",
  "web",
  "app",
  "features",
  "game",
  "runtime",
  "systemGameReleaseMap.generated.ts",
);

function run(command: string, extraEnv: Record<string, string> = {}): void {
  execSync(command, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
}

/**
 * Fail-closed: a failure here must fail the whole `pnpm e2e` run, even when everything before it
 * (build, Playwright) passed. Leaving a real local edit sitting in
 * systemGameReleaseMap.generated.ts silently is exactly the kind of thing this restore step
 * exists to prevent — see this file's own top doc comment on why the file has no legitimate
 * reason to ever hold one. Setting `process.exitCode` (rather than throwing from inside a
 * `.finally()` callback, which would surface as an unhandled rejection instead of a clear message)
 * is what makes this failure visible and deterministic regardless of Node's own unhandled-
 * rejection behavior.
 */
function restoreReleaseMap(): void {
  try {
    execFileSync("git", ["checkout", "--", RELEASE_MAP_PATH], {
      cwd: REPO_ROOT,
      stdio: "inherit",
    });
  } catch (err) {
    console.error("❌ Failed to restore systemGameReleaseMap.generated.ts:", err);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  run("tsx e2e/prepareLocalGameOrigin.ts");

  console.log("\n🏗️  Rebuilding apps/web against the local E2E game origin...");
  run("pnpm --filter @owogg/web build", {
    VITE_GAME_ORIGIN: GAME_ORIGIN_URL,
    VITE_API_URL: WEB_API_URL,
  });

  console.log("\n🎭 Running Playwright...");
  run("playwright test --config=e2e/playwright.config.ts");
}

main()
  .then(() => {
    console.log("\n✅ e2e passed");
  })
  .catch((err: unknown) => {
    console.error("\n❌ e2e failed:", err);
    process.exitCode = 1;
  })
  .finally(restoreReleaseMap);
