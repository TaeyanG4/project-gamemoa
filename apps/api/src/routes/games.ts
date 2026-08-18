import { Hono } from "hono";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import {
  CreatorScoreAcceptRequestSchema,
  CreatorScoreAcceptResponseSchema,
  GameSessionResponseSchema,
  PublicGameAvailabilityResponseSchema,
  PublicGameListResponseSchema,
  PublicGameSchema,
  SandboxGamePublicDetailSchema,
  SandboxGamePublicListResponseSchema,
} from "@owogg/contracts";
import {
  GAME_SESSION_POLICY,
  mergePublicGames,
  resolvePublicGame,
  signGameSession,
  toPublicCreatorGame,
  type CreatorScoreAcceptError,
  type GameSessionPayload,
} from "@owogg/core";
import { createContainer } from "../container.js";
import { edgeCache } from "../middleware/edgeCache.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { readB2Config } from "./devGames.js";
import type { ApiEnv } from "./auth.js";

// Same local requireAuth as creators.ts/discordGuilds.ts — not shared from auth.ts, matching this
// codebase's existing per-route-file convention rather than introducing a shared import for it.
async function requireAuth(
  c: Context<ApiEnv>,
): Promise<{ userId: number; user: { id: number; nickname: string } } | null> {
  const sessionId = getCookie(c, "owogg_session");
  if (!sessionId) return null;
  const { sessionRepo } = createContainer(c.env.DB);
  const result = await sessionRepo.findSession(sessionId);
  if (!result) return null;
  return { userId: result.user.id, user: { id: result.user.id, nickname: result.user.nickname } };
}

export const gamesRouter = new Hono<ApiEnv>();

// GET /api/games/availability — public, no auth. Just the set of game_ids an admin has
// explicitly disabled, so the web catalog/gameplay screen can filter/block without exposing who
// disabled a game or why (that detail is admin-only, see adminGames.ts).
//
// Edge-cached (60s). This fires on essentially every catalog/gameplay page load, so uncached it
// would be one of the highest-volume D1 reads in the app despite the answer being identical for
// everyone and changing only when an admin flips a switch. The kill switch stays effective
// because POST /api/scores re-checks the disabled set against D1 directly on submission — the
// cache only ever delays the catalog *display* update by up to a minute, never the enforcement.
gamesRouter.get("/availability", edgeCache({ ttlSeconds: 60 }), async (c) => {
  if (!c.env?.DB) {
    return c.json(PublicGameAvailabilityResponseSchema.parse({ disabledGameIds: [] }), 200);
  }

  const { gameSettingsUseCases } = createContainer(c.env.DB);
  const disabledGameIds = await gameSettingsUseCases.getDisabledGameIds();

  return c.json(PublicGameAvailabilityResponseSchema.parse({ disabledGameIds }), 200);
});

// GET /api/games/sandbox/:slug — public, no auth. The one piece of sandbox-game metadata a
// player-facing page needs (title/description/genre) before they hit PLAY, without exposing
// anything review/publish-internal. Reuses resolveLiveVersion — the exact same PUBLIC +
// live-version gate the actual bundle-serving routes use (apps/api/src/routes/gameServing.ts) —
// so this can never say "found" for a game a player couldn't actually then go play. Same
// can't-distinguish-unknown-from-private 404 shape as everywhere else in the sandbox game surface.
gamesRouter.get("/sandbox/:slug", edgeCache({ ttlSeconds: 60 }), async (c) => {
  if (!c.env?.DB) return c.text("Not Found", 404);

  const { sandboxGameUseCases } = createContainer(c.env.DB);
  const resolved = await sandboxGameUseCases.resolveLiveVersion(c.req.param("slug"));
  if (!resolved) return c.text("Not Found", 404);

  // toPublicCreatorGame's shape is a strict superset of SandboxGamePublicDetailSchema's (adds
  // ownerType/requiresAuth/supportsLeaderboard for symmetry with PublicSystemGame) — zod strips
  // the extra fields on parse, so this route's wire response is byte-for-byte unchanged.
  return c.json(SandboxGamePublicDetailSchema.parse(toPublicCreatorGame(resolved.game)), 200);
});

// GET /api/games/sandbox — every currently-PUBLIC sandbox game, for the main site catalog (see
// apps/web/app/features/catalog/sandboxGameAdapter.ts, which merges this into the built-in-game
// grid on /games and the home page). Same 60s edge cache as the single-game route above — this
// list changes only when an admin approves/publishes/unpublishes a game.
gamesRouter.get("/sandbox", edgeCache({ ttlSeconds: 60 }), async (c) => {
  if (!c.env?.DB) return c.json(SandboxGamePublicListResponseSchema.parse({ games: [] }), 200);

  const { sandboxGameUseCases } = createContainer(c.env.DB);
  const games = await sandboxGameUseCases.listPublic();

  return c.json(
    SandboxGamePublicListResponseSchema.parse({ games: games.map(toPublicCreatorGame) }),
    200,
  );
});

// GET /api/games/sandbox/:slug/logo — public, no auth. The actual logo image bytes, served
// separately from the JSON detail route above so the web catalog can point a plain <img src>
// straight at this URL. Never returns a raw storage key to any client — see
// SandboxGameUseCases.resolvePublicLogo and SandboxGameRecordSchema's `hasLogo` transform.
// Long-lived cache: the logo is set once at registration and there is currently no route to
// change it afterward, so there is nothing to invalidate.
gamesRouter.get("/sandbox/:slug/logo", edgeCache({ ttlSeconds: 3600 }), async (c) => {
  if (!c.env?.DB) return c.text("Not Found", 404);

  const { sandboxGameUseCases } = createContainer(c.env.DB, readB2Config(c.env));
  const resolved = await sandboxGameUseCases.resolvePublicLogo(c.req.param("slug"));
  if (!resolved) return c.text("Not Found", 404);

  return new Response(resolved.bytes, {
    status: 200,
    headers: { "Content-Type": resolved.contentType, "Cache-Control": "public, max-age=3600" },
  });
});

// ── Unified public Game read model ────────────────────────────────────────────
//
// GET /api/games and GET /api/games/:slug — the first Game Platform surface that answers "what
// games exist" across SYSTEM (game-registry/) and CREATOR (sandbox_games) without a caller
// needing to know which one it's asking about. Deliberately does NOT replace the routes above:
// GET /api/games/sandbox* stays exactly as it was for compatibility, and nothing on the web side
// (sandboxGameAdapter.ts, GameCard's owner-based routing) has been switched over to this yet —
// that is a later, separate step.
//
// Registered after every /sandbox* route above and after /availability, and deliberately so:
// GET /api/games/:slug is a catch-all single path segment, and it must never have a chance to
// shadow a more specific literal route. apps/api/test/publicGames.test.ts asserts this ordering
// holds (a request to /api/games/sandbox still reaches the sandbox-list handler, not this one).

// GET /api/games — every SYSTEM game, then every currently-PUBLIC creator game whose slug doesn't
// collide with a SYSTEM one (same "SYSTEM wins" policy as the single-slug route below, applied to
// a list — see mergePublicGames's doc comment in packages/core for why a collision is dropped
// here rather than left to appear twice under one slug).
gamesRouter.get("/", edgeCache({ ttlSeconds: 60 }), async (c) => {
  if (!c.env?.DB) return c.json(PublicGameListResponseSchema.parse({ games: [] }), 200);

  const { gameRegistry, sandboxGameUseCases } = createContainer(c.env.DB);
  const [systemGames, creatorGames] = await Promise.all([
    gameRegistry.listAll(),
    sandboxGameUseCases.listPublic(),
  ]);

  return c.json(
    PublicGameListResponseSchema.parse({ games: mergePublicGames(systemGames, creatorGames) }),
    200,
  );
});

// GET /api/games/:slug — resolves a SYSTEM game first (a synchronous, in-memory lookup — no D1
// round trip), and only falls through to the sandbox PUBLIC+live-version-gated lookup when no
// SYSTEM game claims the slug. This ordering is what makes SYSTEM always win a same-slug
// collision, not an incidental side effect of it happening to run first — see resolvePublicGame's
// doc comment (packages/core) for why that guarantee matters and what it does not fix.
gamesRouter.get("/:slug", edgeCache({ ttlSeconds: 60 }), async (c) => {
  if (!c.env?.DB) return c.text("Not Found", 404);

  const { gameRegistry, sandboxGameUseCases } = createContainer(c.env.DB);
  const slug = c.req.param("slug");

  const systemGame = await gameRegistry.findBySlug(slug);
  const creatorResolved = systemGame ? null : await sandboxGameUseCases.resolveLiveVersion(slug);
  const game = resolvePublicGame(systemGame, creatorResolved?.game ?? null);
  if (!game) return c.text("Not Found", 404);

  return c.json(PublicGameSchema.parse(game), 200);
});

// ── Game Session (Creator score-submission prerequisite) ─────────────────────
//
// POST /api/games/:slug/session — issues a short-lived, HMAC-signed Game Session token (see
// packages/core/src/domain/gameSession.ts). Deliberately NOT connected to anything past signing
// and returning it: no score/leaderboard/XP route reads this token yet, and nothing here writes
// to D1 — that wiring is a later PR's scope. This exists so a Web Host can start acquiring and
// holding a token now, ready for whenever that connection is made.
//
// Login required (the existing owogg_session cookie — same requireAuth as creators.ts/
// discordGuilds.ts). Deliberately reuses resolveLiveVersion, the exact same "PUBLIC + has a live
// version" gate every other public Creator-game read in this file already uses — a SYSTEM slug
// (not in sandbox_games at all) or a private/unpublished/unknown Creator game all 404 identically,
// the same can't-distinguish-unknown-from-private posture as everywhere else in this file.

gamesRouter.post("/:slug/session", rateLimit({ name: "game-session" }), async (c) => {
  if (!c.env?.DB) return c.text("Not Found", 404);

  const secret = c.env.GAME_SESSION_SECRET;
  if (!secret) {
    // Fails closed rather than signing with an empty/predictable secret — same posture as
    // GAME_BUNDLES_NOT_CONFIGURED in devGames.ts for a feature this environment hasn't set up.
    return c.json(
      {
        error: {
          code: "GAME_SESSION_NOT_CONFIGURED",
          message: "게임 세션 서명 키가 아직 이 환경에 구성되지 않았습니다.",
        },
      },
      503,
    );
  }

  const auth = await requireAuth(c);
  if (!auth)
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);

  const { sandboxGameUseCases } = createContainer(c.env.DB);
  const resolved = await sandboxGameUseCases.resolveLiveVersion(c.req.param("slug"));
  if (!resolved) return c.text("Not Found", 404);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: GameSessionPayload = {
    userId: auth.userId,
    gameId: resolved.game.id,
    versionId: resolved.version.id,
    attemptId: crypto.randomUUID(),
    exp: nowSeconds + GAME_SESSION_POLICY.EXPIRY_SECONDS,
  };
  const token = await signGameSession(payload, secret);

  return c.json(
    GameSessionResponseSchema.parse({
      token,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    }),
    200,
  );
});

// ── Creator score acceptance ──────────────────────────────────────────────────
//
// POST /api/games/:slug/score — the actual write a Game Session token exists for. Every check
// (game availability, token validity, token-vs-context match, score policy) runs in
// CreatorScoreAcceptanceUseCases.accept() before the one atomic D1 write — consuming the
// attemptId and saving the score together, so there is no possible outcome where the token gets
// spent but no score is recorded. See that class's own doc comment for the full reasoning.
//
// Called from CreatorGameHost (apps/web/app/features/game/creatorScoreFlow.ts) whenever
// GAME_COMPLETE carries a score and the player is logged in. Still deliberately not connected to
// anything past accepting the row: no leaderboard read, no XP/achievement/guild XP award (those
// stay on the existing SYSTEM-game path, apps/api/src/routes/scores.ts), no Bridge protocol
// change, no HOST_INIT payload change — the token this endpoint spends never reaches the iframe.

/** HTTP status per failure reason — mirrors the shape POST /api/scores already uses (a JSON
 * {error:{code,message}} body), just with this route's own error codes. */
function creatorScoreAcceptErrorStatus(error: CreatorScoreAcceptError): 400 | 401 | 404 | 409 {
  switch (error) {
    case "GAME_NOT_AVAILABLE":
      return 404;
    case "INVALID_TOKEN":
    case "CONTEXT_MISMATCH":
      return 401;
    case "SCORE_POLICY_NOT_CONFIGURED":
    case "INVALID_SCORE":
      return 400;
    case "ALREADY_CONSUMED":
      return 409;
  }
}

function creatorScoreAcceptErrorMessage(error: CreatorScoreAcceptError, reason?: string): string {
  switch (error) {
    case "GAME_NOT_AVAILABLE":
      return "게임을 찾을 수 없습니다.";
    case "INVALID_TOKEN":
      return "게임 세션이 유효하지 않거나 만료되었습니다.";
    case "CONTEXT_MISMATCH":
      return "게임 세션이 이 요청과 일치하지 않습니다. 다시 시작해 주세요.";
    case "SCORE_POLICY_NOT_CONFIGURED":
      return "이 게임은 아직 점수 제출을 지원하지 않습니다.";
    case "INVALID_SCORE":
      return reason || "유효하지 않은 점수입니다.";
    case "ALREADY_CONSUMED":
      return "이미 처리된 플레이입니다.";
  }
}

gamesRouter.post("/:slug/score", rateLimit({ name: "creator-score-accept" }), async (c) => {
  if (!c.env?.DB) return c.text("Not Found", 404);

  const secret = c.env.GAME_SESSION_SECRET;
  if (!secret) {
    return c.json(
      {
        error: {
          code: "GAME_SESSION_NOT_CONFIGURED",
          message: "게임 세션 서명 키가 아직 이 환경에 구성되지 않았습니다.",
        },
      },
      503,
    );
  }

  // Inlined rather than the narrower local requireAuth() above — this needs avatar_url too (for
  // the score row), the same fields POST /api/scores itself reads off the session directly.
  const sessionId = getCookie(c, "owogg_session");
  if (!sessionId) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }
  const { sessionRepo, creatorScoreAcceptanceUseCases } = createContainer(c.env.DB);
  const authData = await sessionRepo.findSession(sessionId);
  if (!authData) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }

  // Same score-submission block POST /api/scores already enforces (see UserModerationUseCases) —
  // applies identically regardless of which kind of game the score is for.
  if (authData.user.score_submission_blocked) {
    return c.json(
      {
        error: { code: "SCORE_SUBMISSION_BLOCKED", message: "현재 점수 제출이 제한된 계정입니다." },
      },
      403,
    );
  }

  const rawBody = await c.req.json().catch(() => ({}));
  const parseResult = CreatorScoreAcceptRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      { error: { code: "INVALID_PAYLOAD", message: "요청 형식이 올바르지 않습니다." } },
      400,
    );
  }

  const result = await creatorScoreAcceptanceUseCases.accept({
    slug: c.req.param("slug"),
    userId: authData.user.id,
    nickname: authData.user.nickname,
    avatarUrl: authData.user.avatar_url,
    token: parseResult.data.token,
    secret,
    score: parseResult.data.score,
  });

  if (!result.ok) {
    return c.json(
      {
        error: {
          code: result.error,
          message: creatorScoreAcceptErrorMessage(result.error, result.reason),
        },
      },
      creatorScoreAcceptErrorStatus(result.error),
    );
  }

  return c.json(CreatorScoreAcceptResponseSchema.parse({ success: true }), 200);
});
