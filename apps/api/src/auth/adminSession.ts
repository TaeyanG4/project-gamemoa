import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { createContainer } from "../container.js";
import { isAdminUserId } from "./admin.js";
import type { ApiEnv } from "../routes/auth.js";

export interface ElevatedAdmin {
  userId: number;
  rawSessionToken: string;
}

/**
 * Full admin authorization chain for every protected `/api/admin/*` endpoint (GET included —
 * review data is sensitive). ADMIN_USER_IDS alone is never sufficient after this migration:
 *
 *   1. valid GAMEMOA session (gamemoa_session)
 *   2. session user.id ∈ ADMIN_USER_IDS (root eligibility)
 *   3. a valid, unexpired, unrevoked admin session (gamemoa_admin_session) bound to this exact
 *      underlying session token
 *
 * Returns a Response to send as-is on any failure, or the elevated admin identity on success.
 */
export async function requireElevatedAdmin(c: Context<ApiEnv>): Promise<Response | ElevatedAdmin> {
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
  if (!isAdminUserId(userId, c.env.ADMIN_USER_IDS)) {
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

  return { userId, rawSessionToken };
}

export function isElevatedAdminResponse(value: Response | ElevatedAdmin): value is Response {
  return value instanceof Response;
}
