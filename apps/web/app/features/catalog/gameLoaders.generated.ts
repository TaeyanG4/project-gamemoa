// AUTO-GENERATED FILE BY scripts/generate-game-registry.ts - DO NOT EDIT MANUALLY
import type { GameModule } from "@gamemoa/game-sdk";

export type GameLoader = () => Promise<{ default: GameModule } | GameModule>;

export const GAME_LOADERS: Record<string, GameLoader> = {
  "aim-test": () => import("@gamemoa/game-aim-test"),
  "memory-test": () => import("@gamemoa/game-memory-test"),
  "reaction-time": () => import("@gamemoa/game-reaction-time"),
};
