import type {
  AdminAccountRole,
  AdminAccountStatus,
  AdminAccountAuditAction,
} from "../domain/adminAccounts.js";

export interface AdminAccountRecord {
  id: number;
  userId: number;
  googleSub: string;
  username: string;
  passwordHash: string;
  role: AdminAccountRole;
  status: AdminAccountStatus;
  mustChangePassword: boolean;
  createdByAdminId: number | null;
  createdAt: string;
  updatedAt: string;
  passwordChangedAt: string;
}

export interface AdminAccountAuditEntry {
  id: number;
  actorAdminId: number | null;
  targetAdminId: number | null;
  action: AdminAccountAuditAction;
  /** Safe structured metadata only — never a plaintext password, hash, session token, or Google
   * token. See migration 0016 comment. */
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Persistence port for managed administrator accounts (migration 0016). Uniqueness on
 * (user_id), (google_sub), (username) is enforced at the DB layer; callers should still check
 * proactively to return a specific, safe conflict reason rather than a raw constraint error.
 */
export interface AdminAccountRepository {
  countActive(): Promise<number>;
  countActiveByRole(role: AdminAccountRole): Promise<number>;
  findById(id: number): Promise<AdminAccountRecord | null>;
  findByUserId(userId: number): Promise<AdminAccountRecord | null>;
  findByUsername(username: string): Promise<AdminAccountRecord | null>;
  findByGoogleSub(googleSub: string): Promise<AdminAccountRecord | null>;
  list(): Promise<AdminAccountRecord[]>;

  create(input: {
    userId: number;
    googleSub: string;
    username: string;
    passwordHash: string;
    role: AdminAccountRole;
    mustChangePassword: boolean;
    createdByAdminId: number | null;
    nowIso: string;
  }): Promise<AdminAccountRecord>;

  updateRole(id: number, role: AdminAccountRole, nowIso: string): Promise<void>;
  updateStatus(id: number, status: AdminAccountStatus, nowIso: string): Promise<void>;
  updatePassword(
    id: number,
    passwordHash: string,
    mustChangePassword: boolean,
    nowIso: string,
  ): Promise<void>;

  appendAudit(entry: {
    actorAdminId: number | null;
    targetAdminId: number | null;
    action: AdminAccountAuditAction;
    metadata: Record<string, unknown> | null;
    nowIso: string;
  }): Promise<void>;

  listAudit(limit: number): Promise<AdminAccountAuditEntry[]>;
}
