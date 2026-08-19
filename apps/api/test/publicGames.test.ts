import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/index.js";

/**
 * The unified public Game read model: GET /api/games and GET /api/games/:slug. Compatibility
 * (GET /api/games/sandbox*) is already covered by sandboxGamesPublic.test.ts — this file is only
 * the new surface plus the route-ordering guarantee that a catch-all `/:slug` doesn't break the
 * more specific literal routes it now sits behind.
 */

interface FakeGame {
  id: number;
  slug: string;
  title: string;
  visibility: "PRIVATE" | "PUBLIC";
  live_version_id: number | null;
  mode?: "single" | "multi";
  logo_key?: string | null;
}

function gameRow(game: FakeGame) {
  return {
    id: game.id,
    slug: game.slug,
    developer_user_id: 1,
    title: game.title,
    short_description: `${game.title} short`,
    description: null,
    genre: "arcade",
    mode: game.mode ?? "single",
    logo_key: game.logo_key ?? null,
    xp_per_completion: 0,
    score_unit: null,
    score_direction: null,
    score_min: null,
    score_max: null,
    score_display_prefix: null,
    score_display_suffix: null,
    visibility: game.visibility,
    live_version_id: game.live_version_id,
    review_slot: null,
    deleted_at: null,
    deleted_by_admin_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function versionRow(gameId: number, versionId: number) {
  return {
    id: versionId,
    game_id: gameId,
    object_key: `uploads/${gameId}/abc.zip`,
    content_hash: "abc",
    bundle_bytes: 100,
    status: "APPROVED",
    reviewed_by_admin_id: 9,
    reviewed_at: new Date().toISOString(),
    reject_reason: null,
    uploaded_at: new Date().toISOString(),
    publish_status: "READY",
    publish_error: null,
    published_at: new Date().toISOString(),
    manifest_key: `games/${gameId}/${versionId}/.owogg-manifest.json`,
    published_size_bytes: 100,
    file_count: 1,
  };
}

/** Every PUBLIC game gets a matching APPROVED/READY version at id = game.id * 100, so
 * resolveLiveVersion (which GET /api/games/:slug and /api/games/sandbox/:slug both go through)
 * fully resolves — unlike sandboxGamesPublic.test.ts's minimal fake DB, which deliberately can't
 * exercise a successful detail response. */
function createDb(games: FakeGame[]) {
  const versionByGameId = new Map(
    games.filter((g) => g.live_version_id !== null).map((g) => [g.id, g.live_version_id as number]),
  );

  function statement(query: string) {
    let values: unknown[] = [];
    return {
      bind(...bound: unknown[]) {
        values = bound;
        return this;
      },
      async first<T>() {
        if (query.includes("FROM sandbox_games WHERE slug")) {
          const game = games.find((g) => g.slug === values[0]);
          return (game ? gameRow(game) : null) as T | null;
        }
        if (query.includes("FROM sandbox_game_versions WHERE id")) {
          const versionId = Number(values[0]);
          const game = games.find((g) => versionByGameId.get(g.id) === versionId);
          return (game ? versionRow(game.id, versionId) : null) as T | null;
        }
        return null;
      },
      async all<T>() {
        if (query.includes("FROM sandbox_games WHERE visibility = 'PUBLIC'")) {
          return { results: games.filter((g) => g.visibility === "PUBLIC").map(gameRow) } as {
            results: T[];
          };
        }
        return { results: [] } as { results: T[] };
      },
      async run() {
        return { success: true, meta: { changes: 0 } };
      },
    };
  }

  return {
    db: {
      prepare(query: string) {
        return statement(query);
      },
      async batch(statements: Array<ReturnType<typeof statement>>) {
        return statements.map(() => ({ success: true, meta: { changes: 0 } }));
      },
    },
  };
}

// ── GET /api/games/:slug ──────────────────────────────────────────────────────

test("GET /api/games/:slug resolves a SYSTEM game with the SYSTEM shape", async () => {
  const { db } = createDb([]);
  const res = await app.request("/api/games/reaction-time", {}, { DB: db } as any);

  assert.equal(res.status, 200);
  const body = (await res.json()) as Record<string, unknown>;
  assert.equal(body.ownerType, "SYSTEM");
  assert.equal(body.slug, "reaction-time");
  assert.ok(Array.isArray(body.categories));
  assert.equal(typeof body.thumbnail, "string");
});

test("GET /api/games/:slug resolves a PUBLIC creator game with the CREATOR shape", async () => {
  const { db } = createDb([
    {
      id: 1,
      slug: "ball-dodge",
      title: "공 피하기",
      visibility: "PUBLIC",
      live_version_id: 100,
      mode: "single",
      logo_key: "games/1/logo.svg",
    },
  ]);
  const res = await app.request("/api/games/ball-dodge", {}, { DB: db } as any);

  assert.equal(res.status, 200);
  const body = (await res.json()) as Record<string, unknown>;
  assert.equal(body.ownerType, "CREATOR");
  assert.equal(body.slug, "ball-dodge");
  assert.equal(body.genre, "arcade");
  assert.equal(body.hasLogo, true);
  assert.equal("logoKey" in body, false);
});

test("GET /api/games/:slug 404s the same way for an unknown slug and a PRIVATE creator game", async () => {
  const { db } = createDb([
    { id: 1, slug: "private-game", title: "Private", visibility: "PRIVATE", live_version_id: null },
  ]);

  const unknown = await app.request("/api/games/no-such-game", {}, { DB: db } as any);
  const privateGame = await app.request("/api/games/private-game", {}, { DB: db } as any);
  assert.equal(unknown.status, 404);
  assert.equal(privateGame.status, 404);
});

test("GET /api/games/:slug: SYSTEM wins when a creator game claims an official slug", async () => {
  // P-03 is guarded at registration time too now (SandboxGameUseCases.createGame rejects a
  // SYSTEM-slug collision with SLUG_TAKEN — see packages/core/test/sandboxGameUseCases.test.ts).
  // This is the read-path guarantee resolvePublicGame provides as a second layer: a row that
  // predates that guard, or reaches sandbox_games some other way, must still never be served
  // under the SYSTEM slug.
  const { db } = createDb([
    {
      id: 1,
      slug: "reaction-time",
      title: "가짜 반응속도 게임",
      visibility: "PUBLIC",
      live_version_id: 100,
    },
  ]);
  const res = await app.request("/api/games/reaction-time", {}, { DB: db } as any);
  const body = (await res.json()) as Record<string, unknown>;

  assert.equal(res.status, 200);
  assert.equal(body.ownerType, "SYSTEM");
  assert.notEqual(body.title, "가짜 반응속도 게임");
});

test("GET /api/games/:slug fails safe (404, not 500) when no DB is bound", async () => {
  const res = await app.request("/api/games/reaction-time", {}, {} as any);
  assert.equal(res.status, 404);
});

// ── GET /api/games ─────────────────────────────────────────────────────────────

test("GET /api/games lists every SYSTEM game before any PUBLIC creator game, excluding PRIVATE ones", async () => {
  const { db } = createDb([
    { id: 1, slug: "ball-dodge", title: "공 피하기", visibility: "PUBLIC", live_version_id: 100 },
    { id: 2, slug: "hidden-game", title: "Hidden", visibility: "PRIVATE", live_version_id: null },
  ]);
  const res = await app.request("/api/games", {}, { DB: db } as any);

  assert.equal(res.status, 200);
  const body = (await res.json()) as { games: Array<Record<string, unknown>> };
  const ownerTypes = body.games.map((g) => g.ownerType);

  assert.ok(ownerTypes.includes("SYSTEM"));
  assert.ok(!body.games.some((g) => g.slug === "hidden-game"));
  const ballDodge = body.games.find((g) => g.slug === "ball-dodge");
  assert.equal(ballDodge?.ownerType, "CREATOR");
  // Every SYSTEM entry precedes every CREATOR entry.
  const lastSystemIndex = ownerTypes.lastIndexOf("SYSTEM");
  const firstCreatorIndex = ownerTypes.indexOf("CREATOR");
  assert.ok(lastSystemIndex < firstCreatorIndex);
});

test("GET /api/games never lists the same slug twice — a creator game colliding with a SYSTEM slug is dropped", async () => {
  // Same policy as GET /api/games/:slug's SYSTEM-wins collision test above, at the list level:
  // the impostor must not appear as a second "reaction-time" entry, and the one entry that does
  // appear must be the real SYSTEM game.
  const { db } = createDb([
    {
      id: 1,
      slug: "reaction-time",
      title: "가짜 반응속도 게임",
      visibility: "PUBLIC",
      live_version_id: 100,
    },
    { id: 2, slug: "ball-dodge", title: "공 피하기", visibility: "PUBLIC", live_version_id: 200 },
  ]);
  const res = await app.request("/api/games", {}, { DB: db } as any);

  assert.equal(res.status, 200);
  const body = (await res.json()) as { games: Array<Record<string, unknown>> };
  const reactionTimeEntries = body.games.filter((g) => g.slug === "reaction-time");

  assert.equal(reactionTimeEntries.length, 1);
  assert.equal(reactionTimeEntries[0]?.ownerType, "SYSTEM");
  // The non-colliding creator game still appears normally.
  assert.ok(body.games.some((g) => g.slug === "ball-dodge" && g.ownerType === "CREATOR"));
});

test("GET /api/games returns only SYSTEM games (not an error) when no DB is bound", async () => {
  const res = await app.request("/api/games", {}, {} as any);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { games: Array<Record<string, unknown>> };
  assert.ok(body.games.length === 0 || body.games.every((g) => g.ownerType === "SYSTEM"));
});

// ── Route-ordering safety: the catch-all must never shadow a literal route ───

test("adding GET /api/games/:slug does not break GET /api/games/availability", async () => {
  const res = await app.request("/api/games/availability", {}, {} as any);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { disabledGameIds: unknown };
  assert.ok(Array.isArray(body.disabledGameIds));
});

test("adding GET /api/games/:slug does not break GET /api/games/sandbox (list)", async () => {
  const { db } = createDb([
    { id: 1, slug: "ball-dodge", title: "공 피하기", visibility: "PUBLIC", live_version_id: 100 },
  ]);
  const res = await app.request("/api/games/sandbox", {}, { DB: db } as any);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { games: Array<Record<string, unknown>> };
  // The sandbox-specific list route's own shape (no ownerType field) — confirms this hit
  // SandboxGamePublicListResponseSchema's route, not the unified list route re-purposed.
  assert.ok(body.games.every((g) => !("ownerType" in g)));
  assert.equal(body.games[0]?.slug, "ball-dodge");
});

test("adding GET /api/games/:slug does not break GET /api/games/sandbox/:slug (detail)", async () => {
  const { db } = createDb([
    { id: 1, slug: "ball-dodge", title: "공 피하기", visibility: "PUBLIC", live_version_id: 100 },
  ]);
  const res = await app.request("/api/games/sandbox/ball-dodge", {}, { DB: db } as any);
  assert.equal(res.status, 200);
  const body = (await res.json()) as Record<string, unknown>;
  assert.equal(body.slug, "ball-dodge");
  assert.equal("ownerType" in body, false);
});

test("adding GET /api/games/:slug does not break GET /api/games/sandbox/:slug/logo", async () => {
  const { db } = createDb([
    { id: 1, slug: "no-logo-game", title: "No Logo", visibility: "PUBLIC", live_version_id: 100 },
  ]);
  const res = await app.request("/api/games/sandbox/no-logo-game/logo", {}, { DB: db } as any);
  // 404 either way (this fake DB has no B2 config to actually serve bytes), but the important
  // thing is it reaches the logo route's own not-found path, not a JSON 404 from a slug lookup
  // that misparsed "no-logo-game/logo" — a text body distinguishes the two.
  assert.equal(res.status, 404);
  assert.equal(res.headers.get("Content-Type")?.includes("text/plain"), true);
});
