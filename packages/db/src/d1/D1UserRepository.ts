import type { User, UserRepository } from "@gamemoa/core";

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
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

  private async getLastInsertId(): Promise<number> {
    const res = await this.db.prepare(`SELECT last_insert_rowid() as id`).first<{ id: number }>();

    return res?.id ?? 0;
  }
}
