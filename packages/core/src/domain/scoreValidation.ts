/**
 * Pure score/difficulty validation — GamePolicy-in, verdict-out. No registry lookup happens here;
 * a caller (ScoreUseCases) resolves `gameId` to a `GameDefinition` through the injected
 * `GameRegistry` port and passes the pieces this file actually needs.
 *
 * This file used to do its own lookup, importing `GAME_MANIFEST_MAP` directly from the generated
 * build-time registry (see git history). That coupled score validation to exactly one registry
 * implementation and made it impossible to test without the real generated file. The generated
 * registry itself is untouched and still exported from `@owogg/core` as `validateScoreByManifest` —
 * this file simply no longer wraps it.
 */

import type { GameDifficulty, GamePolicy } from "../modules/game/domain/gameDefinition.js";

/**
 * `policy` is `null` for "no such game" (the registry had nothing for this slug) — kept distinct
 * from a real `GamePolicy` whose `score` field is `null` ("this game exists and is deliberately
 * unscored"). Only the former is rejected as "지원하지 않는 게임입니다."; the latter passes with no
 * bounds to check, matching how a game with no `scoreConfig` always has behaved.
 */
export function validateScoreAgainstPolicy(
  policy: GamePolicy | null,
  score: number,
): { valid: boolean; reason?: string } {
  if (typeof score !== "number" || Number.isNaN(score) || !Number.isInteger(score) || score < 0) {
    return { valid: false, reason: "점수는 0 이상의 정수이어야 합니다." };
  }

  if (!policy) {
    // Deliberately not an "accept anything under a million" fallback (2026-08-17 beta hardening,
    // preserved through this refactor) — an unrecognized game id gets no bounds check at all
    // otherwise, and sandbox games are never in this registry yet. See
    // docs/GAME_CREATION_GUIDE.md §3.5.
    return { valid: false, reason: "지원하지 않는 게임입니다." };
  }
  if (!policy.score) {
    return { valid: true };
  }

  const { min, max } = policy.score;
  if (score < min || score > max) {
    return { valid: false, reason: `유효하지 않은 점수입니다 (${min}~${max}).` };
  }

  return { valid: true };
}

export interface DifficultyValidationResult {
  valid: boolean;
  reason?: string;
  /** Always populated even when invalid, so callers have a safe fallback ("normal", or the
   * game's own declared default) rather than needing to branch on undefined. */
  normalizedDifficultyId: string;
}

/**
 * Validates a submitted difficulty id against a game's difficulty config. `undefined` means
 * "single difficulty, no selector" — the same thing an unknown game id resolves to, since there is
 * nothing to validate against either way; only "normal" is ever accepted in that case, matching
 * every game before difficulty tiers existed.
 */
export function validateDifficultyAgainstDefinition(
  difficulty: GameDifficulty | undefined,
  rawDifficultyId: string | undefined,
): DifficultyValidationResult {
  const difficultyId = rawDifficultyId?.trim();

  if (!difficulty) {
    if (!difficultyId || difficultyId === "normal") {
      return { valid: true, normalizedDifficultyId: "normal" };
    }
    return {
      valid: false,
      reason: "이 게임은 난이도를 지원하지 않습니다.",
      normalizedDifficultyId: "normal",
    };
  }

  const { levels, defaultLevelId } = difficulty;
  if (!difficultyId) {
    return { valid: true, normalizedDifficultyId: defaultLevelId };
  }
  if (!levels.some((level) => level.id === difficultyId)) {
    return {
      valid: false,
      reason: "유효하지 않은 난이도입니다.",
      normalizedDifficultyId: defaultLevelId,
    };
  }
  return { valid: true, normalizedDifficultyId: difficultyId };
}
