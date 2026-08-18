import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/index.js";

// Public (anonymous, no auth) sandbox-game catalog surface added 2026-08-18 alongside the
// site-catalog integration: GET /api/games/sandbox (list, for the main game grid), and
// GET /api/games/sandbox/:slug/logo (the actual logo bytes — never a raw storage key, see
// SandboxGameRecordSchema's `hasLogo` transform). The existing single-game detail route
// (GET /api/games/sandbox/:slug) is covered too, just for its new mode/hasLogo fields.

const B2_ENV = {
  B2_ENDPOINT: "https://s3.us-west-004.backblazeb2.com",
  B2_REGION: "us-west-004",
  B2_BUCKET_NAME: "owogg-game-bundles",
  B2_KEY_ID: "someKeyId",
  B2_APPLICATION_KEY: "someApplicationKey",
};

interface FakeGame {
  id: number;
  slug: string;
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
    title: `Title of ${game.slug}`,
    short_description: null,
    description: null,
    genre: "puzzle",
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
    deleted_at: null,
    deleted_by_admin_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function createDb(games: FakeGame[]) {
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
        return null;
      },
      async all<T>() {
        if (query.includes("FROM sandbox_games WHERE visibility = 'PUBLIC'")) {
          return {
            results: games.filter((g) => g.visibility === "PUBLIC").map(gameRow),
          } as { results: T[] };
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

test("GET /api/games/sandbox/:slug still 404s the same can't-distinguish way for a PRIVATE game with mode/logo set", async () => {
  // resolveLiveVersion (which this route reuses) requires a real sandbox_game_versions row this
  // minimal fake DB doesn't provide, so a genuine 200 here isn't exercisable without that — mode/
  // hasLogo actually appearing in a successful response is covered by the list route test below,
  // which doesn't depend on version resolution. This test only confirms the route still fails
  // closed (never leaks existence) once mode/logo_key are in the row shape it reads.
  const { db } = createDb([
    {
      id: 1,
      slug: "private-game",
      visibility: "PRIVATE",
      live_version_id: null,
      mode: "multi",
      logo_key: "games/1/logo.png",
    },
  ]);
  const res = await app.request("/api/games/sandbox/private-game", {}, {
    DB: db,
    ...B2_ENV,
  } as any);
  assert.equal(res.status, 404);
});

test("GET /api/games/sandbox lists only PUBLIC games, with mode and hasLogo per entry", async () => {
  const { db } = createDb([
    {
      id: 1,
      slug: "public-with-logo",
      visibility: "PUBLIC",
      live_version_id: 10,
      mode: "multi",
      logo_key: "games/1/logo.svg",
    },
    {
      id: 2,
      slug: "public-no-logo",
      visibility: "PUBLIC",
      live_version_id: 20,
      mode: "single",
      logo_key: null,
    },
    { id: 3, slug: "private-game", visibility: "PRIVATE", live_version_id: null },
  ]);

  const res = await app.request("/api/games/sandbox", {}, { DB: db, ...B2_ENV } as any);
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    games: Array<{ slug: string; mode: string; hasLogo: boolean }>;
  };
  assert.equal(body.games.length, 2);
  assert.ok(!body.games.some((g) => g.slug === "private-game"));

  const withLogo = body.games.find((g) => g.slug === "public-with-logo");
  assert.equal(withLogo?.mode, "multi");
  assert.equal(withLogo?.hasLogo, true);

  const noLogo = body.games.find((g) => g.slug === "public-no-logo");
  assert.equal(noLogo?.mode, "single");
  assert.equal(noLogo?.hasLogo, false);
});

test("GET /api/games/sandbox/:slug/logo 404s for a game with no logo", async () => {
  const { db } = createDb([
    { id: 1, slug: "no-logo", visibility: "PUBLIC", live_version_id: 10, logo_key: null },
  ]);
  const res = await app.request("/api/games/sandbox/no-logo/logo", {}, {
    DB: db,
    ...B2_ENV,
  } as any);
  assert.equal(res.status, 404);
});

test("GET /api/games/sandbox/:slug/logo 404s for a PRIVATE game (never distinguishes from unknown)", async () => {
  const { db } = createDb([
    {
      id: 1,
      slug: "private-with-logo",
      visibility: "PRIVATE",
      live_version_id: null,
      logo_key: "games/1/logo.png",
    },
  ]);
  const res = await app.request("/api/games/sandbox/private-with-logo/logo", {}, {
    DB: db,
    ...B2_ENV,
  } as any);
  assert.equal(res.status, 404);
});

test("GET /api/games/sandbox/:slug/logo returns the actual bytes and a content type derived from the stored key", async () => {
  const { db } = createDb([
    {
      id: 1,
      slug: "has-logo",
      visibility: "PUBLIC",
      live_version_id: 10,
      logo_key: "games/1/logo.svg",
    },
  ]);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("<svg>fake</svg>", { status: 200 })) as typeof fetch;
  try {
    const res = await app.request("/api/games/sandbox/has-logo/logo", {}, {
      DB: db,
      ...B2_ENV,
    } as any);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("Content-Type") ?? "", /image\/svg\+xml/);
    const text = await res.text();
    assert.equal(text, "<svg>fake</svg>");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/games/sandbox returns an empty list, not an error, when no DB is bound", async () => {
  const res = await app.request("/api/games/sandbox", {}, {} as any);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { games: unknown[] };
  assert.deepEqual(body.games, []);
});
