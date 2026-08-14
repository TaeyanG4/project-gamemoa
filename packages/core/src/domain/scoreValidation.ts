import { GAME_MANIFEST_MAP, validateScoreByManifest } from "../registry/gameRegistry.generated.js";

export function validateScorePayload(
  gameId: string,
  score: number,
): { valid: boolean; reason?: string } {
  return validateScoreByManifest(gameId, score);
}

export interface DifficultyValidationResult {
  valid: boolean;
  reason?: string;
  /** Always populated even when invalid, so callers have a safe fallback ("normal", or the
   * game's own declared default) rather than needing to branch on undefined. */
  normalizedDifficultyId: string;
}

/**
 * Validates a submitted difficulty id against the game's manifest. Games without a `difficulty`
 * config only ever accept "normal" (the universal no-op tier every game implicitly has) — an
 * unset/omitted id is not an error, it just resolves to "normal" or the game's declared default.
 */
export function validateDifficulty(
  gameId: string,
  rawDifficultyId: string | undefined,
): DifficultyValidationResult {
  const manifest = GAME_MANIFEST_MAP[gameId];
  const difficultyId = rawDifficultyId?.trim();

  if (!manifest?.difficulty) {
    if (!difficultyId || difficultyId === "normal") {
      return { valid: true, normalizedDifficultyId: "normal" };
    }
    return {
      valid: false,
      reason: "이 게임은 난이도를 지원하지 않습니다.",
      normalizedDifficultyId: "normal",
    };
  }

  const { levels, defaultLevelId } = manifest.difficulty;
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
