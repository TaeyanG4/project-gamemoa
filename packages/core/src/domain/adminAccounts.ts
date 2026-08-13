/**
 * Managed administrator account policy (pure domain constants + predicates). No D1, Hono, or
 * Web Crypto here — hashing lives in apps/api/src/auth/adminPassword.ts, persistence lives in
 * packages/db.
 *
 * ADMIN_USER_IDS (server config) remains a permanent root/break-glass eligibility boundary
 * (see domain/adminAuth.ts / isAdminUserId). This module governs the account model that becomes
 * the ONGOING administrator authority once at least one active row exists — so operators never
 * need a GitHub Secret edit to add a new administrator after the first one.
 */

export const ADMIN_ACCOUNT_ROLES = ["SUPERADMIN", "ADMIN"] as const;
export type AdminAccountRole = (typeof ADMIN_ACCOUNT_ROLES)[number];

export const ADMIN_ACCOUNT_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type AdminAccountStatus = (typeof ADMIN_ACCOUNT_STATUSES)[number];

export const ADMIN_ACCOUNT_AUDIT_ACTIONS = [
  "ADMIN_CREATED",
  "ADMIN_DISABLED",
  "ADMIN_ENABLED",
  "ROLE_CHANGED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
  "SESSIONS_REVOKED",
] as const;
export type AdminAccountAuditAction = (typeof ADMIN_ACCOUNT_AUDIT_ACTIONS)[number];

export const ADMIN_ACCOUNT_POLICY = {
  /** Baseline length only — deliberately no composition rules (usability over cosmetic strength). */
  MIN_PASSWORD_LENGTH: 12,
  MAX_PASSWORD_LENGTH: 200,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 64,
} as const;

export interface AdminPasswordPolicyInput {
  newPassword: string;
  username: string;
  /** True when `newPassword` verifies against the account's current stored hash. Passed in by
   * the caller (the route layer, which owns PBKDF2 verification) rather than computed here —
   * this keeps the policy pure and provider-agnostic. This is how a known weak temporary
   * bootstrap password gets structurally rejected as a *new* password without this module ever
   * needing to know or embed that literal value: once changed, it can never be "kept". */
  matchesCurrentPassword: boolean;
}

export interface AdminPasswordPolicyResult {
  ok: boolean;
  reason?: "TOO_SHORT" | "TOO_LONG" | "SAME_AS_USERNAME" | "SAME_AS_CURRENT";
}

/** Centralized new-admin-password policy — reused by bootstrap, self password change, and
 * SUPERADMIN password reset so the rule never drifts between entry points. */
export function evaluateAdminPasswordPolicy(
  input: AdminPasswordPolicyInput,
): AdminPasswordPolicyResult {
  const { newPassword, username, matchesCurrentPassword } = input;
  if (newPassword.length < ADMIN_ACCOUNT_POLICY.MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: "TOO_SHORT" };
  }
  if (newPassword.length > ADMIN_ACCOUNT_POLICY.MAX_PASSWORD_LENGTH) {
    return { ok: false, reason: "TOO_LONG" };
  }
  if (newPassword.toLowerCase() === username.trim().toLowerCase()) {
    return { ok: false, reason: "SAME_AS_USERNAME" };
  }
  if (matchesCurrentPassword) {
    return { ok: false, reason: "SAME_AS_CURRENT" };
  }
  return { ok: true };
}

/** A managed administrator account is only ever created for a OwOGG user who already has a
 * Google identity linked — never a freestanding credential. */
export function isValidAdminUsername(username: string): boolean {
  const trimmed = username.trim();
  return (
    trimmed.length >= ADMIN_ACCOUNT_POLICY.MIN_USERNAME_LENGTH &&
    trimmed.length <= ADMIN_ACCOUNT_POLICY.MAX_USERNAME_LENGTH &&
    /^[a-zA-Z0-9_.-]+$/.test(trimmed)
  );
}
