import { Hono } from "hono";
import {
  SandboxGameReviewQueueQuerySchema,
  SandboxGameReviewQueueResponseSchema,
  SandboxGameVersionDecisionRequestSchema,
  SandboxGameVersionRecordSchema,
  SandboxGameMetadataUpdateRequestSchema,
  SandboxGameVisibilityUpdateRequestSchema,
  SandboxGameLiveVersionUpdateRequestSchema,
  SandboxGameRecordSchema,
  SandboxGameDetailResponseSchema,
} from "@owogg/contracts";
import { SandboxGameUseCaseFailure } from "@owogg/core";
import { createContainer } from "../container.js";
import { isTrustedAdminOrigin } from "../auth/admin.js";
import {
  requireElevatedAdmin,
  isElevatedAdminResponse,
  requirePermission,
} from "../auth/adminSession.js";
import { SANDBOX_GAME_FAILURE_STATUS, SANDBOX_GAME_FAILURE_MESSAGE } from "./sandboxGameErrors.js";
import type { SandboxGameFailureStatus } from "./sandboxGameErrors.js";
import { readB2Config } from "./devGames.js";
import type { ApiEnv } from "./auth.js";

/** Admin-only review/publish surface for sandbox games — approve/reject an uploaded version,
 * adjust the generalized metadata (title/description/genre/XP/score config), and flip
 * PRIVATE/PUBLIC visibility. See docs/GAME_CREATION_GUIDE.md §3.6. */
export const adminSandboxGamesRouter = new Hono<ApiEnv>();

adminSandboxGamesRouter.use("*", async (c, next) => {
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

function failureResponse(err: unknown): { body: unknown; status: SandboxGameFailureStatus } {
  if (!(err instanceof SandboxGameUseCaseFailure)) throw err;
  return {
    body: { error: { code: err.code, message: SANDBOX_GAME_FAILURE_MESSAGE[err.code] } },
    status: SANDBOX_GAME_FAILURE_STATUS[err.code],
  };
}

// GET /api/admin/sandbox-games/review-queue?page=&pageSize=
adminSandboxGamesRouter.get("/review-queue", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;
  const denied = requirePermission(admin, "sandbox_games.review");
  if (denied) return denied;

  const parsed = SandboxGameReviewQueueQuerySchema.safeParse({
    page: c.req.query("page"),
    pageSize: c.req.query("pageSize"),
  });
  if (!parsed.success) {
    return c.json(
      { error: { code: "INVALID_REQUEST", message: "잘못된 페이지 조건입니다." } },
      400,
    );
  }
  const { page, pageSize } = parsed.data;

  const { sandboxGameUseCases } = createContainer(c.env.DB);
  const { versions, total } = await sandboxGameUseCases.listPendingReview(
    pageSize,
    (page - 1) * pageSize,
  );

  // One lookup per distinct game in this page (not per version) — the review queue is a small,
  // low-traffic admin tool (pageSize capped at 100), so this stays well within a single request.
  const uniqueGameIds = [...new Set(versions.map((v) => v.gameId))];
  const games = await Promise.all(uniqueGameIds.map((id) => sandboxGameUseCases.getById(id)));
  const gameById = new Map(games.filter((g) => g !== null).map((g) => [g.id, g]));

  const entries = versions.flatMap((version) => {
    const game = gameById.get(version.gameId);
    if (!game) return []; // defensive — a game row vanishing mid-request should never happen
    return [
      {
        version,
        gameId: game.id,
        gameSlug: game.slug,
        gameTitle: game.title,
        developerUserId: game.developerUserId,
      },
    ];
  });

  return c.json(
    SandboxGameReviewQueueResponseSchema.parse({ entries, total, page, pageSize }),
    200,
  );
});

// GET /api/admin/sandbox-games/:id — full detail for the review UI.
adminSandboxGamesRouter.get("/:id", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;
  const denied = requirePermission(admin, "sandbox_games.review");
  if (denied) return denied;

  const id = Number(c.req.param("id"));
  const { sandboxGameUseCases } = createContainer(c.env.DB);
  const game = await sandboxGameUseCases.getById(id);
  if (!game) {
    return c.json({ error: { code: "GAME_NOT_FOUND", message: "존재하지 않는 게임입니다." } }, 404);
  }
  const [versions, auditLog] = await Promise.all([
    sandboxGameUseCases.listVersions(id),
    sandboxGameUseCases.getReviewAudit(id),
  ]);
  return c.json(SandboxGameDetailResponseSchema.parse({ game, versions, auditLog }), 200);
});

// POST /api/admin/sandbox-games/versions/:versionId/approve
adminSandboxGamesRouter.post("/versions/:versionId/approve", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;
  const denied = requirePermission(admin, "sandbox_games.review");
  if (denied) return denied;

  const versionId = Number(c.req.param("versionId"));
  try {
    const { sandboxGameUseCases } = createContainer(c.env.DB);
    const version = await sandboxGameUseCases.decideVersion({
      versionId,
      adminId: admin.userId,
      decision: "APPROVED",
      reason: null,
    });
    return c.json(SandboxGameVersionRecordSchema.parse(version), 200);
  } catch (err) {
    const { body, status } = failureResponse(err);
    return c.json(body, status);
  }
});

// POST /api/admin/sandbox-games/versions/:versionId/reject { reason }
adminSandboxGamesRouter.post("/versions/:versionId/reject", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;
  const denied = requirePermission(admin, "sandbox_games.review");
  if (denied) return denied;

  const versionId = Number(c.req.param("versionId"));
  const body = await c.req.json().catch(() => ({}));
  const parsed = SandboxGameVersionDecisionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "INVALID_REQUEST", message: "reason이 필요합니다." } }, 400);
  }

  try {
    const { sandboxGameUseCases } = createContainer(c.env.DB);
    const version = await sandboxGameUseCases.decideVersion({
      versionId,
      adminId: admin.userId,
      decision: "REJECTED",
      reason: parsed.data.reason ?? null,
    });
    return c.json(SandboxGameVersionRecordSchema.parse(version), 200);
  } catch (err) {
    const { body: errBody, status } = failureResponse(err);
    return c.json(errBody, status);
  }
});

// POST /api/admin/sandbox-games/versions/:versionId/republish — re-runs the publish pipeline from
// the version's stored source archive. The recovery path for a version left FAILED/PUBLISHING by a
// transient storage error, without making the developer re-upload. Idempotent (published objects
// are immutable, so rewriting stores identical bytes).
adminSandboxGamesRouter.post("/versions/:versionId/republish", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;
  const denied = requirePermission(admin, "sandbox_games.review");
  if (denied) return denied;

  const versionId = Number(c.req.param("versionId"));
  try {
    const { sandboxGameUseCases } = createContainer(c.env.DB, readB2Config(c.env));
    const version = await sandboxGameUseCases.republishVersion(versionId);
    return c.json(SandboxGameVersionRecordSchema.parse(version), 200);
  } catch (err) {
    const { body, status } = failureResponse(err);
    return c.json(body, status);
  }
});

// PATCH /api/admin/sandbox-games/:id/live-version { versionId } — rollback / roll-forward. Points
// the game at a different already-approved, already-published version. Re-uploads nothing: each
// version keeps its own immutable object prefix, so this is a single metadata update.
adminSandboxGamesRouter.patch("/:id/live-version", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;
  const denied = requirePermission(admin, "sandbox_games.review");
  if (denied) return denied;

  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const parsed = SandboxGameLiveVersionUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "INVALID_REQUEST", message: "versionId가 필요합니다." } }, 400);
  }

  try {
    const { sandboxGameUseCases } = createContainer(c.env.DB);
    const game = await sandboxGameUseCases.setLiveVersion(id, admin.userId, parsed.data.versionId);
    return c.json(SandboxGameRecordSchema.parse(game), 200);
  } catch (err) {
    const { body: errBody, status } = failureResponse(err);
    return c.json(errBody, status);
  }
});

// PATCH /api/admin/sandbox-games/:id/metadata — generalized, admin-adjustable metadata
// (title/description/genre/XP/score config), independent of any bundle re-upload.
adminSandboxGamesRouter.patch("/:id/metadata", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;
  const denied = requirePermission(admin, "sandbox_games.review");
  if (denied) return denied;

  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const parsed = SandboxGameMetadataUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "INVALID_REQUEST", message: "잘못된 메타데이터입니다." } }, 400);
  }

  try {
    const { sandboxGameUseCases } = createContainer(c.env.DB);
    const game = await sandboxGameUseCases.updateMetadata(id, admin.userId, parsed.data);
    return c.json(SandboxGameRecordSchema.parse(game), 200);
  } catch (err) {
    const { body: errBody, status } = failureResponse(err);
    return c.json(errBody, status);
  }
});

// PATCH /api/admin/sandbox-games/:id/visibility { visibility } — the actual "go live" switch.
adminSandboxGamesRouter.patch("/:id/visibility", async (c) => {
  const admin = await requireElevatedAdmin(c);
  if (isElevatedAdminResponse(admin)) return admin;
  const denied = requirePermission(admin, "sandbox_games.review");
  if (denied) return denied;

  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const parsed = SandboxGameVisibilityUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "INVALID_REQUEST", message: "visibility가 필요합니다." } }, 400);
  }

  try {
    const { sandboxGameUseCases } = createContainer(c.env.DB);
    const game = await sandboxGameUseCases.setVisibility(id, admin.userId, parsed.data.visibility);
    return c.json(SandboxGameRecordSchema.parse(game), 200);
  } catch (err) {
    const { body: errBody, status } = failureResponse(err);
    return c.json(errBody, status);
  }
});
