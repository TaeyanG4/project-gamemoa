// AUTO-GENERATED FILE BY scripts/generate-game-registry.ts - DO NOT EDIT MANUALLY
import type { GameModule } from "@owogg/game-sdk";

export type GameLoader = () => Promise<{ default: GameModule } | GameModule>;

export const GAME_LOADERS: Record<string, GameLoader> = {
  "aim-test": () => import("@owogg/game-aim-test"),
  "memory-test": () => import("@owogg/game-memory-test"),
  "reaction-time": () => import("@owogg/game-reaction-time"),
  "typing-test": () => import("@owogg/game-typing-test"),
};
