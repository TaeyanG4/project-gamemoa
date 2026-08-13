import type { AdminAuthRepository, AdminSessionRecord } from "@gamemoa/core";
import type { D1Database } from "./D1UserRepository.js";
import { hashSessionToken } from "./D1SessionRepository.js";

const CLEANUP_BATCH_SIZE = 500;
/** Successful/failed admin login attempt rows older than this are opportunistically pruned. */
const LOGIN_ATTEMPT_RETENTION_MS = 24 * 60 * 60 * 1000;

function generateOpaqueToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

function mapAdminSessionRow(r: Record<string, unknown>): AdminSessionRecord {
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    createdAt: String(r.created_at),
    expiresAt: String(r.expires_at),
    revokedAt: r.revoked_at ? String(r.revoked_at) : null,
  };
}

export class D1AdminAuthRepository implements AdminAuthRepository {
  constructor(private db: D1Database) {}

  async createStepUpChallenge(input: {
    userId: number;
    googleSub: string;
    rawSessionToken: string;
    nowIso: string;
    expiresAtIso: string;
  }): Promise<{ rawToken: string }> {
    const rawToken = generateOpaqueToken();
    const tokenHash = await hashSessionToken(rawToken);
    const sessionTokenHash = await hashSessionToken(input.rawSessionToken);

    await this.db
      .prepare(
        `INSERT INTO admin_step_up_challenges
           (token_hash, user_id, google_sub, session_token_hash, created_at, expires_at, consumed_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      )
      .bind(
        tokenHash,
        input.userId,
        input.googleSub,
        sessionTokenHash,
        input.nowIso,
        input.expiresAtIso,
      )
      .run();

    return { rawToken };
  }

  async consumeStepUpChallenge(input: {
    rawToken: string;
    rawSessionToken: string;
    nowIso: string;
  }): Promise<{ userId: number; googleSub: string } | null> {
    const tokenHash = await hashSessionToken(input.rawToken);
    const row = await this.db
      .prepare(
        `SELECT id, user_id, google_sub, session_token_hash, expires_at, consumed_at
         FROM admin_step_up_challenges WHERE token_hash = ?`,
      )
      .bind(tokenHash)
      .first<Record<string, unknown>>();

    if (!row) return null;
    if (row.consumed_at) return null;
    if (String(row.expires_at) < input.nowIso) return null;

    const sessionTokenHash = await hashSessionToken(input.rawSessionToken);
    if (String(row.session_token_hash) !== sessionTokenHash) return null;

    const update = await this.db
      .prepare(
        `UPDATE admin_step_up_challenges SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL`,
      )
      .bind(input.nowIso, Number(row.id))
      .run();

    // Lost a concurrent single-use race — treat as already consumed.
    if (!update.meta?.changes) return null;

    return { userId: Number(row.user_id), googleSub: String(row.google_sub) };
  }

  async createAdminSession(input: {
    userId: number;
    rawSessionToken: string;
    nowIso: string;
    expiresAtIso: string;
  }): Promise<{ rawToken: string; session: AdminSessionRecord }> {
    const rawToken = generateOpaqueToken();
    const tokenHash = await hashSessionToken(rawToken);
    const sessionTokenHash = await hashSessionToken(input.rawSessionToken);

    await this.db
      .prepare(
        `INSERT INTO admin_sessions (token_hash, user_id, session_token_hash, created_at, expires_at, revoked_at)
         VALUES (?, ?, ?, ?, ?, NULL)`,
      )
      .bind(tokenHash, input.userId, sessionTokenHash, input.nowIso, input.expiresAtIso)
      .run();

    return {
      rawToken,
      session: {
        id: 0,
        userId: input.userId,
        createdAt: input.nowIso,
        expiresAt: input.expiresAtIso,
        revokedAt: null,
      },
    };
  }

  async findValidAdminSession(input: {
    rawToken: string;
    rawSessionToken: string;
    nowIso: string;
  }): Promise<AdminSessionRecord | null> {
    const tokenHash = await hashSessionToken(input.rawToken);
    const row = await this.db
      .prepare(`SELECT * FROM admin_sessions WHERE token_hash = ?`)
      .bind(tokenHash)
      .first<Record<string, unknown>>();

    if (!row) return null;
    if (row.revoked_at) return null;
    if (String(row.expires_at) < input.nowIso) return null;

    const sessionTokenHash = await hashSessionToken(input.rawSessionToken);
    if (String(row.session_token_hash) !== sessionTokenHash) return null;

    return mapAdminSessionRow(row);
  }

  async revokeAdminSession(rawToken: string): Promise<void> {
    const tokenHash = await hashSessionToken(rawToken);
    await this.db
      .prepare(
        `UPDATE admin_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL`,
      )
      .bind(new Date().toISOString(), tokenHash)
      .run();
  }

  async revokeAdminSessionsForSessionToken(rawSessionToken: string): Promise<void> {
    const sessionTokenHash = await hashSessionToken(rawSessionToken);
    await this.db
      .prepare(
        `UPDATE admin_sessions SET revoked_at = ? WHERE session_token_hash = ? AND revoked_at IS NULL`,
      )
      .bind(new Date().toISOString(), sessionTokenHash)
      .run();
  }

  async revokeAllAdminSessionsForUserId(userId: number): Promise<void> {
    await this.db
      .prepare(`UPDATE admin_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`)
      .bind(new Date().toISOString(), userId)
      .run();
  }

  async recordLoginAttempt(input: {
    userId: number;
    success: boolean;
    nowIso: string;
  }): Promise<void> {
    await this.db
      .prepare(`INSERT INTO admin_login_attempts (user_id, success, created_at) VALUES (?, ?, ?)`)
      .bind(input.userId, input.success ? 1 : 0, input.nowIso)
      .run();
  }

  async listRecentFailedAttempts(userId: number, sinceIso: string): Promise<number[]> {
    const res = await this.db
      .prepare(
        `SELECT created_at FROM admin_login_attempts
         WHERE user_id = ? AND success = 0 AND created_at >= ?
         ORDER BY created_at ASC`,
      )
      .bind(userId, sinceIso)
      .all<{ created_at: string }>();

    return (res.results || [])
      .map((r) => Date.parse(r.created_at))
      .filter((ms) => Number.isFinite(ms));
  }

  async cleanupExpired(nowIso: string): Promise<void> {
    const attemptCutoffIso = new Date(
      Date.parse(nowIso) - LOGIN_ATTEMPT_RETENTION_MS,
    ).toISOString();

    // Bounded per table — never an unbounded scan/delete.
    await this.db
      .prepare(
        `DELETE FROM admin_step_up_challenges WHERE id IN (
           SELECT id FROM admin_step_up_challenges WHERE expires_at < ? LIMIT ?
         )`,
      )
      .bind(nowIso, CLEANUP_BATCH_SIZE)
      .run();

    await this.db
      .prepare(
        `DELETE FROM admin_sessions WHERE id IN (
           SELECT id FROM admin_sessions WHERE expires_at < ? LIMIT ?
         )`,
      )
      .bind(nowIso, CLEANUP_BATCH_SIZE)
      .run();

    await this.db
      .prepare(
        `DELETE FROM admin_login_attempts WHERE id IN (
           SELECT id FROM admin_login_attempts WHERE created_at < ? LIMIT ?
         )`,
      )
      .bind(attemptCutoffIso, CLEANUP_BATCH_SIZE)
      .run();
  }
}
