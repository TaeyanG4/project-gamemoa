import type { Session, SessionRepository, User } from "@gamemoa/core";
import type { D1Database } from "./D1UserRepository.js";

export class D1SessionRepository implements SessionRepository {
  constructor(private db: D1Database) {}

  async createSession(userId: number, ttlDays = 30): Promise<Session> {
    const sessionId = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    await this.db
      .prepare(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`)
      .bind(sessionId, userId, createdAt, expiresAt)
      .run();

    return {
      id: sessionId,
      user_id: userId,
      created_at: createdAt,
      expires_at: expiresAt,
    };
  }

  async findSession(sessionId: string): Promise<{ session: Session; user: User } | null> {
    const row = await this.db
      .prepare(
        `SELECT s.id as session_id, s.user_id, s.created_at as session_created_at, s.expires_at,
                u.id as user_id, u.nickname, u.email, u.avatar_url, u.created_at as user_created_at, u.updated_at
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = ?`
      )
      .bind(sessionId)
      .first<Record<string, unknown>>();

    if (!row) return null;

    const now = new Date().toISOString();
    if (String(row.expires_at) < now) {
      await this.deleteSession(sessionId);
      return null;
    }

    const userId = Number(row.user_id);
    const providersRes = await this.db
      .prepare(`SELECT provider FROM oauth_accounts WHERE user_id = ?`)
      .bind(userId)
      .all<{ provider: string }>();

    const providers = providersRes.results.map((r) => r.provider);

    return {
      session: {
        id: String(row.session_id),
        user_id: userId,
        created_at: String(row.session_created_at),
        expires_at: String(row.expires_at),
      },
      user: {
        id: userId,
        nickname: String(row.nickname),
        email: row.email ? String(row.email) : null,
        avatar_url: row.avatar_url ? String(row.avatar_url) : null,
        created_at: String(row.user_created_at),
        updated_at: String(row.updated_at),
        providers,
      },
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
  }
}
