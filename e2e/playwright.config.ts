import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { GAME_ORIGIN_PORT, WEB_SPA_PORT, WEB_BASE_URL } from "./config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..");

const GAME_ORIGIN_ROOT = path.join(here, ".local-game-origin");
const WEB_BUILD_ROOT = path.join(REPO_ROOT, "apps", "web", "build", "client");

/**
 * Chromium only — this suite checks DOM-level invariants (iframe sandbox/src/height), not
 * cross-browser rendering quirks, so one engine is enough for what it's actually testing. Both
 * static servers are started here (via `webServer`, Playwright's own "wait for it to be ready,
 * tear it down after") rather than in e2e/run.ts — run.ts's job ends at "produce a built
 * apps/web/build/client and a populated e2e/.local-game-origin/", both of which must already
 * exist on disk before either server here has anything to serve.
 *
 * `channel: "chrome"` on the one project below runs against the OS-installed Google Chrome
 * (GitHub's ubuntu-24.04 runner image ships it preinstalled; a local dev machine needs a system
 * Chrome install too) instead of Playwright's own managed Chromium build. That's what lets CI
 * skip `playwright install` entirely — the actual bottleneck was never the test run, it was that
 * install step stalling on the runner's apt mirror while downloading Chromium's OS-level deps.
 * Same "one engine, DOM invariants only" reasoning as above still applies; this only changes
 * which Chrome binary runs the same test.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // No retries, anywhere: this suite runs against a purely local, deterministic fixture (see
  // e2e/prepareLocalGameOrigin.ts) — nothing here has the kind of transient, environment-driven
  // flakiness a retry is meant to paper over. A failure retried into a pass would hide a real
  // regression instead of catching it.
  retries: 0,
  reporter: [["list"]],
  // Co-located under e2e/ (not the default, repo-root-relative `test-results/`) so every artifact
  // this harness produces lives in one gitignored place — see e2e/.local-game-origin's own doc
  // comment for the same reasoning applied to the other generated directory here.
  outputDir: path.join(here, "test-results"),
  use: {
    baseURL: WEB_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: [
    {
      command: "tsx e2e/serveStaticCli.ts",
      port: GAME_ORIGIN_PORT,
      cwd: REPO_ROOT,
      reuseExistingServer: false,
      env: {
        E2E_STATIC_ROOT: GAME_ORIGIN_ROOT,
        E2E_STATIC_PORT: String(GAME_ORIGIN_PORT),
      },
    },
    {
      command: "tsx e2e/serveStaticCli.ts",
      port: WEB_SPA_PORT,
      cwd: REPO_ROOT,
      reuseExistingServer: false,
      env: {
        E2E_STATIC_ROOT: WEB_BUILD_ROOT,
        E2E_STATIC_PORT: String(WEB_SPA_PORT),
        E2E_STATIC_SPA_FALLBACK: "1",
      },
    },
  ],
});
