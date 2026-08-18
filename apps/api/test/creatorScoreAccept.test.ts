import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/index.js";
import { signGameSession, type GameSessionPayload } from "@owogg/core";

// POST /api/games/:slug/score — route-layer wiring only. The atomic accept-or-reject write is
// proven against real SQLite in packages/db/test/D1CreatorScoreAcceptanceRepository.test.ts, and
// every pre-write check (availability, token validity, context match, score policy) is proven
// against a fake repository in packages/core/test/creatorScoreAcceptanceUseCases.test.ts. This
// file only confirms HTTP-level wiring — auth gating, status codes per error, and that a real
// success actually reaches the fake D1's `scores` write — using the same "real Hono app, fake D1"
// pattern gameSession.test.ts uses, extended with a hand-rolled batch() that models the
// game_attempt_consumptions + scores atomic write in JS state (not real SQL — that's the db
// package's job).

interface FakeGame {
  id: number;
  slug: string;
  visibility: "PRIVATE" | "PUBLIC";
  live_version_id: number | null;
  score_unit?: string | null;
  score_direction?: "asc" | "desc" | null;
  score_min?: number | null;
  score_max?: number | null;
}
interface FakeVersion {
  id: number;
  game_id: number;
}
interface FakeScoreRow {
  userId: unknown;
  nickname: unknown;
  avatarUrl: unknown;
  gameSlug: unknown;
  score: unknown;
  difficulty: unknown;
  nowIso: unknown;
}

function createDb(options: {
  userId?: number;
  scoreSubmissionBlocked?: boolean;
  game?: FakeGame;
  version?: FakeVersion;
  preConsumedAttemptIds?: string[];
}) {
  const {
    userId = 7,
    scoreSubmissionBlocked = false,
    game,
    version,
    preConsumedAttemptIds = [],
  } = options;
  const consumedAttemptIds = new Set(preConsumedAttemptIds);
  const scores: FakeScoreRow[] = [];

  function statement(query: string) {
    let values: unknown[] = [];
    return {
      query,
      bind(...bound: unknown[]) {
        values = bound;
        return this;
      },
      get values() {
        return values;
      },
      async first<T>() {
        if (query.includes("JOIN users u ON s.user_id = u.id")) {
          return {
            session_id: "valid_session",
            user_id: userId,
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            session_created_at: new Date().toISOString(),
            nickname: "player",
            email: "player@example.com",
            avatar_url: null,
            user_created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            score_submission_blocked: scoreSubmissionBlocked ? 1 : 0,
          } as T;
        }

        const wantsGameBySlug = query.includes("FROM sandbox_games WHERE slug");
        const wantsGameById = query.includes("FROM sandbox_games WHERE id");
        if (wantsGameBySlug || wantsGameById) {
          const matches = wantsGameBySlug ? game?.slug === values[0] : game?.id === values[0];
          if (!game || !matches) return null;
          return {
            id: game.id,
            slug: game.slug,
            developer_user_id: 1,
            title: "Test Game",
            short_description: null,
            description: null,
            genre: "puzzle",
            xp_per_completion: 0,
            score_unit: game.score_unit ?? null,
            score_direction: game.score_direction ?? null,
            score_min: game.score_min ?? null,
            score_max: game.score_max ?? null,
            score_display_prefix: null,
            score_display_suffix: null,
            visibility: game.visibility,
            live_version_id: game.live_version_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as T;
        }

        if (query.includes("FROM sandbox_game_versions WHERE id")) {
          if (!version || version.id !== values[0]) return null;
          return {
            id: version.id,
            game_id: version.game_id,
            object_key: "uploads/1/abc.zip",
            content_hash: "fakehash",
            bundle_bytes: 123,
            status: "APPROVED",
            reviewed_by_admin_id: 1,
            reviewed_at: new Date().toISOString(),
            reject_reason: null,
            uploaded_at: new Date().toISOString(),
            publish_status: "READY",
            publish_error: null,
            published_at: new Date().toISOString(),
            manifest_key: `games/${version.game_id}/${version.id}/.owogg-manifest.json`,
            published_size_bytes: 456,
            file_count: 2,
          } as T;
        }

        return null;
      },
      async all<T>() {
        return { results: [] } as { results: T[] };
      },
      async run() {
        return { success: true, meta: { changes: 0 } };
      },
    };
  }

  return {
    scores,
    db: {
      prepare(query: string) {
        return statement(query);
      },
      // Models the D1CreatorScoreAcceptanceRepository batch in JS state: statement 0 is the
      // attempt-consumption claim (ON CONFLICT DO NOTHING), statement 1 is the scores insert
      // gated on statement 0's own success — see that repository's doc comment for why this must
      // be one atomic unit rather than two independent writes.
      async batch(statements: Array<ReturnType<typeof statement>>) {
        const [attemptStmt, scoreStmt] = statements;
        const attemptId = attemptStmt?.values[0] as string;
        let attemptChanges = 0;
        if (attemptId !== undefined && !consumedAttemptIds.has(attemptId)) {
          consumedAttemptIds.add(attemptId);
          attemptChanges = 1;
        }
        let scoreChanges = 0;
        if (attemptChanges === 1 && scoreStmt) {
          const [userIdBound, nickname, avatarUrl, gameSlug, score, difficulty, nowIso] =
            scoreStmt.values;
          scores.push({
            userId: userIdBound,
            nickname,
            avatarUrl,
            gameSlug,
            score,
            difficulty,
            nowIso,
          });
          scoreChanges = 1;
        }
        return [
          { success: true, meta: { changes: attemptChanges, rows_written: attemptChanges } },
          // rows_written is the field D1CreatorScoreAcceptanceRepository actually reads to decide
          // `accepted` — populated here (not left undefined) so this fake models a real D1 batch
          // result, not just changes, which the repository deliberately no longer trusts.
          { success: true, meta: { changes: scoreChanges, rows_written: scoreChanges } },
        ];
      },
    },
  };
}

const LIVE_GAME: FakeGame = {
  id: 1,
  slug: "ball-dodge",
  visibility: "PUBLIC",
  live_version_id: 17,
  score_unit: "seconds",
  score_direction: "desc",
  score_min: 0,
  score_max: 3600,
};
const LIVE_VERSION: FakeVersion = { id: 17, game_id: 1 };
const SESSION_SECRET = "test-game-session-secret";
const AUTH_HEADERS = { Cookie: "owogg_session=valid_session", "Content-Type": "application/json" };

function samplePayload(overrides: Partial<GameSessionPayload> = {}): GameSessionPayload {
  return {
    userId: 7,
    gameId: LIVE_GAME.id,
    versionId: LIVE_VERSION.id,
    attemptId: crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + 300,
    ...overrides,
  };
}

async function postScore(
  db: unknown,
  body: unknown,
  env: Record<string, unknown> = { GAME_SESSION_SECRET: SESSION_SECRET },
) {
  return app.request(
    "/api/games/ball-dodge/score",
    { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify(body) },
    { DB: db, ...env } as any,
  );
}

test("requires authentication — no session cookie means 401, before anything else runs", async () => {
  const { db } = createDb({ game: LIVE_GAME, version: LIVE_VERSION });
  const res = await app.request(
    "/api/games/ball-dodge/score",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
    { DB: db, GAME_SESSION_SECRET: SESSION_SECRET } as any,
  );
  assert.equal(res.status, 401);
});

test("fails closed (503) when GAME_SESSION_SECRET is not configured in this environment", async () => {
  const { db } = createDb({ game: LIVE_GAME, version: LIVE_VERSION });
  const res = await postScore(db, { token: "irrelevant", score: 1 }, {});
  assert.equal(res.status, 503);
});

test("a score-submission-blocked account is rejected with 403, before the token is even checked", async () => {
  const { db } = createDb({ scoreSubmissionBlocked: true, game: LIVE_GAME, version: LIVE_VERSION });
  const res = await postScore(db, { token: "irrelevant", score: 1 });
  assert.equal(res.status, 403);
});

test("a malformed request body is 400 INVALID_PAYLOAD", async () => {
  const { db } = createDb({ game: LIVE_GAME, version: LIVE_VERSION });
  const res = await postScore(db, { score: "not-a-number" });
  assert.equal(res.status, 400);
  const responseBody = (await res.json()) as { error: { code: string } };
  assert.equal(responseBody.error.code, "INVALID_PAYLOAD");
});

test("an unknown slug is 404 GAME_NOT_AVAILABLE", async () => {
  const { db } = createDb({});
  const token = await signGameSession(samplePayload(), SESSION_SECRET);
  const res = await app.request(
    "/api/games/no-such-game/score",
    { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify({ token, score: 10 }) },
    { DB: db, GAME_SESSION_SECRET: SESSION_SECRET } as any,
  );
  assert.equal(res.status, 404);
});

test("a tampered token is 401 INVALID_TOKEN", async () => {
  const { db } = createDb({ game: LIVE_GAME, version: LIVE_VERSION });
  const token = await signGameSession(samplePayload(), SESSION_SECRET);
  const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
  const res = await postScore(db, { token: tampered, score: 10 });
  assert.equal(res.status, 401);
  const responseBody = (await res.json()) as { error: { code: string } };
  assert.equal(responseBody.error.code, "INVALID_TOKEN");
});

test("a token issued to a different user is 401 CONTEXT_MISMATCH", async () => {
  const { db } = createDb({ userId: 7, game: LIVE_GAME, version: LIVE_VERSION });
  const token = await signGameSession(samplePayload({ userId: 999 }), SESSION_SECRET);
  const res = await postScore(db, { token, score: 10 });
  assert.equal(res.status, 401);
  const responseBody = (await res.json()) as { error: { code: string } };
  assert.equal(responseBody.error.code, "CONTEXT_MISMATCH");
});

test("a game with no score policy configured yet is 400 SCORE_POLICY_NOT_CONFIGURED", async () => {
  const unconfigured: FakeGame = {
    ...LIVE_GAME,
    score_unit: null,
    score_direction: null,
    score_min: null,
    score_max: null,
  };
  const { db } = createDb({ game: unconfigured, version: LIVE_VERSION });
  const token = await signGameSession(samplePayload(), SESSION_SECRET);
  const res = await postScore(db, { token, score: 10 });
  assert.equal(res.status, 400);
  const responseBody = (await res.json()) as { error: { code: string } };
  assert.equal(responseBody.error.code, "SCORE_POLICY_NOT_CONFIGURED");
});

test("a score outside the configured bounds is 400 INVALID_SCORE", async () => {
  const { db } = createDb({ game: LIVE_GAME, version: LIVE_VERSION });
  const token = await signGameSession(samplePayload(), SESSION_SECRET);
  const res = await postScore(db, { token, score: 999999 });
  assert.equal(res.status, 400);
  const responseBody = (await res.json()) as { error: { code: string } };
  assert.equal(responseBody.error.code, "INVALID_SCORE");
});

test("a valid token, matching context, and in-policy score is accepted and reaches the score write", async () => {
  const { db, scores } = createDb({ userId: 7, game: LIVE_GAME, version: LIVE_VERSION });
  const payload = samplePayload();
  const token = await signGameSession(payload, SESSION_SECRET);
  const res = await postScore(db, { token, score: 120 });

  assert.equal(res.status, 200);
  const responseBody = (await res.json()) as { success: true };
  assert.deepEqual(responseBody, { success: true });

  assert.equal(scores.length, 1);
  assert.equal(scores[0]?.gameSlug, "ball-dodge");
  assert.equal(scores[0]?.score, 120);
  assert.equal(scores[0]?.userId, 7);
});

test("the same token presented twice is accepted once, then 409 ALREADY_CONSUMED — the token is not left half-spent", async () => {
  const { db, scores } = createDb({ userId: 7, game: LIVE_GAME, version: LIVE_VERSION });
  const token = await signGameSession(samplePayload(), SESSION_SECRET);

  const first = await postScore(db, { token, score: 120 });
  assert.equal(first.status, 200);

  // A different but still in-policy score — proves the replay is rejected on the attemptId
  // itself, not merely because this particular score value happened to be invalid.
  const second = await postScore(db, { token, score: 200 });
  assert.equal(second.status, 409);
  const responseBody = (await second.json()) as { error: { code: string } };
  assert.equal(responseBody.error.code, "ALREADY_CONSUMED");

  // The rejected replay must not have slipped a second (or different) score through.
  assert.equal(scores.length, 1);
  assert.equal(scores[0]?.score, 120);
});
