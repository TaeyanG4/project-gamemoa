/**
 * Provider-neutral, one-use score acceptance. The caller has already resolved the generic runtime
 * identity/version and canonical policy; this port owns only the D1 transaction that claims the
 * signed attempt and inserts the score row together.
 */
export interface GameScoreAcceptanceRepository {
  acceptScore(input: {
    attemptId: string;
    userId: number;
    gameId: number;
    versionId: number;
    slug: string;
    nickname: string;
    avatarUrl: string | null;
    score: number;
    difficulty: string;
    nowIso: string;
  }): Promise<{ accepted: boolean; scoreId: number | null }>;
}
