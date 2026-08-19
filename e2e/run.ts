import { execSync, execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GAME_ORIGIN_URL, WEB_API_URL } from "./config.js";

/**
 * The one entry point (`pnpm e2e`) for the whole browser E2E suite: prepares a purely local,
 * synthetic fixture (two platform-only games, e2e-responsive/e2e-fixed — see
 * prepareLocalGameOrigin.ts's own doc comment for why this suite doesn't depend on any real
 * SYSTEM game), rebuilds apps/web pointed at that local fixture instead of production's
 * play.owogg.com/B2, then runs Playwright against the result. Never touches production B2 or the
 * real deployed site.
 *
 * Wrapped in try/finally specifically so every tracked file prepareLocalGameOrigin.ts temporarily
 * overwrites — systemGameReleaseMap.generated.ts and packages/core/src/registry/
 * gameRegistry.generated.ts — always gets restored to whatever HEAD has, even if the build or the
 * tests themselves fail. Both are checked in as the real thing (an empty release map; the real
 * game registry) and have no legitimate reason to ever hold this suite's own local edit — see
 * their own doc comments — so unconditionally restoring both here is safe.
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
const CORE_REGISTRY_PATH = path.join(
  REPO_ROOT,
  "packages",
  "core",
  "src",
  "registry",
  "gameRegistry.generated.ts",
);
const TRACKED_FILES_TOUCHED_BY_THIS_SUITE = [RELEASE_MAP_PATH, CORE_REGISTRY_PATH];

function run(command: string, extraEnv: Record<string, string> = {}): void {
  execSync(command, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
}

/**
 * Fail-closed: a failure here must fail the whole `pnpm e2e` run, even when everything before it
 * (build, Playwright) passed. Leaving a real local edit sitting in either generated file this
 * suite temporarily overwrites is exactly the kind of thing this restore step exists to prevent.
 * Setting `process.exitCode` (rather than throwing from inside a `.finally()` callback, which
 * would surface as an unhandled rejection instead of a clear message) is what makes this failure
 * visible and deterministic regardless of Node's own unhandled-rejection behavior.
 *
 * Checking out the known files is the primary restore; the `git status` check afterward is the
 * actual guarantee — it verifies THOSE SAME FILES really did end up clean, not just that the
 * `checkout` command itself didn't error. Deliberately scoped to
 * TRACKED_FILES_TOUCHED_BY_THIS_SUITE specifically (`git status -- <paths>`), not the whole
 * repo: a repo-wide check would also flag a developer's own unrelated uncommitted work as an
 * "E2E left the repo dirty" failure, which is a real difference between running this locally
 * mid-edit and running it in CI's always-clean checkout.
 */
function restoreTrackedFiles(): void {
  try {
    execFileSync("git", ["checkout", "--", ...TRACKED_FILES_TOUCHED_BY_THIS_SUITE], {
      cwd: REPO_ROOT,
      stdio: "inherit",
    });
  } catch (err) {
    console.error("❌ Failed to restore E2E-touched tracked files:", err);
    process.exitCode = 1;
    return;
  }

  const status = execFileSync(
    "git",
    ["status", "--porcelain", "--", ...TRACKED_FILES_TOUCHED_BY_THIS_SUITE],
    { cwd: REPO_ROOT, encoding: "utf-8" },
  );
  if (status.trim().length > 0) {
    console.error(`❌ E2E left tracked files modified after restore:\n${status}`);
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
  .finally(restoreTrackedFiles);
