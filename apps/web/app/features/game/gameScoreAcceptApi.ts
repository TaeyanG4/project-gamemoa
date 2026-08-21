import { GameScoreAcceptResponseSchema, type GameScoreAcceptResponse } from "@owogg/contracts";
import { apiFetch } from "../../lib/api/client";

/**
 * POST /api/games/:slug/score — spends a Game Session token (see gameSessionApi.ts's
 * fetchGameSession) exactly once, saving the score if the server accepts it. Session-cookie auth
 * only (apiFetch's credentials: "include", same as every other authenticated call in this app) —
 * this function never sees or handles the token's own issuance, only submission.
 *
 * Throws (via apiFetch's ApiClientError) on any rejection — an expired/mismatched/already-spent
 * token, an out-of-policy score, or a since-unpublished game all surface as a thrown error with a
 * server-provided Korean message in `.message`, for gameScoreFlow.ts to catch and report as a
 * submission failure. Never called directly by a component — see gameScoreFlow.ts.
 */
export function acceptGameScore(
  slug: string,
  input: { token: string; score: number; difficulty?: string; playToken?: string | null },
): Promise<GameScoreAcceptResponse> {
  return apiFetch(`/api/games/${encodeURIComponent(slug)}/score`, GameScoreAcceptResponseSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
