import type { AdminAccountUseCases, AdminAccountRecord } from "@owogg/core";
import { isAdminUserId } from "./admin.js";

export interface AdminEligibilityResult {
  eligible: boolean;
  /** Non-null only when the user has a managed admin_accounts row (regardless of status). */
  account: AdminAccountRecord | null;
}

/**
 * Root/ongoing eligibility resolution. ADMIN_USER_IDS remains a permanent root/break-glass path.
 * Once a user has an ACTIVE managed admin_accounts row, that alone also grants eligibility —
 * this is what lets a SUPERADMIN add a new administrator without ever touching GitHub
 * Secrets/Variables. The managed account (if any) is always looked up, root-eligible or not, so
 * callers can read mustChangePassword/role regardless of which path granted access.
 */
export async function resolveAdminEligibility(
  userId: number,
  adminUserIdsEnv: string | undefined,
  adminAccountUseCases: AdminAccountUseCases,
): Promise<AdminEligibilityResult> {
  const account = await adminAccountUseCases.getByUserId(userId);
  const eligible = isAdminUserId(userId, adminUserIdsEnv) || account?.status === "ACTIVE";
  return { eligible, account };
}
