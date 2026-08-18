/**
 * Runtime replay-protection storage for a Game Session's attemptId (see
 * packages/core/src/domain/gameSession.ts). Deliberately the narrowest possible port: one
 * operation, one question answered — "has this exact attemptId already been spent?" — atomically,
 * so two requests racing on the same token can never both succeed. Nothing here stores canonical
 * game/creator metadata (that's SandboxGameRepository) or a score/leaderboard/XP record; this is
 * purely a one-time-use marker.
 */
export interface GameAttemptConsumptionRepository {
  /**
   * Atomically claims `attemptId` for one-time use. `consumed: true` only on the very first
   * successful claim of a given attemptId; every later call for that same attemptId — a replay, a
   * genuine concurrent duplicate, or anything else — returns `consumed: false` without throwing.
   * `userId`/`gameId`/`versionId` are recorded alongside the claim for auditability, not consulted
   * to decide the outcome — the attemptId itself is what's unique.
   */
  consumeAttempt(input: {
    attemptId: string;
    userId: number;
    gameId: number;
    versionId: number;
    nowIso: string;
  }): Promise<{ consumed: boolean }>;
}
