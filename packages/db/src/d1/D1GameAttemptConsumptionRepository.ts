import type { GameAttemptConsumptionRepository } from "@owogg/core";
import type { D1Database } from "./D1UserRepository.js";

/**
 * Migration 0028 (game_attempt_consumptions). The entire atomicity guarantee here is the table's
 * `attempt_id TEXT PRIMARY KEY` constraint plus `ON CONFLICT(attempt_id) DO NOTHING` — no
 * application-level locking or transaction wrapper, matching this codebase's existing pattern for
 * "claim exactly once under concurrent requests" (D1AchievementRepository.unlockAchievement,
 * D1ProgressionRepository's per-source-event XP dedup, sandbox_games' review-slot claim). D1
 * serializes statements one at a time (see docs/DATABASE.md §4), so two concurrent INSERTs for the
 * same attemptId can never both succeed — the second always hits the conflict and is a no-op.
 */
export class D1GameAttemptConsumptionRepository implements GameAttemptConsumptionRepository {
  constructor(private db: D1Database) {}

  async consumeAttempt(input: {
    attemptId: string;
    userId: number;
    gameId: number;
    versionId: number;
    nowIso: string;
  }): Promise<{ consumed: boolean }> {
    const result = await this.db
      .prepare(
        `INSERT INTO game_attempt_consumptions (attempt_id, user_id, game_id, version_id, consumed_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(attempt_id) DO NOTHING`,
      )
      .bind(input.attemptId, input.userId, input.gameId, input.versionId, input.nowIso)
      .run();

    // Fall back to trusting the call as a fresh consumption when meta is unavailable (test
    // doubles) — same posture as D1AchievementRepository.unlockAchievement.
    const consumed = result.meta?.changes !== 0;
    return { consumed };
  }
}
