import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import prettier from "prettier";
import { buildRegistrySources } from "./registry-builder.js";

test("buildRegistrySources produces canonical Prettier-formatted code deterministically", async () => {
  const rootDir = process.cwd();
  const corePath = path.join(
    rootDir,
    "packages",
    "core",
    "src",
    "registry",
    "gameRegistry.generated.ts",
  );
  const webPath = path.join(
    rootDir,
    "apps",
    "web",
    "app",
    "features",
    "catalog",
    "gameLoaders.generated.ts",
  );

  const result1 = await buildRegistrySources(rootDir);
  const result2 = await buildRegistrySources(rootDir);

  assert.equal(result1.coreRegistryCode, result2.coreRegistryCode);
  assert.equal(result1.webLoaderCode, result2.webLoaderCode);

  const coreConfig = (await prettier.resolveConfig(corePath)) || {};
  const webConfig = (await prettier.resolveConfig(webPath)) || {};

  const coreFormatted = await prettier.format(result1.coreRegistryCode, {
    ...coreConfig,
    filepath: corePath,
    parser: "typescript",
  });
  const webFormatted = await prettier.format(result1.webLoaderCode, {
    ...webConfig,
    filepath: webPath,
    parser: "typescript",
  });

  assert.equal(
    result1.coreRegistryCode.replace(/\r\n/g, "\n"),
    coreFormatted.replace(/\r\n/g, "\n"),
  );
  assert.equal(result1.webLoaderCode.replace(/\r\n/g, "\n"), webFormatted.replace(/\r\n/g, "\n"));
});

test("buildRegistrySources includes all filesystem games in deterministic slug order", async () => {
  const { gameEntries } = await buildRegistrySources();
  assert.ok(gameEntries.length >= 3);

  const slugs = gameEntries.map((e) => e.manifest.slug);
  const sortedSlugs = [...slugs].sort();
  assert.deepEqual(slugs, sortedSlugs);
});
