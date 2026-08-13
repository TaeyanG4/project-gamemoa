import type { AdminAccountRole, AdminAccountStatus } from "../domain/adminAccounts.js";
import type {
  AdminAccountRecord,
  AdminAccountAuditEntry,
  AdminAccountRepository,
} from "../ports/adminAccounts.js";
import type { AdminAuthRepository } from "../ports/adminAuth.js";

export type AdminAccountUseCaseError =
  | "ALREADY_BOOTSTRAPPED"
  | "USERNAME_TAKEN"
  | "USER_ALREADY_ADMIN"
  | "GOOGLE_SUB_ALREADY_ADMIN"
  | "NOT_FOUND"
  | "LAST_SUPERADMIN";

export class AdminAccountUseCaseFailure extends Error {
  constructor(public readonly code: AdminAccountUseCaseError) {
    super(code);
  }
}

/**
 * Orchestrates the managed administrator account model on top of AdminAccountRepository.
 * Password hashing/verification (Web Crypto PBKDF2) is intentionally NOT done here — the route
 * layer computes/verifies password hashes (see apps/api/src/auth/adminPassword.ts) and passes
 * the resulting hash string in, exactly like the existing AdminAuthUseCases split.
 */
export class AdminAccountUseCases {
  constructor(
    private repo: AdminAccountRepository,
    private authRepo: AdminAuthRepository,
  ) {}

  async getByUserId(userId: number): Promise<AdminAccountRecord | null> {
    return this.repo.findByUserId(userId);
  }

  async getById(id: number): Promise<AdminAccountRecord | null> {
    return this.repo.findById(id);
  }

  async getByUsername(username: string): Promise<AdminAccountRecord | null> {
    return this.repo.findByUsername(username);
  }

  async hasAnyActiveAccount(): Promise<boolean> {
    return (await this.repo.countActive()) > 0;
  }

  async list(): Promise<AdminAccountRecord[]> {
    return this.repo.list();
  }

  async listAudit(limit = 100): Promise<AdminAccountAuditEntry[]> {
    return this.repo.listAudit(limit);
  }

  /** First-admin bootstrap: only ever succeeds while zero active admin accounts exist anywhere.
   * The caller (route layer) is responsible for having already verified: root eligibility
   * (ADMIN_USER_IDS), a fresh Google step-up, and that the step-up's googleSub is the one linked
   * to this exact GAMEMOA user. */
  async bootstrapFirstSuperadmin(input: {
    userId: number;
    googleSub: string;
    username: string;
    passwordHash: string;
    now?: Date;
  }): Promise<AdminAccountRecord> {
    if (await this.hasAnyActiveAccount()) {
      throw new AdminAccountUseCaseFailure("ALREADY_BOOTSTRAPPED");
    }
    const nowIso = (input.now ?? new Date()).toISOString();
    const account = await this.createAccountInternal({
      userId: input.userId,
      googleSub: input.googleSub,
      username: input.username,
      passwordHash: input.passwordHash,
      role: "SUPERADMIN",
      mustChangePassword: true,
      createdByAdminId: null,
      nowIso,
    });
    await this.repo.appendAudit({
      actorAdminId: null,
      targetAdminId: account.id,
      action: "ADMIN_CREATED",
      metadata: { role: "SUPERADMIN", via: "bootstrap" },
      nowIso,
    });
    return account;
  }

  /** SUPERADMIN-only: create another administrator bound to an existing GAMEMOA user + their
   * already-linked Google identity. */
  async createAdmin(input: {
    actorAdminId: number;
    userId: number;
    googleSub: string;
    username: string;
    passwordHash: string;
    role: AdminAccountRole;
    now?: Date;
  }): Promise<AdminAccountRecord> {
    const nowIso = (input.now ?? new Date()).toISOString();
    const account = await this.createAccountInternal({
      userId: input.userId,
      googleSub: input.googleSub,
      username: input.username,
      passwordHash: input.passwordHash,
      role: input.role,
      mustChangePassword: true,
      createdByAdminId: input.actorAdminId,
      nowIso,
    });
    await this.repo.appendAudit({
      actorAdminId: input.actorAdminId,
      targetAdminId: account.id,
      action: "ADMIN_CREATED",
      metadata: { role: input.role },
      nowIso,
    });
    return account;
  }

  private async createAccountInternal(input: {
    userId: number;
    googleSub: string;
    username: string;
    passwordHash: string;
    role: AdminAccountRole;
    mustChangePassword: boolean;
    createdByAdminId: number | null;
    nowIso: string;
  }): Promise<AdminAccountRecord> {
    if (await this.repo.findByUserId(input.userId))
      throw new AdminAccountUseCaseFailure("USER_ALREADY_ADMIN");
    if (await this.repo.findByUsername(input.username))
      throw new AdminAccountUseCaseFailure("USERNAME_TAKEN");
    if (await this.repo.findByGoogleSub(input.googleSub))
      throw new AdminAccountUseCaseFailure("GOOGLE_SUB_ALREADY_ADMIN");

    return this.repo.create({
      userId: input.userId,
      googleSub: input.googleSub,
      username: input.username,
      passwordHash: input.passwordHash,
      role: input.role,
      mustChangePassword: input.mustChangePassword,
      createdByAdminId: input.createdByAdminId,
      nowIso: input.nowIso,
    });
  }

  /** Self password change: updates the hash, clears must_change_password, and revokes every
   * other admin session for this account so the change takes effect everywhere immediately. */
  async changeOwnPassword(input: {
    accountId: number;
    userId: number;
    newPasswordHash: string;
    now?: Date;
  }): Promise<void> {
    const nowIso = (input.now ?? new Date()).toISOString();
    await this.repo.updatePassword(input.accountId, input.newPasswordHash, false, nowIso);
    await this.authRepo.revokeAllAdminSessionsForUserId(input.userId);
    await this.repo.appendAudit({
      actorAdminId: input.accountId,
      targetAdminId: input.accountId,
      action: "PASSWORD_CHANGED",
      metadata: null,
      nowIso,
    });
  }

  /** SUPERADMIN resets another administrator's password to an operator-supplied temporary value
   * — always forces a change on next login and revokes that admin's existing sessions. */
  async resetPassword(input: {
    actorAdminId: number;
    targetAdminId: number;
    newPasswordHash: string;
    now?: Date;
  }): Promise<void> {
    const target = await this.repo.findById(input.targetAdminId);
    if (!target) throw new AdminAccountUseCaseFailure("NOT_FOUND");
    const nowIso = (input.now ?? new Date()).toISOString();
    await this.repo.updatePassword(input.targetAdminId, input.newPasswordHash, true, nowIso);
    await this.authRepo.revokeAllAdminSessionsForUserId(target.userId);
    await this.repo.appendAudit({
      actorAdminId: input.actorAdminId,
      targetAdminId: input.targetAdminId,
      action: "PASSWORD_RESET",
      metadata: null,
      nowIso,
    });
  }

  async setStatus(input: {
    actorAdminId: number;
    targetAdminId: number;
    status: AdminAccountStatus;
    now?: Date;
  }): Promise<void> {
    const target = await this.repo.findById(input.targetAdminId);
    if (!target) throw new AdminAccountUseCaseFailure("NOT_FOUND");

    if (input.status === "DISABLED" && target.role === "SUPERADMIN") {
      await this.assertNotLastActiveSuperadmin(target);
    }

    const nowIso = (input.now ?? new Date()).toISOString();
    await this.repo.updateStatus(input.targetAdminId, input.status, nowIso);
    if (input.status === "DISABLED") {
      await this.authRepo.revokeAllAdminSessionsForUserId(target.userId);
    }
    await this.repo.appendAudit({
      actorAdminId: input.actorAdminId,
      targetAdminId: input.targetAdminId,
      action: input.status === "DISABLED" ? "ADMIN_DISABLED" : "ADMIN_ENABLED",
      metadata: null,
      nowIso,
    });
  }

  async setRole(input: {
    actorAdminId: number;
    targetAdminId: number;
    role: AdminAccountRole;
    now?: Date;
  }): Promise<void> {
    const target = await this.repo.findById(input.targetAdminId);
    if (!target) throw new AdminAccountUseCaseFailure("NOT_FOUND");

    if (target.role === "SUPERADMIN" && input.role === "ADMIN") {
      await this.assertNotLastActiveSuperadmin(target);
    }

    const nowIso = (input.now ?? new Date()).toISOString();
    await this.repo.updateRole(input.targetAdminId, input.role, nowIso);
    await this.repo.appendAudit({
      actorAdminId: input.actorAdminId,
      targetAdminId: input.targetAdminId,
      action: "ROLE_CHANGED",
      metadata: { from: target.role, to: input.role },
      nowIso,
    });
  }

  async revokeSessions(input: {
    actorAdminId: number;
    targetAdminId: number;
    now?: Date;
  }): Promise<void> {
    const target = await this.repo.findById(input.targetAdminId);
    if (!target) throw new AdminAccountUseCaseFailure("NOT_FOUND");
    await this.authRepo.revokeAllAdminSessionsForUserId(target.userId);
    await this.repo.appendAudit({
      actorAdminId: input.actorAdminId,
      targetAdminId: input.targetAdminId,
      action: "SESSIONS_REVOKED",
      metadata: null,
      nowIso: (input.now ?? new Date()).toISOString(),
    });
  }

  /** Never allow the last active SUPERADMIN to be disabled or demoted — that would permanently
   * lock managed administration (short of the ADMIN_USER_IDS break-glass path). */
  private async assertNotLastActiveSuperadmin(target: AdminAccountRecord): Promise<void> {
    if (target.status !== "ACTIVE") return; // already inactive — not "the" active one
    const activeSuperadmins = await this.repo.countActiveByRole("SUPERADMIN");
    if (activeSuperadmins <= 1) throw new AdminAccountUseCaseFailure("LAST_SUPERADMIN");
  }
}
