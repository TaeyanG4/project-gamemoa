import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

/**
 * Verifies the actual standalone build artifact — not just that `vite build` exits 0, but that the
 * output is genuinely servable from the nested immutable generic path
 * (`/games/<gameId>/<versionId>/...`, see gameServing.ts). Runs vite's own JS build API directly
 * (rather than shelling out to `pnpm build`) so this test has no dependency
 * on turbo's task ordering — `test` does not depend on this package's own `build` task (see
 * turbo.json: `test`'s `dependsOn` is only `^build`, upstream packages), so `standalone/dist/`
 * cannot be assumed to already exist when this suite runs.
 */

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(packageRoot, "standalone", "dist");

test("standalone build produces a relative-path index.html plus JS/CSS bundle assets", async () => {
  await build({
    configFile: path.join(packageRoot, "standalone", "vite.config.ts"),
    logLevel: "silent",
  });

  const indexHtml = fs.readFileSync(path.join(distDir, "index.html"), "utf-8");
  assert.ok(indexHtml.includes('<div id="root">'), "missing #root mount point");

  const scriptSrcs = [...indexHtml.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  const linkHrefs = [...indexHtml.matchAll(/<link[^>]*\shref="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(scriptSrcs.length > 0, "no <script src> found in built index.html");
  assert.ok(linkHrefs.length > 0, "no <link href> found in built index.html");

  // Relative, not absolute — this bundle is served from /games/<gameId>/<versionId>/..., never the
  // origin root, and the numeric IDs are only known at publication/live resolution time (see
  // standalone/vite.config.ts's own doc comment on `base: "./"`). An absolute `/assets/...`
  // reference would 404 in production: the browser would request it against the server ROOT
  // instead of the version-specific directory it actually lives in.
  for (const src of [...scriptSrcs, ...linkHrefs]) {
    assert.ok(src, "regex capture group unexpectedly empty");
    assert.ok(src.startsWith("./"), `expected a relative asset path, got "${src}"`);
  }

  const assetFiles = fs.readdirSync(path.join(distDir, "assets"));
  assert.ok(
    assetFiles.some((f) => f.endsWith(".js")),
    "no built JS bundle under dist/assets",
  );
  assert.ok(
    assetFiles.some((f) => f.endsWith(".css")),
    "no built CSS bundle under dist/assets",
  );
});
