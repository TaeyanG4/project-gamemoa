import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import type { AdminAccountRecord } from "@gamemoa/core";
import { createContainer } from "../container.js";
import { resolveAdminEligibility } from "./adminEligibility.js";
import type { ApiEnv } from "../routes/auth.js";

export interface ElevatedAdmin {
  userId: number;
  rawSessionToken: string;
  /** Non-null only for a managed (D1 admin_accounts) administrator; null for a legacy
   * ADMIN_USER_IDS/env-credential admin with no managed account row. */
  account: AdminAccountRecord | null;
}

/**
 * Full admin authorization chain for every protected `/api/admin/*` endpoint (GET included —
 * review data is sensitive). ADMIN_USER_IDS alone is never sufficient after this migration:
 *
 *   1. valid GAMEMOA session (gamemoa_session)
 *   2. session user.id is eligible: ADMIN_USER_IDS (root) OR an ACTIVE managed admin_accounts row
 *   3. a valid, unexpired, unrevoked admin session (gamemoa_admin_session) bound to this exact
 *      underlying session token
 *   4. (unless `allowPasswordChangeRequired`) the managed account, if any, does not still have a
 *      forced password change pending — sensitive admin functions stay locked until it's cleared
 *
 * Returns a Response to send as-is on any failure, or the elevated admin identity on success.
 */
export async function requireElevatedAdmin(
  c: Context<ApiEnv>,
  options: { allowPasswordChangeRequired?: boolean } = {},
): Promise<Response | ElevatedAdmin> {
  const rawSessionToken = getCookie(c, "gamemoa_session");
  if (!rawSessionToken) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }

  const container = createContainer(c.env.DB);
  const sessionResult = await container.sessionRepo.findSession(rawSessionToken);
  if (!sessionResult) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }

  const userId = sessionResult.user.id;
  const { eligible, account } = await resolveAdminEligibility(
    userId,
    c.env.ADMIN_USER_IDS,
    container.adminAccountUseCases,
  );
  if (!eligible) {
    return c.json({ error: { code: "FORBIDDEN", message: "관리자 권한이 필요합니다." } }, 403);
  }

  const rawAdminSessionToken = getCookie(c, "gamemoa_admin_session");
  const adminSession = await container.adminAuthUseCases.validateAdminSession({
    rawToken: rawAdminSessionToken,
    rawSessionToken,
  });
  if (!adminSession) {
    return c.json(
      {
        error: {
          code: "ADMIN_SESSION_REQUIRED",
          message: "관리자 로그인이 필요합니다.",
        },
      },
      403,
    );
  }

  if (!options.allowPasswordChangeRequired && account?.mustChangePassword) {
    return c.json(
      {
        error: {
          code: "PASSWORD_CHANGE_REQUIRED",
          message: "관리자 비밀번호를 변경해주세요.",
        },
      },
      403,
    );
  }

  return { userId, rawSessionToken, account };
}

export function isElevatedAdminResponse(value: Response | ElevatedAdmin): value is Response {
  return value instanceof Response;
}
