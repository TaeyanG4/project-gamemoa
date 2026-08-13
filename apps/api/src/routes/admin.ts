import { Hono } from "hono";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { AdminMeResponseSchema, AdminOverviewResponseSchema } from "@gamemoa/contracts";
import { createContainer } from "../container.js";
import { getCreatorProviderAdapters } from "../infrastructure/creators/index.js";
import { isAdminUserId, isTrustedAdminOrigin } from "../auth/admin.js";
import type { ApiEnv } from "./auth.js";

export const adminRouter = new Hono<ApiEnv>();

async function getSessionUser(c: Context<ApiEnv>): Promise<{ id: number } | null> {
  const sessionId = getCookie(c, "gamemoa_session");
  if (!sessionId) return null;
  const { sessionRepo } = createContainer(c.env.DB);
  const result = await sessionRepo.findSession(sessionId);
  return result ? { id: result.user.id } : null;
}

function isResponse(value: Response | { id: number }): value is Response {
  return value instanceof Response;
}

async function requireAdmin(c: Context<ApiEnv>): Promise<Response | { id: number }> {
  const user = await getSessionUser(c);
  if (!user) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }
  if (!isAdminUserId(user.id, c.env.ADMIN_USER_IDS)) {
    return c.json({ error: { code: "FORBIDDEN", message: "관리자 권한이 필요합니다." } }, 403);
  }
  return user;
}

adminRouter.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (["POST", "PUT", "PATCH", "DELETE"].includes(c.req.method.toUpperCase())) {
    if (!isTrustedAdminOrigin(c.req.header("Origin"), c.env.FRONTEND_URL)) {
      return c.json(
        { error: { code: "FORBIDDEN", message: "요청 출처를 확인할 수 없습니다." } },
        403,
      );
    }
  }
  await next();
});

// GET /api/admin/me — frontend discoverability only; ADMIN_USER_IDS is never returned.
adminRouter.get("/me", async (c) => {
  const user = await getSessionUser(c);
  const response = AdminMeResponseSchema.parse({
    authenticated: Boolean(user),
    admin: Boolean(user && isAdminUserId(user.id, c.env.ADMIN_USER_IDS)),
  });
  return c.json(response);
});

// GET /api/admin/overview — bounded, non-secret information for the Admin Home.
adminRouter.get("/overview", async (c) => {
  const admin = await requireAdmin(c);
  if (isResponse(admin)) return admin;

  const container = createContainer(c.env.DB);
  const [reviewData, activeGuildCount] = await Promise.all([
    container.creatorUseCases.listManualCreatorReviews({ limit: 1, offset: 0 }),
    container.discordGuildRepo.getActiveGuildCount(),
  ]);
  const adapters = getCreatorProviderAdapters(c.env);

  const response = AdminOverviewResponseSchema.parse({
    pendingCreatorReviews: reviewData.total,
    recentAudits: reviewData.audits.entries.slice(0, 5).map((audit) => ({
      action: audit.action,
      platform: audit.platform ?? null,
      createdAt: audit.createdAt,
    })),
    discord: {
      interactionsConfigured: Boolean(c.env.DISCORD_PUBLIC_KEY),
      activeGuildCount,
    },
    creatorProviders: {
      YOUTUBE: adapters.YOUTUBE.isConfigured(),
      TWITCH: adapters.TWITCH.isConfigured(),
      CHZZK: adapters.CHZZK.isConfigured(),
      SOOP: adapters.SOOP.isConfigured(),
    },
  });
  return c.json(response);
});
