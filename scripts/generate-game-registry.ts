import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function generateRegistry() {
  const rootDir = process.cwd();
  const gamesDir = path.join(rootDir, "games");

  if (!fs.existsSync(gamesDir)) {
    console.error("games directory not found");
    return;
  }

  const entries = fs.readdirSync(gamesDir, { withFileTypes: true });
  const gameDirs = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name);

  const manifests: any[] = [];

  for (const gameName of gameDirs) {
    const manifestPath = path.join(gamesDir, gameName, "src", "manifest.ts");
    if (fs.existsSync(manifestPath)) {
      try {
        const moduleUrl = pathToFileURL(manifestPath).href;
        const mod = await import(moduleUrl);
        const manifest = mod.manifest || mod.memoryTestManifest;
        if (manifest) {
          manifests.push(manifest);
        }
      } catch (err) {
        console.warn(`Could not import manifest for ${gameName}:`, err);
      }
    }
  }

  const generatedCode = `// AUTO-GENERATED FILE BY scripts/generate-game-registry.ts - DO NOT EDIT MANUALLY
import type { GameManifest } from "@gamemoa/game-sdk";

export const GAME_MANIFESTS: GameManifest[] = ${JSON.stringify(manifests, null, 2)};

export const GAME_MANIFEST_MAP: Record<string, GameManifest> = ${JSON.stringify(
    Object.fromEntries(manifests.map((m) => [m.id || m.slug, m])),
    null,
    2
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

  const outputPath = path.join(rootDir, "packages", "core", "src", "registry", "gameRegistry.generated.ts");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, generatedCode, "utf-8");
  console.log(`Successfully generated game registry at ${outputPath}`);
}

generateRegistry();
