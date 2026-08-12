import type { Score, ScoreRepository, UserPersonalBestAggregate } from "@gamemoa/core";
import type { D1Database } from "./D1UserRepository.js";

export class D1ScoreRepository implements ScoreRepository {
  constructor(private db: D1Database) {}

  async saveScore(data: {
    userId: number;
    nickname: string;
    avatarUrl?: string | null;
    gameId: string;
    score: number;
  }): Promise<Score> {
    if (!data.userId || typeof data.userId !== "number") {
      throw new Error("Valid userId is required to save score");
    }

    const createdAt = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO scores (user_id, nickname, avatar_url, game_id, score, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        data.userId,
        data.nickname || "플레이어",
        data.avatarUrl ?? null,
        data.gameId,
        data.score,
        createdAt,
      )
      .run();

    const row = await this.db
      .prepare(`SELECT * FROM scores WHERE rowid = last_insert_rowid()`)
      .first<Record<string, unknown>>();

    return {
      id: Number(row?.id ?? 0),
      user_id: data.userId,
      nickname: data.nickname || "플레이어",
      avatar_url: data.avatarUrl ?? null,
      game_id: data.gameId,
      score: data.score,
      created_at: createdAt,
    };
  }

  async getLeaderboard(
    gameId: string,
    limit = 20,
    direction: "asc" | "desc" = "desc",
  ): Promise<Score[]> {
    const orderClause = direction === "asc" ? "ASC" : "DESC";

    const query =
      gameId === "all"
        ? `SELECT * FROM scores WHERE user_id IS NOT NULL ORDER BY created_at DESC LIMIT ?`
        : `SELECT * FROM scores WHERE user_id IS NOT NULL AND game_id = ? ORDER BY score ${orderClause}, created_at ASC LIMIT 100`;

    const prepared =
      gameId === "all" ? this.db.prepare(query).bind(limit) : this.db.prepare(query).bind(gameId);

    const res = await prepared.all<Record<string, unknown>>();

    // Deduplicate top score per authenticated user
    const seen = new Set<number>();
    const leaderboard: Score[] = [];

    for (const row of res.results) {
      if (row.user_id === null || row.user_id === undefined) continue;
      const userId = Number(row.user_id);
      if (isNaN(userId)) continue;

      if (seen.has(userId)) continue;
      seen.add(userId);

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

  async getUserPersonalBests(userId: number): Promise<UserPersonalBestAggregate[]> {
    const res = await this.db
      .prepare(
        `SELECT game_id, MIN(score) as min_score, MAX(score) as max_score FROM scores WHERE user_id = ? GROUP BY game_id`,
      )
      .bind(userId)
      .all<{ game_id: string; min_score: number; max_score: number }>();

    return res.results.map((row) => ({
      game_id: String(row.game_id),
      min_score: Number(row.min_score),
      max_score: Number(row.max_score),
    }));
  }
}
