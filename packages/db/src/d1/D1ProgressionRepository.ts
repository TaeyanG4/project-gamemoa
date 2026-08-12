import type {
  ProgressionRepository,
  RecordCompletionOutcome,
  UserProgress,
  XpLeaderboardEntry,
} from "@gamemoa/core";
import type { D1Database } from "./D1UserRepository.js";

export class D1ProgressionRepository implements ProgressionRepository {
  constructor(private db: D1Database) {}

  async recordGameCompletion(input: {
    userId: number;
    gameId: string;
    sourceType: string;
    sourceId: string;
    xpPerCompletion: number;
    dailyCapPerGame: number;
  }): Promise<RecordCompletionOutcome> {
    // Idempotency guard: one source event (e.g. one `scores` row) produces at most one
    // xp_events row. Checked up-front so a replay is a true no-op with no side effects.
    const existing = await this.db
      .prepare(`SELECT id FROM xp_events WHERE source_type = ? AND source_id = ?`)
      .bind(input.sourceType, input.sourceId)
      .first<{ id: number }>();

    if (existing) {
      const progress = await this.getUserProgress(input.userId);
      return {
        duplicate: true,
        xpAwarded: 0,
        totalXp: progress?.total_xp ?? 0,
        eligibleCompletions: progress?.eligible_completions ?? 0,
        xpEventId: Number(existing.id),
      };
    }

    // Daily anti-farming cap: count XP-awarding completions already recorded today (UTC)
    // for this user + game. Beyond the cap, the completion is still recorded (amount 0)
    // so achievement progress keeps advancing, but no further XP is granted.
    const todayCountRow = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM xp_events
         WHERE user_id = ? AND game_id = ? AND amount > 0 AND date(created_at) = date('now')`,
      )
      .bind(input.userId, input.gameId)
      .first<{ count: number }>();

    const todayCount = Number(todayCountRow?.count ?? 0);
    const underCap = todayCount < input.dailyCapPerGame;
    const xpAwarded = underCap ? input.xpPerCompletion : 0;
    const createdAt = new Date().toISOString();

    const insertResult = await this.db
      .prepare(
        `INSERT INTO xp_events (user_id, amount, reason, source_type, source_id, game_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(source_type, source_id) DO NOTHING`,
      )
      .bind(
        input.userId,
        xpAwarded,
        "GAME_COMPLETION",
        input.sourceType,
        input.sourceId,
        input.gameId,
        createdAt,
      )
      .run();

    // Defense-in-depth against the narrow race between the up-front SELECT check and this
    // INSERT: if the D1 runtime reports the conflict clause actually skipped the write
    // (meta.changes === 0), a concurrent call already recorded this source event — treat
    // as duplicate and skip the aggregate update entirely. When meta is unavailable (e.g.
    // in simplified test doubles), fall back to trusting the up-front SELECT check.
    const insertedRow = insertResult.meta?.changes !== 0;

    if (!insertedRow) {
      const progress = await this.getUserProgress(input.userId);
      return {
        duplicate: true,
        xpAwarded: 0,
        totalXp: progress?.total_xp ?? 0,
        eligibleCompletions: progress?.eligible_completions ?? 0,
      };
    }

    await this.db
      .prepare(
        `INSERT INTO user_progress (user_id, total_xp, eligible_completions, updated_at)
         VALUES (?, ?, 1, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           total_xp = total_xp + excluded.total_xp,
           eligible_completions = eligible_completions + 1,
           updated_at = excluded.updated_at`,
      )
      .bind(input.userId, xpAwarded, createdAt)
      .run();

    const progress = await this.getUserProgress(input.userId);
    const createdEvent = await this.db
      .prepare(`SELECT id FROM xp_events WHERE source_type = ? AND source_id = ?`)
      .bind(input.sourceType, input.sourceId)
      .first<{ id: number }>();

    return {
      duplicate: false,
      xpAwarded,
      totalXp: progress?.total_xp ?? xpAwarded,
      eligibleCompletions: progress?.eligible_completions ?? 1,
      xpEventId: createdEvent ? Number(createdEvent.id) : undefined,
    };
  }

  async getUserProgress(userId: number): Promise<UserProgress | null> {
    const row = await this.db
      .prepare(
        `SELECT user_id, total_xp, eligible_completions, updated_at FROM user_progress WHERE user_id = ?`,
      )
      .bind(userId)
      .first<Record<string, unknown>>();

    if (!row) return null;

    return {
      user_id: Number(row.user_id),
      total_xp: Number(row.total_xp),
      eligible_completions: Number(row.eligible_completions),
      updated_at: String(row.updated_at),
    };
  }

  async getXpLeaderboard(limit: number): Promise<XpLeaderboardEntry[]> {
    const res = await this.db
      .prepare(
        `SELECT u.id as user_id, u.nickname, u.avatar_url, p.total_xp
         FROM user_progress p
         JOIN users u ON u.id = p.user_id
         ORDER BY p.total_xp DESC, p.user_id ASC
         LIMIT ?`,
      )
      .bind(limit)
      .all<Record<string, unknown>>();

    return res.results.map((row) => ({
      userId: Number(row.user_id),
      nickname: String(row.nickname),
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      totalXp: Number(row.total_xp),
    }));
  }

  async getGlobalXpRank(userId: number): Promise<number | null> {
    const progress = await this.getUserProgress(userId);
    if (!progress) return null;

    const row = await this.db
      .prepare(`SELECT COUNT(*) as ahead FROM user_progress WHERE total_xp > ?`)
      .bind(progress.total_xp)
      .first<{ ahead: number }>();

    return Number(row?.ahead ?? 0) + 1;
  }
}
