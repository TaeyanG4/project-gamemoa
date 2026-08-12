import fs from "node:fs";
import path from "node:path";
import { buildRegistrySources } from "./registry-builder.js";

async function checkRegistry() {
  console.log("🔍 Checking Game Registry & Plugin Invariants (Pure In-Memory Verification)...");

  const rootDir = process.cwd();
  const coreFile = path.join(
    rootDir,
    "packages",
    "core",
    "src",
    "registry",
    "gameRegistry.generated.ts",
  );
  const webFile = path.join(
    rootDir,
    "apps",
    "web",
    "app",
    "features",
    "catalog",
    "gameLoaders.generated.ts",
  );

  const committedCoreContent = fs.existsSync(coreFile)
    ? fs.readFileSync(coreFile, "utf-8").replace(/\r\n/g, "\n")
    : "";
  const committedWebContent = fs.existsSync(webFile)
    ? fs.readFileSync(webFile, "utf-8").replace(/\r\n/g, "\n")
    : "";

  const { coreRegistryCode, webLoaderCode, gameEntries } = await buildRegistrySources(rootDir);

  const expectedCoreContent = coreRegistryCode.replace(/\r\n/g, "\n");
  const expectedWebContent = webLoaderCode.replace(/\r\n/g, "\n");

  let hasStale = false;

  if (committedCoreContent !== expectedCoreContent) {
    console.error(`❌ Core Game Registry is STALE! Path: ${coreFile}`);
    hasStale = true;
  }

  if (committedWebContent !== expectedWebContent) {
    console.error(`❌ Web Loader Registry is STALE! Path: ${webFile}`);
    hasStale = true;
  }

  if (hasStale) {
    console.error(
      "\n❌ Registry check failed! Please run 'pnpm generate:registry' locally and commit the generated files.\n",
    );
    process.exit(1);
  }

  // Verify full 3-set invariant matching: games/* package set == manifest set == web loader set
  const fsGameSlugs = gameEntries.map((e) => e.manifest.slug).sort();
  const loaderSlugs = Array.from(expectedWebContent.matchAll(/"([^"]+)":\s*\(\)\s*=>\s*import/g))
    .map((m) => m[1])
    .sort();

  if (JSON.stringify(fsGameSlugs) !== JSON.stringify(loaderSlugs)) {
    console.error(
      `\n❌ Invariant Mismatch! Filesystem game slugs !== Web loader registry slugs.\n`,
    );
    process.exit(1);
  }

  console.log(
    `✅ Verified Plugin Architecture Invariants: ${fsGameSlugs.length} games registered identically across filesystem, manifest registry, and web loaders.`,
  );
  console.log("✅ Game Registries are canonical and up to date! 0 Stale Registries Found.\n");
}

void checkRegistry();
