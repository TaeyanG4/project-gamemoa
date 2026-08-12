import type { AccountMergeRepository, MergeChallenge, MergePreview } from "@gamemoa/core";
import type { D1Database } from "./D1UserRepository.js";

export class D1AccountMergeRepository implements AccountMergeRepository {
  constructor(private db: D1Database) {}

  async getAccountMergePreview(userId: number): Promise<MergePreview> {
    const userRow = await this.db
      .prepare(`SELECT id, nickname, created_at FROM users WHERE id = ?`)
      .bind(userId)
      .first<Record<string, unknown>>();

    const providerRow = await this.db
      .prepare(
        `SELECT provider FROM oauth_accounts WHERE user_id = ? ORDER BY created_at ASC LIMIT 1`,
      )
      .bind(userId)
      .first<{ provider: string }>();

    const scoreCountRow = await this.db
      .prepare(`SELECT COUNT(*) as count FROM scores WHERE user_id = ?`)
      .bind(userId)
      .first<{ count: number }>();

    const favCountRow = await this.db
      .prepare(`SELECT COUNT(*) as count FROM user_favorites WHERE user_id = ?`)
      .bind(userId)
      .first<{ count: number }>();

    const recentCountRow = await this.db
      .prepare(`SELECT COUNT(*) as count FROM user_recent_plays WHERE user_id = ?`)
      .bind(userId)
      .first<{ count: number }>();

    return {
      userId: userRow ? Number(userRow.id) : userId,
      nickname: userRow ? String(userRow.nickname) : "알 수 없음",
      provider: providerRow ? String(providerRow.provider) : "",
      createdAt: userRow ? String(userRow.created_at) : "",
      scoreCount: Number(scoreCountRow?.count ?? 0),
      favoriteCount: Number(favCountRow?.count ?? 0),
      recentPlayCount: Number(recentCountRow?.count ?? 0),
    };
  }

  async createMergeChallenge(input: {
    userA: number;
    userB: number;
    provider: string;
    providerUserId: string;
    ttlSeconds: number;
  }): Promise<{ id: string; expiresAt: string }> {
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000).toISOString();
    const createdAt = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO account_merge_challenges (id, user_a, user_b, provider, provider_user_id, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.userA,
        input.userB,
        input.provider,
        input.providerUserId,
        createdAt,
        expiresAt,
      )
      .run();
    return { id, expiresAt };
  }

  async findMergeChallenge(id: string): Promise<MergeChallenge | null> {
    const row = await this.db
      .prepare(
        `SELECT id, user_a, user_b, provider, provider_user_id, created_at, expires_at, consumed_at
         FROM account_merge_challenges WHERE id = ?`,
      )
      .bind(id)
      .first<Record<string, unknown>>();
    if (!row) return null;
    return this.mapRow(row);
  }

  async findPendingMergeChallenge(userA: number, userB: number): Promise<MergeChallenge | null> {
    const row = await this.db
      .prepare(
        `SELECT id, user_a, user_b, provider, provider_user_id, created_at, expires_at, consumed_at
         FROM account_merge_challenges
         WHERE ((user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?))
           AND consumed_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(userA, userB, userB, userA)
      .first<Record<string, unknown>>();
    if (!row) return null;
    return this.mapRow(row);
  }

  async consumeMergeChallenge(id: string): Promise<void> {
    await this.db
      .prepare(`UPDATE account_merge_challenges SET consumed_at = datetime('now') WHERE id = ?`)
      .bind(id)
      .run();
  }

  async mergeAccounts(primaryId: number, secondaryId: number): Promise<void> {
    // Primary-Wins atomic merge. D1 batch runs all statements as a single transaction:
    // secondary gameplay/personalization/progression/sessions are deleted (never unioned
    // into primary — this includes XP events and achievement unlocks, so no ghost XP or
    // duplicated achievements survive the merge), secondary OAuth identities are
    // transferred to the primary, then the secondary user is deleted.
    const statements = [
      this.db.prepare(`DELETE FROM scores WHERE user_id = ?`).bind(secondaryId),
      this.db.prepare(`DELETE FROM user_favorites WHERE user_id = ?`).bind(secondaryId),
      this.db.prepare(`DELETE FROM user_recent_plays WHERE user_id = ?`).bind(secondaryId),
      this.db.prepare(`DELETE FROM xp_events WHERE user_id = ?`).bind(secondaryId),
      this.db.prepare(`DELETE FROM user_progress WHERE user_id = ?`).bind(secondaryId),
      this.db.prepare(`DELETE FROM user_achievements WHERE user_id = ?`).bind(secondaryId),
      this.db.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(secondaryId),
      this.db
        .prepare(`UPDATE oauth_accounts SET user_id = ? WHERE user_id = ?`)
        .bind(primaryId, secondaryId),
      this.db.prepare(`DELETE FROM users WHERE id = ?`).bind(secondaryId),
    ];
    await this.db.batch(statements);
  }

  private mapRow(row: Record<string, unknown>): MergeChallenge {
    return {
      id: String(row.id),
      userA: Number(row.user_a),
      userB: Number(row.user_b),
      provider: String(row.provider),
      providerUserId: String(row.provider_user_id),
      expiresAt: String(row.expires_at),
      consumedAt: row.consumed_at ? String(row.consumed_at) : null,
    };
  }
}
