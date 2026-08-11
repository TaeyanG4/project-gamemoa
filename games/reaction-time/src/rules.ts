export type RoundPhase = "waiting" | "ready" | "go" | "too-early" | "result";

export interface RoundState {
  readonly phase: RoundPhase;
  readonly startedAt: number | null;
  readonly greenAt: number | null;
  readonly clickedAt: number | null;
  readonly reactionTimeMs: number | null;
}

export const INITIAL_ROUND_STATE: RoundState = {
  phase: "waiting",
  startedAt: null,
  greenAt: null,
  clickedAt: null,
  reactionTimeMs: null,
};

export const MIN_DELAY_MS = 1000;
export const MAX_DELAY_MS = 5000;

export function generateDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

export function startRound(now: number): RoundState {
  return { ...INITIAL_ROUND_STATE, phase: "ready", startedAt: now };
}

export function showGreen(state: RoundState, now: number): RoundState {
  if (state.phase !== "ready") return state;
  return { ...state, phase: "go", greenAt: now };
}

export function handleClick(state: RoundState, now: number): RoundState {
  if (state.phase === "ready") {
    return { ...state, phase: "too-early", clickedAt: now };
  }
  if (state.phase === "go" && state.greenAt !== null) {
    const reactionTimeMs = now - state.greenAt;
    return { ...state, phase: "result", clickedAt: now, reactionTimeMs };
  }
  return state;
}

export function isValidReactionTime(ms: number): boolean {
  return ms > 0 && ms < 10000;
}

export const NUM_ROUNDS = 5;

export function calculateAverageReactionTime(times: readonly number[]): number {
  if (times.length === 0) return 0;
  const sum = times.reduce((a, b) => a + b, 0);
  return Math.round(sum / times.length);
}
