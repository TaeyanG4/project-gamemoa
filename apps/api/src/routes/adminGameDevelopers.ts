import { Hono } from "hono";
import {
  GameDeveloperGrantRequestSchema,
  GameDeveloperListResponseSchema,
  GameDeveloperRecordSchema,
} from "@owogg/contracts";
import { GameDeveloperUseCaseFailure } from "@owogg/core";
import { createContainer } from "../container.js";
import { isTrustedAdminOrigin } from "../auth/admin.js";
import { requireElevatedAdmin, isElevatedAdminResponse } from "../auth/adminSession.js";
import type { ApiEnv } from "./auth.js";

// Admin-only management of who may upload sandbox games — see
// docs/GAME_CREATION_GUIDE.md §3.6 (V1 is invite-only, no self-serve path at all).
export const adminGameDevelopersRouter = new Hono<ApiEnv>();

adminGameDevelopersRouter.use("*", async (c, next) => {
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

const FAILURE_STATUS: Record<GameDeveloperUseCaseFailure["code"], number> = {
  USER_NOT_FOUND: 404,
  ALREADY_ACTIVE: 409,
  NOT_A_DEVELOPER: 409,
};

const FAILURE_MESSAGE: Record<GameDeveloperUseCaseFailure["code"], string> = {
  USER_NOT_FOUND: "존재하지 않는 사용자입니다.",
  ALREADY_ACTIVE: "이미 활성 상태인 게임 제작자입니다.",
  NOT_A_DEVELOPER: "게임 제작자로 지정된 적이 없거나 이미 해제된 사용자입니다.",
};

function failureResponse(err: unknown): { body: unknown; status: 404 | 409 } {
  if (!(err instanceof GameDeveloperUseCaseFailure)) throw err;
  return {
    body: { error: { code: err.code, message: FAILURE_MESSAGE[err.code] } },
    status: FAILURE_STATUS[err.code] as 404 | 409,
  };
}

// GET /api/admin/game-developers
adminGameDevelopersRouter.get("/", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;

  const { gameDeveloperUseCases } = createContainer(c.env.DB);
  const developers = await gameDeveloperUseCases.list();
  return c.json(GameDeveloperListResponseSchema.parse({ developers }), 200);
});

// POST /api/admin/game-developers { userId } — grants (or reinstates) upload permission.
adminGameDevelopersRouter.post("/", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;

  const body = await c.req.json().catch(() => ({}));
  const parsed = GameDeveloperGrantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "INVALID_REQUEST", message: "userId가 필요합니다." } }, 400);
  }

  try {
    const { gameDeveloperUseCases } = createContainer(c.env.DB);
    const record = await gameDeveloperUseCases.grant(parsed.data.userId, admin.userId);
    return c.json(GameDeveloperRecordSchema.parse(record), 200);
  } catch (err) {
    const { body: errBody, status } = failureResponse(err);
    return c.json(errBody, status);
  }
});

// POST /api/admin/game-developers/:userId/revoke
adminGameDevelopersRouter.post("/:userId/revoke", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;

  const userId = Number(c.req.param("userId"));
  try {
    const { gameDeveloperUseCases } = createContainer(c.env.DB);
    const record = await gameDeveloperUseCases.revoke(userId, admin.userId);
    return c.json(GameDeveloperRecordSchema.parse(record), 200);
  } catch (err) {
    const { body, status } = failureResponse(err);
    return c.json(body, status);
  }
});
