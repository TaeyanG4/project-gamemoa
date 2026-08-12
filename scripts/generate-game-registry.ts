import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { GameManifest } from "../packages/game-sdk/src/contracts/manifest.js";

interface GameEntry {
  dirName: string;
  packageName: string;
  manifest: GameManifest;
}

async function generateRegistry() {
  const rootDir = process.cwd();
  const gamesDir = path.join(rootDir, "games");

  if (!fs.existsSync(gamesDir)) {
    console.error("❌ games directory not found");
    process.exit(1);
  }

  const entries = fs.readdirSync(gamesDir, { withFileTypes: true });
  const gameDirs = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name);

  const gameEntries: GameEntry[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const seenPackages = new Set<string>();

  for (const gameName of gameDirs) {
    const pkgPath = path.join(gamesDir, gameName, "package.json");
    if (!fs.existsSync(pkgPath)) {
      console.error(`❌ Missing package.json in games/${gameName}`);
      process.exit(1);
    }

    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { name?: string };
    if (!pkgJson.name) {
      console.error(`❌ package.json in games/${gameName} is missing "name" field`);
      process.exit(1);
    }
    const packageName = pkgJson.name;

    const manifestPath = path.join(gamesDir, gameName, "src", "manifest.ts");
    if (!fs.existsSync(manifestPath)) {
      console.error(`❌ Missing src/manifest.ts in games/${gameName}`);
      process.exit(1);
    }

    try {
      const moduleUrl = pathToFileURL(manifestPath).href;
      const mod = (await import(moduleUrl)) as { manifest?: GameManifest };
      const manifest = mod.manifest;

      if (!manifest || typeof manifest !== "object") {
        console.error(`❌ games/${gameName}/src/manifest.ts must export 'const manifest'`);
        process.exit(1);
      }

      if (!manifest.id || !manifest.slug || !manifest.title) {
        console.error(`❌ Invalid manifest in games/${gameName}: id, slug, and title are required`);
        process.exit(1);
      }

      if (seenIds.has(manifest.id)) {
        console.error(`❌ Duplicate manifest id "${manifest.id}" found in games/${gameName}`);
        process.exit(1);
      }
      if (seenSlugs.has(manifest.slug)) {
        console.error(`❌ Duplicate manifest slug "${manifest.slug}" found in games/${gameName}`);
        process.exit(1);
      }
      if (seenPackages.has(packageName)) {
        console.error(`❌ Duplicate package name "${packageName}" found in games/${gameName}`);
        process.exit(1);
      }

      seenIds.add(manifest.id);
      seenSlugs.add(manifest.slug);
      seenPackages.add(packageName);

      gameEntries.push({
        dirName: gameName,
        packageName,
        manifest,
      });
    } catch (err) {
      console.error(`❌ Failed to import manifest for games/${gameName}:`, err);
      process.exit(1);
    }
  }

  const manifests = gameEntries.map((e) => e.manifest);

  // 1. Generate Core Manifest Registry
  const coreRegistryCode = `// AUTO-GENERATED FILE BY scripts/generate-game-registry.ts - DO NOT EDIT MANUALLY
import type { GameManifest } from "@gamemoa/game-sdk";

export const GAME_MANIFESTS: GameManifest[] = ${JSON.stringify(manifests, null, 2)};

export const GAME_MANIFEST_MAP: Record<string, GameManifest> = ${JSON.stringify(
    Object.fromEntries(manifests.map((m) => [m.id || m.slug, m])),
    null,
    2,
  )};

export function validateScoreByManifest(gameId: string, score: number): { valid: boolean; reason?: string } {
  if (typeof score !== "number" || Number.isNaN(score) || !Number.isInteger(score) || score < 0) {
    return { valid: false, reason: "점수는 0 이상의 정수이어야 합니다." };
  }

  const manifest = GAME_MANIFEST_MAP[gameId];
  if (!manifest || !manifest.scoreConfig) {
    if (score > 1000000) {
      return { valid: false, reason: "허용 범위를 초과한 점수입니다." };
    }
    return { valid: true };
  }

  const { min, max } = manifest.scoreConfig;
  if (score < min || score > max) {
    return { valid: false, reason: \`유효하지 않은 점수입니다 (\${min}~\${max}).\` };
  }

  return { valid: true };
}
`;

  const coreOutputPath = path.join(
    rootDir,
    "packages",
    "core",
    "src",
    "registry",
    "gameRegistry.generated.ts",
  );
  fs.mkdirSync(path.dirname(coreOutputPath), { recursive: true });
  fs.writeFileSync(coreOutputPath, coreRegistryCode, "utf-8");
  console.log(`✅ Generated Core Game Registry at ${coreOutputPath}`);

  // 2. Generate Web Loader Registry
  const loaderEntries = gameEntries
    .map((e) => `  "${e.manifest.slug}": () => import("${e.packageName}"),`)
    .join("\n");

  const webLoaderCode = `// AUTO-GENERATED FILE BY scripts/generate-game-registry.ts - DO NOT EDIT MANUALLY
import type { GameModule } from "@gamemoa/game-sdk";

export type GameLoader = () => Promise<{ default: GameModule } | GameModule>;

export const GAME_LOADERS: Record<string, GameLoader> = {
${loaderEntries}
};
`;

  const webOutputPath = path.join(
    rootDir,
    "apps",
    "web",
    "app",
    "features",
    "catalog",
    "gameLoaders.generated.ts",
  );
  fs.mkdirSync(path.dirname(webOutputPath), { recursive: true });
  fs.writeFileSync(webOutputPath, webLoaderCode, "utf-8");
  console.log(`✅ Generated Web Loader Registry at ${webOutputPath}`);
}

void generateRegistry();
