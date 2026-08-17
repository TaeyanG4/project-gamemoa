import type { Context } from "hono";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import {
  DevMeResponseSchema,
  SandboxGameCreateRequestSchema,
  SandboxGameListResponseSchema,
  SandboxGameDetailResponseSchema,
  SandboxGameRecordSchema,
  SandboxGameVersionRecordSchema,
} from "@owogg/contracts";
import { SandboxGameUseCaseFailure } from "@owogg/core";
import type { BackblazeB2Config } from "@owogg/db";
import { createContainer } from "../container.js";
import { isTrustedAdminOrigin } from "../auth/admin.js";
import { resolveAdminEligibility } from "../auth/adminEligibility.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { SANDBOX_GAME_FAILURE_STATUS, SANDBOX_GAME_FAILURE_MESSAGE } from "./sandboxGameErrors.js";
import type { SandboxGameFailureStatus } from "./sandboxGameErrors.js";
import type { ApiEnv } from "./auth.js";

/** All five B2 values must be present or the upload path is treated as unconfigured — a partial
 * config (e.g. endpoint set but key missing) is far more likely to be a broken deploy than an
 * intentional half-setup, so it fails the same safe way as "nothing set at all". */
export function readB2Config(env: ApiEnv["Bindings"]): BackblazeB2Config | undefined {
  const { B2_ENDPOINT, B2_REGION, B2_BUCKET_NAME, B2_KEY_ID, B2_APPLICATION_KEY } = env;
  if (!B2_ENDPOINT || !B2_REGION || !B2_BUCKET_NAME || !B2_KEY_ID || !B2_APPLICATION_KEY) {
    return undefined;
  }
  return {
    endpoint: B2_ENDPOINT,
    region: B2_REGION,
    bucket: B2_BUCKET_NAME,
    keyId: B2_KEY_ID,
    applicationKey: B2_APPLICATION_KEY,
  };
}

/**
 * Developer-facing sandbox game routes — powers the settings "개발" tab's upload/manage flow.
 * Deliberately gated by plain OwOGG session + active game_developers row, NOT the elevated
 * admin step-up session (adminSession.ts) — a developer who isn't also an admin must never be
 * forced through Google step-up + admin password just to upload a game. Admin-only actions
 * (appoint developers, approve/reject, publish) live in adminGameDevelopers.ts /
 * adminSandboxGames.ts behind requireElevatedAdmin instead.
 */
export const devGamesRouter = new Hono<ApiEnv>();

devGamesRouter.use("*", async (c, next) => {
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

interface DevSession {
  userId: number;
  isGameDeveloper: boolean;
  isAdmin: boolean;
}

/** Resolves the caller's plain session + developer/admin standing in one pass. Returns null when
 * there is no valid session at all (caller responds 401); `isGameDeveloper`/`isAdmin` are false
 * rather than throwing when the session is valid but the user has neither role, so callers can
 * distinguish "not logged in" from "logged in but not allowed here". */
async function resolveDevSession(c: Context<ApiEnv>): Promise<DevSession | null> {
  const sessionId = getCookie(c, "owogg_session");
  if (!sessionId || !c.env?.DB) return null;

  const container = createContainer(c.env.DB);
  const sessionResult = await container.sessionRepo.findSession(sessionId);
  if (!sessionResult) return null;

  const userId = sessionResult.user.id;
  const [isGameDeveloper, eligibility] = await Promise.all([
    container.gameDeveloperUseCases.isActiveDeveloper(userId),
    resolveAdminEligibility(userId, c.env.ADMIN_USER_IDS, container.adminAccountUseCases),
  ]);

  return { userId, isGameDeveloper, isAdmin: eligibility.eligible };
}

function failureResponse(err: unknown): { body: unknown; status: SandboxGameFailureStatus } {
  if (!(err instanceof SandboxGameUseCaseFailure)) throw err;
  return {
    body: { error: { code: err.code, message: SANDBOX_GAME_FAILURE_MESSAGE[err.code] } },
    status: SANDBOX_GAME_FAILURE_STATUS[err.code],
  };
}

// GET /api/dev/me
devGamesRouter.get("/me", async (c) => {
  const session = await resolveDevSession(c);
  if (!session) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, 401);
  }
  return c.json(
    DevMeResponseSchema.parse({
      isGameDeveloper: session.isGameDeveloper,
      isAdmin: session.isAdmin,
    }),
    200,
  );
});

// GET /api/dev/games — the caller's own sandbox games, any review/visibility state.
devGamesRouter.get("/games", async (c) => {
  const session = await resolveDevSession(c);
  if (!session) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, 401);
  }
  const { sandboxGameUseCases } = createContainer(c.env.DB);
  const games = await sandboxGameUseCases.listMine(session.userId);
  return c.json(SandboxGameListResponseSchema.parse({ games }), 200);
});

// POST /api/dev/games — create a new catalog entry (no bundle yet).
devGamesRouter.post("/games", async (c) => {
  const session = await resolveDevSession(c);
  if (!session) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, 401);
  }
  if (!session.isGameDeveloper) {
    return c.json(
      { error: { code: "FORBIDDEN", message: "게임 제작자로 지정된 사용자만 가능합니다." } },
      403,
    );
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = SandboxGameCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: "INVALID_REQUEST", message: "slug, title, genre가 필요합니다." } },
      400,
    );
  }

  try {
    const { sandboxGameUseCases } = createContainer(c.env.DB);
    const game = await sandboxGameUseCases.createGame({
      slug: parsed.data.slug,
      developerUserId: session.userId,
      title: parsed.data.title,
      shortDescription: parsed.data.shortDescription ?? null,
      description: parsed.data.description ?? null,
      genre: parsed.data.genre,
    });
    return c.json(SandboxGameRecordSchema.parse(game), 201);
  } catch (err) {
    const { body: errBody, status } = failureResponse(err);
    return c.json(errBody, status);
  }
});

// GET /api/dev/games/:id — detail (owner or admin only).
devGamesRouter.get("/games/:id", async (c) => {
  const session = await resolveDevSession(c);
  if (!session) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, 401);
  }
  const id = Number(c.req.param("id"));
  const { sandboxGameUseCases } = createContainer(c.env.DB);
  const game = await sandboxGameUseCases.getById(id);
  if (!game) {
    return c.json({ error: { code: "GAME_NOT_FOUND", message: "존재하지 않는 게임입니다." } }, 404);
  }
  if (game.developerUserId !== session.userId && !session.isAdmin) {
    return c.json({ error: { code: "FORBIDDEN", message: "접근 권한이 없습니다." } }, 403);
  }

  const [versions, auditLog] = await Promise.all([
    sandboxGameUseCases.listVersions(id),
    sandboxGameUseCases.getReviewAudit(id),
  ]);
  return c.json(
    SandboxGameDetailResponseSchema.parse({
      game,
      versions,
      auditLog,
    }),
    200,
  );
});

// POST /api/dev/games/:id/withdraw — developer self-service withdrawal of a not-yet-decided
// submission, releasing the review slot it was holding (see SANDBOX_GAME_POLICY.
// MAX_CONCURRENT_REVIEW_SLOTS). Owner only — an admin who wants a submission gone uses
// decideVersion(REJECTED) instead, which is a real decision, not the developer's own withdrawal.
devGamesRouter.post("/games/:id/withdraw", async (c) => {
  const session = await resolveDevSession(c);
  if (!session) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, 401);
  }

  const id = Number(c.req.param("id"));
  try {
    const { sandboxGameUseCases } = createContainer(c.env.DB);
    const game = await sandboxGameUseCases.withdrawSubmission({
      gameId: id,
      actingUserId: session.userId,
    });
    return c.json(SandboxGameRecordSchema.parse(game), 200);
  } catch (err) {
    const { body: errBody, status } = failureResponse(err);
    return c.json(errBody, status);
  }
});

// POST /api/dev/games/:id/versions — multipart upload, field name "bundle". Owner or admin only.
// Rate limited on its own binding (see wrangler.jsonc GAME_UPLOAD_RATE_LIMITER) — this is a
// capacity/abuse guard against upload spam (each call costs real B2 writes + decompression CPU),
// deliberately separate from and much stricter than score-submit's RATE_LIMITER. It is NOT the
// submission-quota mechanism; that is SANDBOX_GAME_POLICY.MAX_CONCURRENT_REVIEW_SLOTS, enforced as
// a DB invariant regardless of what this middleware does.
devGamesRouter.post(
  "/games/:id/versions",
  rateLimit({ name: "game-upload", binding: "GAME_UPLOAD_RATE_LIMITER" }),
  async (c) => {
    const session = await resolveDevSession(c);
    if (!session) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, 401);
    }

    const container = createContainer(c.env.DB, readB2Config(c.env));
    if (!container.gameBundlesConfigured) {
      return c.json(
        {
          error: {
            code: "GAME_BUNDLES_NOT_CONFIGURED",
            message: "번들 저장소(Backblaze B2)가 아직 이 환경에 구성되지 않았습니다.",
          },
        },
        503,
      );
    }

    const gameId = Number(c.req.param("id"));
    let body: Record<string, string | File>;
    try {
      body = await c.req.parseBody();
    } catch {
      return c.json(
        { error: { code: "INVALID_REQUEST", message: "multipart/form-data 요청이 아닙니다." } },
        400,
      );
    }

    const bundle = body.bundle;
    if (!(bundle instanceof File)) {
      return c.json(
        { error: { code: "INVALID_REQUEST", message: "bundle 파일 필드가 필요합니다." } },
        400,
      );
    }

    try {
      const bytes = await bundle.arrayBuffer();
      const version = await container.sandboxGameUseCases.uploadVersion({
        gameId,
        actingUserId: session.userId,
        isAdmin: session.isAdmin,
        bytes,
        contentType: bundle.type || undefined,
      });
      return c.json(SandboxGameVersionRecordSchema.parse(version), 201);
    } catch (err) {
      const { body: errBody, status } = failureResponse(err);
      return c.json(errBody, status);
    }
  },
);
