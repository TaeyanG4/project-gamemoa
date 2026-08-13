import { Hono } from "hono";
import { AdminOverviewResponseSchema } from "@gamemoa/contracts";
import { createContainer } from "../container.js";
import { getCreatorProviderAdapters } from "../infrastructure/creators/index.js";
import { isTrustedAdminOrigin } from "../auth/admin.js";
import { requireElevatedAdmin, isElevatedAdminResponse } from "../auth/adminSession.js";
import type { ApiEnv } from "./auth.js";

export const adminRouter = new Hono<ApiEnv>();

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

// GET /api/admin/me lives in adminAuth.ts (mounted at the same /api/admin base path) — it
// reports step-up/login state and is intentionally reachable before an elevated session exists.

// GET /api/admin/overview — sensitive review/audit summary; requires a full elevated admin
// session (ADMIN_USER_IDS alone is no longer sufficient, GET included).
adminRouter.get("/overview", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;

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
