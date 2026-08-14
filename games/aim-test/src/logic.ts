export const TOTAL_TARGETS = 30;

/** Target diameter in px per difficulty tier — hard mode is a smaller target, same target
 * count and same elapsed-ms scoring, so the only thing that changes is precision required. */
const TARGET_SIZE_BY_DIFFICULTY: Record<string, number> = {
  normal: 44,
  hard: 28,
};

const DEFAULT_TARGET_SIZE_PX = 44;

export function getTargetSizePx(difficultyId: string): number {
  return TARGET_SIZE_BY_DIFFICULTY[difficultyId] ?? DEFAULT_TARGET_SIZE_PX;
}

export interface TargetPercentagePos {
  xPercent: number;
  yPercent: number;
}

export function generateRandomPercentagePos(): TargetPercentagePos {
  // Constrain targets within 12% to 88% of arena width/height
  const min = 12;
  const max = 88;
  const xPercent = Math.floor(Math.random() * (max - min)) + min;
  const yPercent = Math.floor(Math.random() * (max - min)) + min;
  return { xPercent, yPercent };
}

export function calculateAverageMs(totalMs: number, targetCount: number = TOTAL_TARGETS): number {
  if (targetCount <= 0) return 0;
  return Math.round(totalMs / targetCount);
}
