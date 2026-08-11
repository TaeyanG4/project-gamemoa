import type { ScoreStrategy } from "@gamemoa/game-sdk";

export const reactionTimeScoring: ScoreStrategy = {
  order: "lower-is-better",
  normalize(score: number): number {
    return -score; // Lower ms = better, so negate for normalized DESC sort
  },
  format(score: number): string {
    return `${Math.round(score)}ms`;
  },
};
