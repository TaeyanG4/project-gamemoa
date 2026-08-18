import { verifyGameSession, gameSessionMatches } from "../domain/gameSession.js";
import type { GameAttemptConsumptionRepository } from "../ports/gameAttempt.js";

export type GameAttemptConsumeError =
  /** The token itself didn't verify — malformed, wrong signature, or past its exp. See
   * GameSessionVerifyError for which. */
  | "INVALID_TOKEN"
  /** The token verified, but its claims don't match what this call expects (a token issued to a
   * different user, or for a different game/version, being presented here). */
  | "CONTEXT_MISMATCH"
  /** The token verified and matched, but its attemptId was already spent — a replay, or a
   * concurrent duplicate that lost the race. */
  | "ALREADY_CONSUMED";

export type GameAttemptConsumeResult = { ok: true } | { ok: false; error: GameAttemptConsumeError };

/**
 * Orchestrates the one thing a caller actually needs before trusting a Game Session token for
 * anything: verify it, confirm it's for the right context, and spend its attemptId exactly once.
 * Deliberately does nothing past that — no score/leaderboard/XP write, no GameHost/Bridge
 * awareness. This is the prerequisite the task built ahead of that connection, not the connection
 * itself.
 */
export class GameAttemptUseCases {
  constructor(private repo: GameAttemptConsumptionRepository) {}

  async consume(input: {
    token: string;
    secret: string;
    expected: { userId: number; gameId: number; versionId: number };
  }): Promise<GameAttemptConsumeResult> {
    const verified = await verifyGameSession(input.token, input.secret);
    if (!verified.ok) return { ok: false, error: "INVALID_TOKEN" };

    if (!gameSessionMatches(verified.payload, input.expected)) {
      return { ok: false, error: "CONTEXT_MISMATCH" };
    }

    const { consumed } = await this.repo.consumeAttempt({
      attemptId: verified.payload.attemptId,
      userId: verified.payload.userId,
      gameId: verified.payload.gameId,
      versionId: verified.payload.versionId,
      nowIso: new Date().toISOString(),
    });
    if (!consumed) return { ok: false, error: "ALREADY_CONSUMED" };

    return { ok: true };
  }
}
