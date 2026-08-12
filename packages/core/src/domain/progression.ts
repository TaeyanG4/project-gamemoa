// Pure domain rules for GAMEMOA progression (XP / Level).
//
// CRITICAL SEMANTIC RULE: XP != SKILL.
// Game score represents competitive performance and remains the sole ranking truth.
// XP represents platform activity/progression and must never influence game score,
// leaderboard ordering, or any competitive outcome.

/** XP granted for one accepted, authenticated, XP-eligible game completion. */
export const XP_PER_ACCEPTED_COMPLETION = 10;

/**
 * Maximum number of XP-eligible accepted completions counted per authenticated user,
 * per game, per UTC calendar day. Beyond this, the user may keep playing that game that
 * day, but no additional XP is granted. This is the entire v1 anti-farming policy —
 * centralized here so no other layer hardcodes the number.
 */
export const XP_DAILY_CAP_COMPLETIONS_PER_GAME = 10;

/** Ledger reason code used for the one XP source this sprint implements. */
export const XP_REASON_GAME_COMPLETION = "GAME_COMPLETION";

/** Base coefficient of the cumulative level curve: requiredXp(L) = LEVEL_XP_BASE * (L - 1)^2. */
export const LEVEL_XP_BASE = 100;

/**
 * Cumulative total XP required to reach `level` (1-indexed). Deterministic, pure,
 * and the single source of truth for level math — never increment a level counter
 * by hand anywhere else in the codebase.
 *
 * Level 1: 0 XP · Level 2: 100 XP · Level 3: 400 XP · Level 4: 900 XP · Level 5: 1,600 XP
 */
export function xpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return LEVEL_XP_BASE * (safeLevel - 1) * (safeLevel - 1);
}

/**
 * Derives the level for a given cumulative total XP using exact integer comparisons
 * (never floating-point sqrt alone) to avoid boundary drift at perfect-square XP values.
 */
export function levelForTotalXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));

  // Fast estimate, then correct by direct integer comparison against the real formula.
  let stepsAboveLevel1 = Math.floor(Math.sqrt(xp / LEVEL_XP_BASE));
  if (stepsAboveLevel1 < 0) stepsAboveLevel1 = 0;

  while (LEVEL_XP_BASE * (stepsAboveLevel1 + 1) * (stepsAboveLevel1 + 1) <= xp) {
    stepsAboveLevel1++;
  }
  while (stepsAboveLevel1 > 0 && LEVEL_XP_BASE * stepsAboveLevel1 * stepsAboveLevel1 > xp) {
    stepsAboveLevel1--;
  }

  return stepsAboveLevel1 + 1;
}

export interface ProgressionSummary {
  level: number;
  totalXp: number;
  currentLevelStartXp: number;
  nextLevelXp: number;
  currentLevelProgressXp: number;
  currentLevelSpanXp: number;
  progressPercent: number;
}

/** Builds the full derived progression view for a given cumulative total XP. */
export function getProgressionSummary(totalXp: number): ProgressionSummary {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = levelForTotalXp(xp);
  const currentLevelStartXp = xpRequiredForLevel(level);
  const nextLevelXp = xpRequiredForLevel(level + 1);
  const currentLevelSpanXp = nextLevelXp - currentLevelStartXp;
  const currentLevelProgressXp = xp - currentLevelStartXp;
  const progressPercent =
    currentLevelSpanXp > 0
      ? Math.min(100, Math.max(0, (currentLevelProgressXp / currentLevelSpanXp) * 100))
      : 100;

  return {
    level,
    totalXp: xp,
    currentLevelStartXp,
    nextLevelXp,
    currentLevelProgressXp,
    currentLevelSpanXp,
    progressPercent,
  };
}
