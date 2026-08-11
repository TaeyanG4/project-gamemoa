import type { GameModule } from "@gamemoa/game-sdk";
import { manifest } from "./manifest.js";
import { Game } from "./game.js";

const gameModule: GameModule = {
  manifest,
  Game,
};

export default gameModule;
export { manifest, Game };
