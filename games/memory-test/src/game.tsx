import type { GameProps } from "@owogg/game-sdk";
import { MemoryGameUI } from "./ui/MemoryGameUI.js";

export function Game({ runtime }: GameProps) {
  return <MemoryGameUI runtime={runtime} />;
}

export default Game;
