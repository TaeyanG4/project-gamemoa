import type { PersonalizationRepository } from "@owogg/core";
import type { D1Database } from "./D1UserRepository.js";

export class D1PersonalizationRepository implements PersonalizationRepository {
  constructor(private db: D1Database) {}

  async getFavorites(userId: number): Promise<string[]> {
    const rows = await this.db
      .prepare(`SELECT game_id FROM user_favorites WHERE user_id = ? ORDER BY created_at ASC`)
      .bind(userId)
      .all<{ game_id: string }>();

    return (rows.results || []).map((r) => r.game_id);
  }

  async addFavorite(userId: number, gameId: string): Promise<void> {
    const createdAt = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT OR IGNORE INTO user_favorites (user_id, game_id, created_at) VALUES (?, ?, ?)`,
      )
      .bind(userId, gameId, createdAt)
      .run();
  }

  async removeFavorite(userId: number, gameId: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM user_favorites WHERE user_id = ? AND game_id = ?`)
      .bind(userId, gameId)
      .run();
  }

  async getRecentPlays(
    userId: number,
    limit = 12,
  ): Promise<{ gameId: string; lastPlayedAt: string }[]> {
    const rows = await this.db
      .prepare(
        `SELECT game_id, last_played_at FROM user_recent_plays WHERE user_id = ? ORDER BY last_played_at DESC LIMIT ?`,
      )
      .bind(userId, limit)
      .all<{ game_id: string; last_played_at: string }>();

    return (rows.results || []).map((r) => ({
      gameId: r.game_id,
      lastPlayedAt: r.last_played_at,
    }));
  }

  async recordRecentPlay(userId: number, gameId: string, playedAt?: string): Promise<void> {
    const timestamp = playedAt || new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO user_recent_plays (user_id, game_id, last_played_at) VALUES (?, ?, ?)
         ON CONFLICT(user_id, game_id) DO UPDATE SET last_played_at = excluded.last_played_at`,
      )
      .bind(userId, gameId, timestamp)
      .run();
  }

  async importGuestData(
    userId: number,
    guestRecentPlays: { gameId: string; lastPlayedAt: string }[],
  ): Promise<void> {
    const now = new Date().toISOString();

    // Import Recent Plays only (Max timestamp per game). Guest favorites are NOT imported.
    for (const recent of guestRecentPlays) {
      if (recent && typeof recent.gameId === "string" && recent.gameId.trim().length > 0) {
        const timestamp = recent.lastPlayedAt || now;
        await this.recordRecentPlay(userId, recent.gameId.trim(), timestamp);
      }
    }
  }
}
