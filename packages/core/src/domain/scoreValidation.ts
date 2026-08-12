import { validateScoreByManifest } from "../registry/gameRegistry.generated.js";

export function validateScorePayload(
  gameId: string,
  score: number,
): { valid: boolean; reason?: string } {
  return validateScoreByManifest(gameId, score);
}
