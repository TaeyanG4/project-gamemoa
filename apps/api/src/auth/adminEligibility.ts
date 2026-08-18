import type { AdminAccountUseCases, AdminAccountRecord, StaffRole } from "@owogg/core";
import { isAdminUserId } from "./admin.js";

export interface AdminEligibilityResult {
  eligible: boolean;
  /** Non-null only when the user has a managed admin_accounts row (regardless of status). */
  account: AdminAccountRecord | null;
  /** True when eligibility came from ADMIN_USER_IDS (root/break-glass), independent of whether a
   * managed account also exists. Callers use this to assign the top Staff Role to a root-only
   * admin who hasn't bootstrapped (or been given) a managed account row yet — see
   * resolveEffectiveStaffRole. */
  isRootEligible: boolean;
}

/**
 * Root/ongoing eligibility resolution. ADMIN_USER_IDS remains a permanent root/break-glass path.
 * Once a user has an ACTIVE managed admin_accounts row, that alone also grants eligibility —
 * this is what lets an ADMIN add a new administrator without ever touching GitHub
 * Secrets/Variables. The managed account (if any) is always looked up, root-eligible or not, so
 * callers can read mustChangePassword/role regardless of which path granted access.
 */
export async function resolveAdminEligibility(
  userId: number,
  adminUserIdsEnv: string | undefined,
  adminAccountUseCases: AdminAccountUseCases,
): Promise<AdminEligibilityResult> {
  const account = await adminAccountUseCases.getByUserId(userId);
  const isRootEligible = isAdminUserId(userId, adminUserIdsEnv);
  const eligible = isRootEligible || account?.status === "ACTIVE";
  return { eligible, account, isRootEligible };
}

/**
 * The Staff Role (see domain/staffRoles.ts) an eligible admin is acting as. ADMIN_USER_IDS is
 * explicitly a "protected/bootstrap/recovery admin identity" (never a lesser tier) — a root-only
 * admin with no managed account row yet (e.g. before the first bootstrap, or a second
 * ADMIN_USER_IDS entry who never bootstrapped their own managed account) resolves to the top
 * Staff Role, same as a managed ADMIN row. A managed account's own role always wins when one
 * exists, so an operator/moderator/system-developer who ALSO happens to be listed in
 * ADMIN_USER_IDS still acts at their assigned (lower) role day to day — root eligibility is a
 * ceiling/recovery path, not a silent promotion.
 */
export function resolveEffectiveStaffRole(result: AdminEligibilityResult): StaffRole | null {
  if (result.account) return result.account.role;
  if (result.isRootEligible) return "ADMIN";
  return null;
}
