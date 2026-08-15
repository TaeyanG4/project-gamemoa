import type {
  UserModerationRepository,
  UserModerationRecord,
  UserModerationAuditEntry,
  UserModerationAction,
  UserModerationStatus,
  AdminUserSearchResult,
} from "@owogg/core";
import type { D1Database } from "./D1UserRepository.js";

function mapModerationRow(row: Record<string, unknown>): UserModerationRecord {
  return {
    userId: Number(row.user_id),
    status: String(row.status) as UserModerationStatus,
    suspendedUntil: row.suspended_until ? String(row.suspended_until) : null,
    scoreSubmissionBlocked: Number(row.score_submission_blocked) === 1,
    reason: row.reason ? String(row.reason) : null,
    updatedByAdminId: row.updated_by_admin_id === null ? null : Number(row.updated_by_admin_id),
    updatedAt: String(row.updated_at),
  };
}

export class D1UserModerationRepository implements UserModerationRepository {
  constructor(private db: D1Database) {}

  private async writeAudit(
    userId: number,
    actorAdminId: number,
    action: UserModerationAction,
    reason: string | null,
    metadata: Record<string, unknown> | null,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO user_moderation_audit_log (user_id, actor_admin_id, action, reason, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        userId,
        actorAdminId,
        action,
        reason,
        metadata ? JSON.stringify(metadata) : null,
        new Date().toISOString(),
      )
      .run();
  }

  private async upsertModeration(
    userId: number,
    fields: {
      status: UserModerationStatus;
      suspendedUntil: string | null;
      scoreSubmissionBlocked: boolean;
      reason: string | null;
      adminId: number;
    },
  ): Promise<UserModerationRecord> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO user_moderation (user_id, status, suspended_until, score_submission_blocked, reason, updated_by_admin_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           status = excluded.status,
           suspended_until = excluded.suspended_until,
           score_submission_blocked = excluded.score_submission_blocked,
           reason = excluded.reason,
           updated_by_admin_id = excluded.updated_by_admin_id,
           updated_at = excluded.updated_at`,
      )
      .bind(
        userId,
        fields.status,
        fields.suspendedUntil,
        fields.scoreSubmissionBlocked ? 1 : 0,
        fields.reason,
        fields.adminId,
        now,
      )
      .run();

    return {
      userId,
      status: fields.status,
      suspendedUntil: fields.suspendedUntil,
      scoreSubmissionBlocked: fields.scoreSubmissionBlocked,
      reason: fields.reason,
      updatedByAdminId: fields.adminId,
      updatedAt: now,
    };
  }

  async searchUsers(query: string, limit = 20): Promise<AdminUserSearchResult[]> {
    const trimmed = query.trim();
    // Numeric query also matches by exact id — an admin pasting a user id from a leaderboard row
    // is a common enough path to support directly, not just nickname substring search.
    const idMatch = /^\d+$/.test(trimmed) ? Number(trimmed) : null;

    const res = await this.db
      .prepare(
        `SELECT u.id, u.nickname, u.email, u.created_at,
                m.status, m.suspended_until, m.score_submission_blocked
         FROM users u
         LEFT JOIN user_moderation m ON m.user_id = u.id
         WHERE u.nickname LIKE ? OR u.email LIKE ? OR u.id = ?
         ORDER BY u.id ASC
         LIMIT ?`,
      )
      .bind(`%${trimmed}%`, `%${trimmed}%`, idMatch, limit)
      .all<Record<string, unknown>>();

    return (res.results || []).map((row) => ({
      id: Number(row.id),
      nickname: String(row.nickname),
      email: row.email ? String(row.email) : null,
      createdAt: String(row.created_at),
      moderationStatus: (row.status ? String(row.status) : "ACTIVE") as UserModerationStatus,
      suspendedUntil: row.suspended_until ? String(row.suspended_until) : null,
      scoreSubmissionBlocked: Number(row.score_submission_blocked ?? 0) === 1,
    }));
  }

  async getModeration(userId: number): Promise<UserModerationRecord | null> {
    const row = await this.db
      .prepare(`SELECT * FROM user_moderation WHERE user_id = ?`)
      .bind(userId)
      .first<Record<string, unknown>>();
    return row ? mapModerationRow(row) : null;
  }

  async suspendUser(
    userId: number,
    adminId: number,
    suspendedUntil: string,
    reason: string,
  ): Promise<UserModerationRecord> {
    const record = await this.upsertModeration(userId, {
      status: "SUSPENDED",
      suspendedUntil,
      scoreSubmissionBlocked: false,
      reason,
      adminId,
    });
    await this.writeAudit(userId, adminId, "SUSPENDED", reason, { suspendedUntil });
    return record;
  }

  async banUser(userId: number, adminId: number, reason: string): Promise<UserModerationRecord> {
    const record = await this.upsertModeration(userId, {
      status: "BANNED",
      suspendedUntil: null,
      scoreSubmissionBlocked: false,
      reason,
      adminId,
    });
    await this.writeAudit(userId, adminId, "BANNED", reason, null);
    return record;
  }

  async unsuspendUser(userId: number, adminId: number): Promise<UserModerationRecord> {
    const existing = await this.getModeration(userId);
    // setScoreSubmissionBlocked is a separate toggle — clearing SUSPENDED/BANNED must not
    // silently re-enable score submission if an admin had blocked it independently.
    const record = await this.upsertModeration(userId, {
      status: "ACTIVE",
      suspendedUntil: null,
      scoreSubmissionBlocked: existing?.scoreSubmissionBlocked ?? false,
      reason: null,
      adminId,
    });
    await this.writeAudit(userId, adminId, "UNSUSPENDED", null, {
      previousStatus: existing?.status ?? "ACTIVE",
    });
    return record;
  }

  async setScoreSubmissionBlocked(
    userId: number,
    adminId: number,
    blocked: boolean,
    reason: string | null,
  ): Promise<UserModerationRecord> {
    const existing = await this.getModeration(userId);
    const record = await this.upsertModeration(userId, {
      status: existing?.status ?? "ACTIVE",
      suspendedUntil: existing?.suspendedUntil ?? null,
      scoreSubmissionBlocked: blocked,
      reason: blocked ? reason : (existing?.reason ?? null),
      adminId,
    });
    await this.writeAudit(
      userId,
      adminId,
      blocked ? "SCORE_SUBMISSION_BLOCKED" : "SCORE_SUBMISSION_UNBLOCKED",
      reason,
      null,
    );
    return record;
  }

  async resetUserScores(
    userId: number,
    adminId: number,
    reason: string | null,
  ): Promise<{ affectedCount: number }> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare(
        `UPDATE scores SET deleted_at = ?, deleted_by_admin_id = ?
         WHERE user_id = ? AND deleted_at IS NULL`,
      )
      .bind(now, adminId, userId)
      .run();

    const affectedCount = Number(result.meta?.changes ?? 0);
    await this.writeAudit(userId, adminId, "SCORES_RESET", reason, { affectedCount });
    return { affectedCount };
  }

  async restoreUserScores(userId: number, adminId: number): Promise<{ restoredCount: number }> {
    const result = await this.db
      .prepare(
        `UPDATE scores SET deleted_at = NULL, deleted_by_admin_id = NULL
         WHERE user_id = ? AND deleted_at IS NOT NULL`,
      )
      .bind(userId)
      .run();

    const restoredCount = Number(result.meta?.changes ?? 0);
    await this.writeAudit(userId, adminId, "SCORES_RESTORED", null, { restoredCount });
    return { restoredCount };
  }

  async getAuditLog(userId: number, limit = 50): Promise<UserModerationAuditEntry[]> {
    const res = await this.db
      .prepare(
        `SELECT * FROM user_moderation_audit_log WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
      )
      .bind(userId, limit)
      .all<Record<string, unknown>>();

    return (res.results || []).map((row) => ({
      id: Number(row.id),
      userId: Number(row.user_id),
      actorAdminId: Number(row.actor_admin_id),
      action: String(row.action) as UserModerationAction,
      reason: row.reason ? String(row.reason) : null,
      metadata: row.metadata_json ? JSON.parse(String(row.metadata_json)) : null,
      createdAt: String(row.created_at),
    }));
  }
}
