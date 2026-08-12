export const TOTAL_TARGETS = 30;
export const TARGET_SIZE_PX = 44;

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
