import type { GameProps } from "@gamemoa/game-sdk";
import { MemoryGameUI } from "./ui/MemoryGameUI.js";

export function Game(_props: GameProps) {
  return <MemoryGameUI />;
}
