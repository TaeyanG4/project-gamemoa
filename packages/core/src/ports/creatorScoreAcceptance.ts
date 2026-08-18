/**
 * The one write this whole feature exists for: consuming a Game Session's attemptId and saving
 * the resulting score, as a single atomic operation. Deliberately a separate port from
 * GameAttemptConsumptionRepository (which stays a narrow, standalone "claim this attemptId"
 * primitive) rather than an extension of it — attemptId consumption and score persistence must
 * happen in the SAME database transaction here, specifically so there is no possible outcome
 * where one succeeds and the other doesn't (see CreatorScoreAcceptanceUseCases's doc comment for
 * why that matters). A caller that only wants to consume an attemptId with no score attached
 * still has GameAttemptConsumptionRepository for that.
 */
export interface CreatorScoreAcceptanceRepository {
  /**
   * Atomically: claims `attemptId` for one-time use, and — only if that claim actually wins —
   * saves the score row. `accepted: false` covers every reason the score does not get saved: the
   * attemptId was already spent (a replay, or a genuine concurrent duplicate that lost the race).
   * Never partially applies — either both writes happen or neither does.
   */
  acceptScore(input: {
    attemptId: string;
    userId: number;
    /** sandbox_games.id — the numeric id the attempt-consumption table's FK expects. */
    gameId: number;
    versionId: number;
    /** The game's slug — what scores.game_id actually stores, same as every SYSTEM game's score
     * row. Distinct from `gameId` above on purpose: the two tables key "which game" differently. */
    slug: string;
    nickname: string;
    avatarUrl: string | null;
    score: number;
    difficulty: string;
    nowIso: string;
  }): Promise<{ accepted: boolean }>;
}
