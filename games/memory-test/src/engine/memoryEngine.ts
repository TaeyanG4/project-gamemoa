export type MemoryColor = "red" | "green" | "blue" | "yellow";

export const MEMORY_COLORS: readonly MemoryColor[] = ["red", "green", "blue", "yellow"];

export function generateNextColor(colors: readonly MemoryColor[] = MEMORY_COLORS): MemoryColor {
  const index = Math.floor(Math.random() * colors.length);
  return colors[index] || "red";
}

export function evaluateGrade(level: number): "S" | "A" | "B" | "C" | "F" {
  if (level >= 12) return "S";
  if (level >= 9) return "A";
  if (level >= 6) return "B";
  if (level >= 3) return "C";
  return "F";
}

export interface MemoryGameState {
  status: "idle" | "showing" | "user-turn" | "game-over";
  sequence: MemoryColor[];
  userIndex: number;
  level: number;
  bestLevel: number;
}

export function createInitialState(): MemoryGameState {
  return {
    status: "idle",
    sequence: [],
    userIndex: 0,
    level: 0,
    bestLevel: 0,
  };
}
