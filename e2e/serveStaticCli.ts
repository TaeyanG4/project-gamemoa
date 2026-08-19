import { startStaticServer } from "./staticServer.js";

/** Thin CLI wrapper so e2e/playwright.config.ts's `webServer` entries can each spawn one of these
 * as a plain subprocess with its own env, rather than needing Playwright to import and call
 * startStaticServer() in-process twice (which would tangle both servers' lifecycles together). */

const rootDir = process.env.E2E_STATIC_ROOT;
const port = Number(process.env.E2E_STATIC_PORT);
const spaFallback = process.env.E2E_STATIC_SPA_FALLBACK === "1";

if (!rootDir || !Number.isInteger(port)) {
  throw new Error("E2E_STATIC_ROOT and E2E_STATIC_PORT env vars are required");
}

startStaticServer({ rootDir, port, spaFallback })
  .then(() => {
    console.log(`static server listening on http://127.0.0.1:${port} (root: ${rootDir})`);
  })
  .catch((err: unknown) => {
    console.error("❌ static server failed to start:", err);
    process.exit(1);
  });
