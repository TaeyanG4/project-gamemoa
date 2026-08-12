import type { OAuthAccount, User, UserRepository } from "@gamemoa/core";

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  /** `meta.changes` (when present) reports rows actually written by this statement —
   * used to detect whether an `ON CONFLICT DO NOTHING` insert was a no-op. */
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
}

export class D1UserRepository implements UserRepository {
  constructor(private db: D1Database) {}

  async findById(id: number): Promise<User | null> {
    const row = await this.db
      .prepare(`SELECT * FROM users WHERE id = ?`)
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) return null;
    const providers = await this.getUserProviders(id);

    return {
      id: Number(row.id),
      nickname: String(row.nickname),
      email: row.email ? String(row.email) : null,
      avatar_url: row.avatar_url ? String(row.avatar_url) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      providers,
      country: row.country ? String(row.country) : null,
      nickname_updated_at: row.nickname_updated_at ? String(row.nickname_updated_at) : null,
      country_updated_at: row.country_updated_at ? String(row.country_updated_at) : null,
    };
  }

  async findByOAuth(provider: string, providerUserId: string): Promise<User | null> {
    const oauthRow = await this.db
      .prepare(
        `SELECT u.* FROM oauth_accounts o 
         JOIN users u ON o.user_id = u.id 
         WHERE o.provider = ? AND o.provider_user_id = ?`,
      )
      .bind(provider, providerUserId)
      .first<Record<string, unknown>>();

    if (!oauthRow) return null;

    const id = Number(oauthRow.id);
    const providers = await this.getUserProviders(id);

    return {
      id,
      nickname: String(oauthRow.nickname),
      email: oauthRow.email ? String(oauthRow.email) : null,
      avatar_url: oauthRow.avatar_url ? String(oauthRow.avatar_url) : null,
      created_at: String(oauthRow.created_at),
      updated_at: String(oauthRow.updated_at),
      providers,
      country: oauthRow.country ? String(oauthRow.country) : null,
      nickname_updated_at: oauthRow.nickname_updated_at
        ? String(oauthRow.nickname_updated_at)
        : null,
      country_updated_at: oauthRow.country_updated_at ? String(oauthRow.country_updated_at) : null,
    };
  }

  async findOrCreateUser(data: {
    provider: string;
    providerUserId: string;
    email: string | null;
    nickname: string;
    avatarUrl: string | null;
  }): Promise<User> {
    const existingUser = await this.findByOAuth(data.provider, data.providerUserId);
    if (existingUser) {
      // Update email/avatar if changed
      let needsUpdate = false;
      let updatedEmail = existingUser.email;
      let updatedAvatar = existingUser.avatar_url;

      if (data.email && existingUser.email !== data.email) {
        updatedEmail = data.email;
        needsUpdate = true;
      }
      if (data.avatarUrl && existingUser.avatar_url !== data.avatarUrl) {
        updatedAvatar = data.avatarUrl;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await this.db
          .prepare(
            `UPDATE users SET email = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
          )
          .bind(updatedEmail, updatedAvatar, existingUser.id)
          .run();
        existingUser.email = updatedEmail;
        existingUser.avatar_url = updatedAvatar;
      }

      return existingUser;
    }

    // Insert new user
    await this.db
      .prepare(
        `INSERT INTO users (nickname, email, avatar_url, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .bind(data.nickname, data.email, data.avatarUrl)
      .run();

    const newUserRow = await this.db
      .prepare(`SELECT * FROM users WHERE rowid = last_insert_rowid()`)
      .first<Record<string, unknown>>();

    const userId = Number(newUserRow?.id ?? (await this.getLastInsertId()));

    // Insert oauth record
    await this.db
      .prepare(
        `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email) VALUES (?, ?, ?, ?)`,
      )
      .bind(userId, data.provider, data.providerUserId, data.email)
      .run();

    return {
      id: userId,
      nickname: data.nickname,
      email: data.email,
      avatar_url: data.avatarUrl,
      created_at: String(newUserRow?.created_at ?? new Date().toISOString()),
      updated_at: String(newUserRow?.updated_at ?? new Date().toISOString()),
      providers: [data.provider],
    };
  }

  private async getUserProviders(userId: number): Promise<string[]> {
    const res = await this.db
      .prepare(`SELECT provider FROM oauth_accounts WHERE user_id = ?`)
      .bind(userId)
      .all<{ provider: string }>();

    return res.results.map((r) => r.provider);
  }

  async getOAuthAccounts(userId: number): Promise<OAuthAccount[]> {
    const res = await this.db
      .prepare(
        `SELECT id, user_id, provider, provider_user_id, provider_email, created_at
         FROM oauth_accounts WHERE user_id = ? ORDER BY created_at ASC`,
      )
      .bind(userId)
      .all<Record<string, unknown>>();

    return (res.results || []).map((row) => ({
      id: Number(row.id),
      user_id: Number(row.user_id),
      provider: String(row.provider),
      provider_user_id: String(row.provider_user_id),
      provider_email: row.provider_email ? String(row.provider_email) : null,
      created_at: String(row.created_at),
    }));
  }

  async findOAuthAccount(provider: string, providerUserId: string): Promise<OAuthAccount | null> {
    const row = await this.db
      .prepare(
        `SELECT id, user_id, provider, provider_user_id, provider_email, created_at
         FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?`,
      )
      .bind(provider, providerUserId)
      .first<Record<string, unknown>>();

    if (!row) return null;

    return {
      id: Number(row.id),
      user_id: Number(row.user_id),
      provider: String(row.provider),
      provider_user_id: String(row.provider_user_id),
      provider_email: row.provider_email ? String(row.provider_email) : null,
      created_at: String(row.created_at),
    };
  }

  async linkOAuthAccount(
    userId: number,
    provider: string,
    providerUserId: string,
    providerEmail: string | null,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(provider, provider_user_id) DO NOTHING`,
      )
      .bind(userId, provider, providerUserId, providerEmail)
      .run();
  }

  async unlinkOAuthAccount(userId: number, provider: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM oauth_accounts WHERE user_id = ? AND provider = ?`)
      .bind(userId, provider)
      .run();
  }

  async updateNickname(userId: number, nickname: string, updatedAt: string): Promise<User> {
    await this.db
      .prepare(
        `UPDATE users SET nickname = ?, nickname_updated_at = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(nickname, updatedAt, updatedAt, userId)
      .run();

    const updated = await this.findById(userId);
    if (!updated) {
      throw new Error(`User ${userId} not found after nickname update`);
    }
    return updated;
  }

  async updateCountry(userId: number, country: string | null, updatedAt: string): Promise<User> {
    await this.db
      .prepare(`UPDATE users SET country = ?, country_updated_at = ?, updated_at = ? WHERE id = ?`)
      .bind(country, updatedAt, updatedAt, userId)
      .run();

    const updated = await this.findById(userId);
    if (!updated) {
      throw new Error(`User ${userId} not found after country update`);
    }
    return updated;
  }

  private async getLastInsertId(): Promise<number> {
    const res = await this.db.prepare(`SELECT last_insert_rowid() as id`).first<{ id: number }>();

    return res?.id ?? 0;
  }
}
