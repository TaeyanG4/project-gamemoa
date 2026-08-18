import { Hono } from "hono";
import { AdminGameListResponseSchema, AdminGameToggleRequestSchema } from "@owogg/contracts";
import { createContainer } from "../container.js";
import { isTrustedAdminOrigin } from "../auth/admin.js";
import {
  requireElevatedAdmin,
  isElevatedAdminResponse,
  requirePermission,
} from "../auth/adminSession.js";
import type { ApiEnv } from "./auth.js";

export const adminGamesRouter = new Hono<ApiEnv>();

adminGamesRouter.use("*", async (c, next) => {
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

// GET /api/admin/games — every known game merged with its live enable/disable override.
adminGamesRouter.get("/", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;
  const denied = requirePermission(admin, "games.moderate");
  if (denied) return denied;

  const { gameSettingsUseCases } = createContainer(c.env.DB);
  const games = await gameSettingsUseCases.listAll();

  return c.json(AdminGameListResponseSchema.parse({ games }), 200);
});

// POST /api/admin/games/:gameId/toggle — enable/disable a game without a deploy. Disabling also
// rejects new score submissions for it (see scores.ts) — this is a real kill switch, not just a
// catalog-visibility flag.
adminGamesRouter.post("/:gameId/toggle", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;
  const denied = requirePermission(admin, "games.moderate");
  if (denied) return denied;

  const gameId = c.req.param("gameId");

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: { code: "INVALID_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      400,
    );
  }
  const parsed = AdminGameToggleRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "INVALID_REQUEST", message: "enabled 값이 필요합니다." } }, 400);
  }

  const { gameSettingsUseCases } = createContainer(c.env.DB);
  const result = await gameSettingsUseCases.setEnabled(
    gameId,
    parsed.data.enabled,
    parsed.data.reason ?? null,
    admin.userId,
  );

  if (!result.ok) {
    return c.json({ error: { code: result.code, message: "존재하지 않는 게임입니다." } }, 404);
  }

  return c.json(
    {
      gameId: result.record.gameId,
      enabled: result.record.enabled,
      disabledReason: result.record.disabledReason,
    },
    200,
  );
});
