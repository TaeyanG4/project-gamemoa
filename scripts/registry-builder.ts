import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import prettier from "prettier";
import type { GameManifest } from "../packages/game-sdk/src/contracts/manifest.js";

export interface GameEntry {
  dirName: string;
  packageName: string;
  manifest: GameManifest;
}

export interface RegistryBuildResult {
  coreRegistryCode: string;
  webLoaderCode: string;
  gameEntries: GameEntry[];
}

export async function buildRegistrySources(rootDir = process.cwd()): Promise<RegistryBuildResult> {
  const gamesDir = path.join(rootDir, "games");

  if (!fs.existsSync(gamesDir)) {
    throw new Error("❌ games directory not found");
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
      throw new Error(`❌ Missing package.json in games/${gameName}`);
    }

    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { name?: string };
    if (!pkgJson.name) {
      throw new Error(`❌ package.json in games/${gameName} is missing "name" field`);
    }
    const packageName = pkgJson.name;

    const manifestPath = path.join(gamesDir, gameName, "src", "manifest.ts");
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`❌ Missing src/manifest.ts in games/${gameName}`);
    }

    try {
      const moduleUrl = pathToFileURL(manifestPath).href;
      const mod = (await import(moduleUrl)) as { manifest?: GameManifest };
      const manifest = mod.manifest;

      if (!manifest || typeof manifest !== "object") {
        throw new Error(`❌ games/${gameName}/src/manifest.ts must export 'const manifest'`);
      }

      if (!manifest.id || !manifest.slug || !manifest.title) {
        throw new Error(
          `❌ Invalid manifest in games/${gameName}: id, slug, and title are required`,
        );
      }

      if (seenIds.has(manifest.id)) {
        throw new Error(`❌ Duplicate manifest id "${manifest.id}" found in games/${gameName}`);
      }
      if (seenSlugs.has(manifest.slug)) {
        throw new Error(`❌ Duplicate manifest slug "${manifest.slug}" found in games/${gameName}`);
      }
      if (seenPackages.has(packageName)) {
        throw new Error(`❌ Duplicate package name "${packageName}" found in games/${gameName}`);
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
      if (err instanceof Error) throw err;
      throw new Error(`❌ Failed to import manifest for games/${gameName}: ${String(err)}`);
    }
  }

  // Sort game entries deterministically by slug
  gameEntries.sort((a, b) => a.manifest.slug.localeCompare(b.manifest.slug));

  const manifests = gameEntries.map((e) => e.manifest);

  // 1. Core Manifest Registry Raw Code
  const rawCoreRegistryCode = `// AUTO-GENERATED FILE BY scripts/generate-game-registry.ts - DO NOT EDIT MANUALLY
import type { GameManifest } from "@owogg/game-sdk";

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

  // 2. Web Loader Registry Raw Code
  const loaderEntries = gameEntries
    .map((e) => `  "${e.manifest.slug}": () => import("${e.packageName}"),`)
    .join("\n");

  const rawWebLoaderCode = `// AUTO-GENERATED FILE BY scripts/generate-game-registry.ts - DO NOT EDIT MANUALLY
import type { GameModule } from "@owogg/game-sdk";

export type GameLoader = () => Promise<{ default: GameModule } | GameModule>;

export const GAME_LOADERS: Record<string, GameLoader> = {
${loaderEntries}
};
`;

  const coreOutputPath = path.join(
    rootDir,
    "packages",
    "core",
    "src",
    "registry",
    "gameRegistry.generated.ts",
  );
  const webOutputPath = path.join(
    rootDir,
    "apps",
    "web",
    "app",
    "features",
    "catalog",
    "gameLoaders.generated.ts",
  );

  const coreConfig = (await prettier.resolveConfig(coreOutputPath)) || {};
  const webConfig = (await prettier.resolveConfig(webOutputPath)) || {};

  // Format canonically using Prettier with resolved config and filepath
  const coreRegistryCode = await prettier.format(rawCoreRegistryCode, {
    ...coreConfig,
    filepath: coreOutputPath,
    parser: "typescript",
  });

  const webLoaderCode = await prettier.format(rawWebLoaderCode, {
    ...webConfig,
    filepath: webOutputPath,
    parser: "typescript",
  });

  return {
    coreRegistryCode,
    webLoaderCode,
    gameEntries,
  };
}
