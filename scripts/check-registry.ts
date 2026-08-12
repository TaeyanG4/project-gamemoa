import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

console.log("🔍 Checking Game Registry & Plugin Invariants...");

const rootDir = process.cwd();
const gamesDir = path.join(rootDir, "games");
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

// 1. Verify filesystem game packages
const fsGameDirs = fs
  .readdirSync(gamesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name)
  .sort();

const initialCoreContent = fs.existsSync(coreFile) ? fs.readFileSync(coreFile, "utf-8") : "";
const initialWebContent = fs.existsSync(webFile) ? fs.readFileSync(webFile, "utf-8") : "";

// Re-run registry generator deterministically
execSync("pnpm exec tsx scripts/generate-game-registry.ts", { stdio: "inherit" });

const updatedCoreContent = fs.existsSync(coreFile) ? fs.readFileSync(coreFile, "utf-8") : "";
const updatedWebContent = fs.existsSync(webFile) ? fs.readFileSync(webFile, "utf-8") : "";

if (initialCoreContent !== updatedCoreContent || initialWebContent !== updatedWebContent) {
  console.error(
    "\n❌ Game Registries are STALE! Please run 'pnpm generate:registry' and commit the generated files.\n",
  );
  process.exit(1);
}

// 2. Verify Plugin Architecture Invariant: games/* package set == manifest set == web loader set
const loaderSlugs = Array.from(updatedWebContent.matchAll(/"([^"]+)":\s*\(\)\s*=>\s*import/g))
  .map((m) => m[1])
  .sort();

if (fsGameDirs.length !== loaderSlugs.length) {
  console.error(
    `\n❌ Game count mismatch! Filesystem games (${fsGameDirs.length}) !== Web Loader Registry (${loaderSlugs.length})\n`,
  );
  process.exit(1);
}

console.log(
  `✅ Verified Plugin Architecture Invariants: ${fsGameDirs.length} games registered identically across filesystem, manifest registry, and web loaders.`,
);
console.log("✅ Game Registries are up to date! 0 Stale Registries Found.\n");
