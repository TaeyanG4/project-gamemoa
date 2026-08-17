import type {
  GameDeveloperRepository,
  GameDeveloperRecord,
  GameDeveloperAuditEntry,
} from "@owogg/core";
import type { GameDeveloperStatus, GameDeveloperAuditAction } from "@owogg/core";
import type { D1Database } from "./D1UserRepository.js";

function mapRow(row: Record<string, unknown>): GameDeveloperRecord {
  return {
    userId: Number(row.user_id),
    grantedByAdminId: Number(row.granted_by_admin_id),
    status: row.status as GameDeveloperStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapAuditRow(row: Record<string, unknown>): GameDeveloperAuditEntry {
  return {
    id: Number(row.id),
    targetUserId: Number(row.target_user_id),
    actorAdminId: Number(row.actor_admin_id),
    action: row.action as GameDeveloperAuditAction,
    createdAt: String(row.created_at),
  };
}

export class D1GameDeveloperRepository implements GameDeveloperRepository {
  constructor(private db: D1Database) {}

  async findByUserId(userId: number): Promise<GameDeveloperRecord | null> {
    const row = await this.db
      .prepare(`SELECT * FROM game_developers WHERE user_id = ?`)
      .bind(userId)
      .first<Record<string, unknown>>();
    return row ? mapRow(row) : null;
  }

  async list(): Promise<GameDeveloperRecord[]> {
    const res = await this.db
      .prepare(`SELECT * FROM game_developers ORDER BY created_at ASC`)
      .all<Record<string, unknown>>();
    return (res.results || []).map(mapRow);
  }

  async grant(
    userId: number,
    grantedByAdminId: number,
    nowIso: string,
  ): Promise<GameDeveloperRecord> {
    await this.db
      .prepare(
        `INSERT INTO game_developers (user_id, granted_by_admin_id, status, created_at, updated_at)
         VALUES (?, ?, 'ACTIVE', ?, ?)`,
      )
      .bind(userId, grantedByAdminId, nowIso, nowIso)
      .run();
    return {
      userId,
      grantedByAdminId,
      status: "ACTIVE",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  async setStatus(
    userId: number,
    status: GameDeveloperStatus,
    nowIso: string,
  ): Promise<GameDeveloperRecord> {
    await this.db
      .prepare(`UPDATE game_developers SET status = ?, updated_at = ? WHERE user_id = ?`)
      .bind(status, nowIso, userId)
      .run();
    const record = await this.findByUserId(userId);
    if (!record) throw new Error(`game_developers row for user ${userId} vanished mid-update`);
    return record;
  }

  async appendAudit(entry: {
    targetUserId: number;
    actorAdminId: number;
    action: GameDeveloperAuditAction;
    nowIso: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO game_developer_audit_log (target_user_id, actor_admin_id, action, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(entry.targetUserId, entry.actorAdminId, entry.action, entry.nowIso)
      .run();
  }

  async listAudit(targetUserId: number, limit = 50): Promise<GameDeveloperAuditEntry[]> {
    const res = await this.db
      .prepare(
        `SELECT * FROM game_developer_audit_log WHERE target_user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
      )
      .bind(targetUserId, limit)
      .all<Record<string, unknown>>();
    return (res.results || []).map(mapAuditRow);
  }
}
