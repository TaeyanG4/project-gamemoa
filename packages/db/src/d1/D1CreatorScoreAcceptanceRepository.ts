import type { CreatorScoreAcceptanceRepository } from "@owogg/core";
import type { D1Database } from "./D1UserRepository.js";

/**
 * The atomic write CreatorScoreAcceptanceUseCases needs: consume the attemptId AND save the
 * score, or do neither — never one without the other. Both statements run in a single
 * `db.batch()` call (Cloudflare D1's implicit-transaction primitive; every statement in a batch
 * either all commit or all roll back together), so this is a real database-level guarantee, not
 * "call two methods in the right order and hope nothing fails in between."
 *
 * The actual mechanism the second statement uses to stay conditional on the first — `changes()`
 * (SQLite's built-in function reporting how many rows the *previous* statement on this connection
 * modified) — was verified directly against node:sqlite (the same underlying engine D1 uses)
 * before writing this: two back-to-back statements on one connection where the second is
 * `INSERT ... SELECT ... WHERE changes() = 1` only actually inserts when the first one's own
 * INSERT really wrote a row. `ON CONFLICT(attempt_id) DO NOTHING` on the first statement makes
 * `changes()` read 0 exactly when a duplicate/replay attemptId already existed.
 *
 * That SQL gate is what makes the write conditional — but whether *this call* actually got the
 * score in is decided separately, by reading the *second* statement's own result, not the SQL
 * `changes()` value used to gate it. Success is `meta.rows_written > 0` on the scores INSERT
 * specifically (Cloudflare D1's own field for "rows this statement wrote"), not `meta.changes`:
 * `changes` on a `SELECT ... WHERE <false>` statement is 0 as expected, but this repository's
 * accept/reject decision belongs to the row count of the write it is actually reporting on, not a
 * same-named-but-different-purpose counter the SQL gate happens to also use.
 */
export class D1CreatorScoreAcceptanceRepository implements CreatorScoreAcceptanceRepository {
  constructor(private db: D1Database) {}

  async acceptScore(input: {
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
  }): Promise<{ accepted: boolean }> {
    const results = (await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO game_attempt_consumptions (attempt_id, user_id, game_id, version_id, consumed_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(attempt_id) DO NOTHING`,
        )
        .bind(input.attemptId, input.userId, input.gameId, input.versionId, input.nowIso),
      this.db
        .prepare(
          `INSERT INTO scores (user_id, nickname, avatar_url, game_id, score, difficulty, created_at)
           SELECT ?, ?, ?, ?, ?, ?, ?
           WHERE changes() = 1`,
        )
        .bind(
          input.userId,
          input.nickname,
          input.avatarUrl,
          input.slug,
          input.score,
          input.difficulty,
          input.nowIso,
        ),
    ])) as Array<{ success: boolean; meta?: { changes?: number; rows_written?: number } }>;

    const scoreInsertResult = results[1];
    // Deliberately strict, unlike D1AchievementRepository.unlockAchievement's "trust it when meta
    // is unavailable" posture: this call must see positive proof the score row was written, not
    // merely the absence of proof it wasn't. A test double that doesn't populate rows_written is a
    // test double that hasn't modeled this write correctly, not a case to silently paper over.
    const accepted = (scoreInsertResult?.meta?.rows_written ?? 0) > 0;
    return { accepted };
  }
}
