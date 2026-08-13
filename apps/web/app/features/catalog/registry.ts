import type { GameModule, GameManifest } from "@owogg/game-sdk";
import { GAME_MANIFESTS } from "@owogg/core";
import { GAME_LOADERS } from "./gameLoaders.generated.js";

export const gameRegistry = GAME_LOADERS;

export const gameManifests: GameManifest[] = GAME_MANIFESTS.filter(
  (m) => m.status === "published" || m.status === "beta",
);

export async function loadGame(slug: string): Promise<GameModule | null> {
  const loader = gameRegistry[slug];
  if (!loader) return null;
  const mod = await loader();
  return "default" in mod ? mod.default : (mod as unknown as GameModule);
}
