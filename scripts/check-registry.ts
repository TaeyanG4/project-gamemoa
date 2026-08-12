import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

console.log("🔍 Checking Game Registry Freshness...");

const rootDir = process.cwd();
const targetFile = path.join(rootDir, "packages", "core", "src", "registry", "gameRegistry.generated.ts");

const initialContent = fs.readFileSync(targetFile, "utf-8");

// Re-run registry generator
execSync("npx tsx scripts/generate-game-registry.ts", { stdio: "inherit" });

const updatedContent = fs.readFileSync(targetFile, "utf-8");

if (initialContent !== updatedContent) {
  console.error("\n❌ Game Registry is STALE! Please run 'pnpm generate:registry' and commit the result.\n");
  process.exit(1);
} else {
  console.log("✅ Game Registry is up to date! 0 Stale Manifests Found.\n");
}
