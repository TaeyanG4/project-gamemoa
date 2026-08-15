import type { AdminMonitoringRepository, GamePlayCount } from "@owogg/core";
import type { D1Database } from "./D1UserRepository.js";

export class D1AdminMonitoringRepository implements AdminMonitoringRepository {
  constructor(private db: D1Database) {}

  async getActiveUserCounts(): Promise<{ dau: number; wau: number }> {
    // Two separate COUNT(DISTINCT) queries (not one query with two CASE-summed columns) —
    // simpler to read and D1/SQLite has no trouble running both; this endpoint is loaded on
    // demand by an admin, not on a hot request path.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [dauRow, wauRow] = await Promise.all([
      this.db
        .prepare(`SELECT COUNT(DISTINCT user_id) AS total FROM xp_events WHERE created_at >= ?`)
        .bind(dayAgo)
        .first<{ total: number }>(),
      this.db
        .prepare(`SELECT COUNT(DISTINCT user_id) AS total FROM xp_events WHERE created_at >= ?`)
        .bind(weekAgo)
        .first<{ total: number }>(),
    ]);

    return {
      dau: Number(dauRow?.total ?? 0),
      wau: Number(wauRow?.total ?? 0),
    };
  }

  async getGamePlayCounts(sinceDays: number): Promise<GamePlayCount[]> {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
    const res = await this.db
      .prepare(
        `SELECT game_id, COUNT(*) AS total FROM scores
         WHERE created_at >= ? AND deleted_at IS NULL
         GROUP BY game_id
         ORDER BY total DESC`,
      )
      .bind(since)
      .all<{ game_id: string; total: number }>();

    return (res.results || []).map((row) => ({
      gameId: row.game_id,
      count: Number(row.total),
    }));
  }

  async checkD1Health(): Promise<{ healthy: boolean; latencyMs: number }> {
    const startedAt = Date.now();
    try {
      await this.db.prepare(`SELECT 1`).first();
      return { healthy: true, latencyMs: Date.now() - startedAt };
    } catch {
      return { healthy: false, latencyMs: Date.now() - startedAt };
    }
  }
}
