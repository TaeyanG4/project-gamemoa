import type { GameModule } from "@owogg/game-sdk";
import { memoryTestManifest } from "./manifest.js";
import { Game } from "./game.js";

const gameModule: GameModule = {
  manifest: memoryTestManifest,
  Game,
};

export default gameModule;
export { memoryTestManifest, memoryTestManifest as manifest, Game };
export * from "./engine/memoryEngine.js";
export * from "./ui/MemoryGameUI.js";
