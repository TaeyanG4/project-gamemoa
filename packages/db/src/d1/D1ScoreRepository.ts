import type { Score, ScoreRepository, UserPersonalBestAggregate } from "@gamemoa/core";
import type { D1Database } from "./D1UserRepository.js";

function mapScoreRow(row: Record<string, unknown>): Score {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    nickname: String(row.nickname),
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    game_id: String(row.game_id),
    score: Number(row.score),
    created_at: String(row.created_at),
  };
}

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
    // `direction` must only ever originate from the trusted game manifest (never from raw
    // user/query input) — it is interpolated directly into SQL below.
    const orderClause = direction === "asc" ? "ASC" : "DESC";

    if (gameId === "all") {
      // Recent-activity feed, not a per-user ranked leaderboard — no PB dedup semantics apply.
      const res = await this.db
        .prepare(`SELECT * FROM scores WHERE user_id IS NOT NULL ORDER BY created_at DESC LIMIT ?`)
        .bind(limit)
        .all<Record<string, unknown>>();
      return res.results.map(mapScoreRow);
    }

    // One canonical personal-best row per user is selected IN SQL (via ROW_NUMBER, before
    // LIMIT), then the deduplicated PB set is ranked and paginated. This must never regress to
    // "ORDER BY score LIMIT N" followed by JS de-duplication — a single user holding many of the
    // top-N raw rows would otherwise crowd out every other player from the leaderboard.
    // Deterministic tie-break: score, then earliest created_at, then row id.
    const query = `
      WITH ranked AS (
        SELECT *, ROW_NUMBER() OVER (
          PARTITION BY user_id
          ORDER BY score ${orderClause}, created_at ASC, id ASC
        ) AS rn
        FROM scores
        WHERE user_id IS NOT NULL AND game_id = ?
      )
      SELECT * FROM ranked
      WHERE rn = 1
      ORDER BY score ${orderClause}, created_at ASC, id ASC
      LIMIT ?
    `;

    const res = await this.db.prepare(query).bind(gameId, limit).all<Record<string, unknown>>();

    return res.results.map(mapScoreRow);
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
