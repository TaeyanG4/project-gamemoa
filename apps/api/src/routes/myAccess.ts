import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { MyAccessResponseSchema } from "@owogg/contracts";
import { effectivePermissions, canApplyForGameCreator } from "@owogg/core";
import { createContainer } from "../container.js";
import { resolveAdminEligibility, resolveEffectiveStaffRole } from "../auth/adminEligibility.js";
import type { ApiEnv } from "./auth.js";

export const myAccessRouter = new Hono<ApiEnv>();

myAccessRouter.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});

/**
 * GET /api/me/access — the single call the web app makes to decide what to show in the profile
 * dropdown and which route guards pass, across all three independent axes: Staff Role, Game
 * Creator program, Streamer program (see docs/AUTHORIZATION.md). Plain session auth (not the
 * elevated admin step-up session) — a non-staff user calling this just gets `staffRole: null`,
 * same as any other "am I logged in, what can I see" endpoint.
 */
myAccessRouter.get("/access", async (c) => {
  const rawSessionToken = getCookie(c, "owogg_session");
  if (!rawSessionToken) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, 401);
  }

  const container = createContainer(c.env.DB);
  const sessionResult = await container.sessionRepo.findSession(rawSessionToken);
  if (!sessionResult) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, 401);
  }
  const userId = sessionResult.user.id;

  const [eligibility, gameCreatorAccess, latestApplication, creatorProfile] = await Promise.all([
    resolveAdminEligibility(userId, c.env.ADMIN_USER_IDS, container.adminAccountUseCases),
    container.gameCreatorUseCases.getByUserId(userId),
    container.gameCreatorUseCases.getMyApplication(userId),
    container.creatorUseCases.getCreatorProfileByUserId(userId),
  ]);

  const staffRole = resolveEffectiveStaffRole(eligibility);
  const grantedPermissions = eligibility.account
    ? await container.adminAccountUseCases.listPermissions(eligibility.account.id)
    : [];

  return c.json(
    MyAccessResponseSchema.parse({
      staffRole,
      permissions: effectivePermissions(staffRole, grantedPermissions),
      gameCreator: {
        hasAccess: gameCreatorAccess?.status === "ACTIVE",
        canApply:
          gameCreatorAccess?.status !== "ACTIVE" &&
          latestApplication?.status !== "PENDING" &&
          canApplyForGameCreator(),
        applicationStatus: latestApplication?.status ?? null,
      },
      streamer: {
        isVerified: creatorProfile?.status === "VERIFIED",
      },
    }),
    200,
  );
});
