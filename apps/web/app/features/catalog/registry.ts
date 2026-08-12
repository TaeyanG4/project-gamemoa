import type { GameModule, GameManifest } from "@gamemoa/game-sdk";
import { GAME_MANIFESTS } from "@gamemoa/core";

type GameLoader = () => Promise<{ default: GameModule } | GameModule>;

export const gameRegistry: Record<string, GameLoader> = {
  "reaction-time": () => import("@gamemoa/game-reaction-time"),
  "memory-test": () => import("@gamemoa/game-memory-test"),
  "aim-test": () => import("@gamemoa/game-aim-test"),
};

export const gameManifests: GameManifest[] = GAME_MANIFESTS.filter(
  (m) => m.status === "published" || m.status === "beta"
);

export async function loadGame(slug: string): Promise<GameModule | null> {
  const loader = gameRegistry[slug];
  if (!loader) return null;
  const mod = await loader();
  return "default" in mod ? mod.default : (mod as unknown as GameModule);
}
