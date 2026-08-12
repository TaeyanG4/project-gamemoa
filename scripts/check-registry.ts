import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

console.log("🔍 Checking Game Registry Freshness...");

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
} else {
  console.log("✅ Game Registries are up to date! 0 Stale Registries Found.\n");
}
