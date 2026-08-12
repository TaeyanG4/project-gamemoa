import { GAME_MANIFEST_MAP, type Score, type ScoreRepository } from "@gamemoa/core";
import type { D1Database } from "./D1UserRepository.js";

export class D1ScoreRepository implements ScoreRepository {
  constructor(private db: D1Database) {}

  async saveScore(data: {
    userId?: number | null;
    nickname: string;
    avatarUrl?: string | null;
    gameId: string;
    score: number;
  }): Promise<Score> {
    const createdAt = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO scores (user_id, nickname, avatar_url, game_id, score, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        data.userId ?? null,
        data.nickname || "게스트",
        data.avatarUrl ?? null,
        data.gameId,
        data.score,
        createdAt
      )
      .run();

    const row = await this.db
      .prepare(`SELECT * FROM scores WHERE rowid = last_insert_rowid()`)
      .first<Record<string, unknown>>();

    return {
      id: Number(row?.id ?? 0),
      user_id: data.userId ?? null,
      nickname: data.nickname || "게스트",
      avatar_url: data.avatarUrl ?? null,
      game_id: data.gameId,
      score: data.score,
      created_at: createdAt,
    };
  }

  async getLeaderboard(gameId: string, limit = 20, direction?: "asc" | "desc"): Promise<Score[]> {
    const dir = direction ?? GAME_MANIFEST_MAP[gameId]?.scoreConfig?.direction ?? "desc";
    const orderClause = dir === "asc" ? "ASC" : "DESC";

    const query =
      gameId === "all"
        ? `SELECT * FROM scores ORDER BY created_at DESC LIMIT ?`
        : `SELECT * FROM scores WHERE game_id = ? ORDER BY score ${orderClause}, created_at ASC LIMIT 100`;

    const prepared = gameId === "all"
      ? this.db.prepare(query).bind(limit)
      : this.db.prepare(query).bind(gameId);

    const res = await prepared.all<Record<string, unknown>>();

    // Deduplicate top score per user/nickname
    const seen = new Set<string>();
    const leaderboard: Score[] = [];

    for (const row of res.results) {
      const userId = row.user_id ? Number(row.user_id) : null;
      const key = userId ? `u_${userId}` : `n_${String(row.nickname)}`;

      if (seen.has(key)) continue;
      seen.add(key);

      leaderboard.push({
        id: Number(row.id),
        user_id: userId,
        nickname: String(row.nickname),
        avatar_url: row.avatar_url ? String(row.avatar_url) : null,
        game_id: String(row.game_id),
        score: Number(row.score),
        created_at: String(row.created_at),
      });

      if (leaderboard.length >= limit) break;
    }

    return leaderboard;
  }

  async getUserPersonalBests(userId: number): Promise<Record<string, number>> {
    const res = await this.db
      .prepare(
        `SELECT game_id, MIN(score) as min_score, MAX(score) as max_score FROM scores WHERE user_id = ? GROUP BY game_id`
      )
      .bind(userId)
      .all<{ game_id: string; min_score: number; max_score: number }>();

    const bests: Record<string, number> = {};

    for (const row of res.results) {
      const gId = String(row.game_id);
      const dir = GAME_MANIFEST_MAP[gId]?.scoreConfig?.direction ?? "desc";
      bests[gId] = dir === "asc" ? Number(row.min_score) : Number(row.max_score);
    }

    return bests;
  }
}
