import type { GameDeveloperStatus, GameDeveloperAuditAction } from "../domain/gameDevelopers.js";

export interface GameDeveloperRecord {
  userId: number;
  grantedByAdminId: number;
  status: GameDeveloperStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GameDeveloperAuditEntry {
  id: number;
  targetUserId: number;
  actorAdminId: number;
  action: GameDeveloperAuditAction;
  createdAt: string;
}

/**
 * Persistence port for game-developer upload permission grants (migration 0024). One row per
 * user who has ever been granted upload access — a missing row means "never a developer", same
 * as a REVOKED row means "was a developer, no longer".
 */
export interface GameDeveloperRepository {
  findByUserId(userId: number): Promise<GameDeveloperRecord | null>;
  list(): Promise<GameDeveloperRecord[]>;
  grant(userId: number, grantedByAdminId: number, nowIso: string): Promise<GameDeveloperRecord>;
  setStatus(
    userId: number,
    status: GameDeveloperStatus,
    nowIso: string,
  ): Promise<GameDeveloperRecord>;
  appendAudit(entry: {
    targetUserId: number;
    actorAdminId: number;
    action: GameDeveloperAuditAction;
    nowIso: string;
  }): Promise<void>;
  listAudit(targetUserId: number, limit: number): Promise<GameDeveloperAuditEntry[]>;
}
