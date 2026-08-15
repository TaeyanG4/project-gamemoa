import test from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { edgeCache } from "../src/middleware/edgeCache.js";

// The Cache API (`caches.default`) does not exist in the plain-Node test runner. These tests
// install a minimal in-memory stand-in that mirrors the two behaviors the middleware depends on
// (URL-keyed match/put) so the caching logic itself is exercised for real, rather than being
// skipped entirely the way it would be against the bare runtime.
interface FakeCache {
  entries: Map<string, Response>;
  putCount: number;
}

function installFakeCache(): FakeCache {
  const entries = new Map<string, Response>();
  const state: FakeCache = { entries, putCount: 0 };

  (globalThis as unknown as { caches: unknown }).caches = {
    default: {
      async match(request: Request) {
        const hit = entries.get(request.url);
        return hit ? hit.clone() : undefined;
      },
      async put(request: Request, response: Response) {
        state.putCount += 1;
        entries.set(request.url, response);
      },
    },
  };
  return state;
}

function uninstallFakeCache() {
  delete (globalThis as unknown as { caches?: unknown }).caches;
}

/** Hono only exposes executionCtx when the fetch handler is given one — app.request()'s third
 * argument. Without it the middleware's waitUntil path throws and is caught (see edgeCache.ts). */
function fakeExecutionCtx() {
  const pending: Promise<unknown>[] = [];
  return {
    ctx: { waitUntil: (p: Promise<unknown>) => pending.push(p), passThroughOnException() {} },
    settle: () => Promise.all(pending),
  };
}

test("edgeCache serves the second request from cache without re-running the handler", async () => {
  const state = installFakeCache();
  try {
    let handlerRuns = 0;
    const app = new Hono();
    app.get("/leaderboard", edgeCache({ ttlSeconds: 30 }), (c) => {
      handlerRuns += 1;
      return c.json({ run: handlerRuns });
    });

    const first = fakeExecutionCtx();
    const res1 = await app.request("/leaderboard", {}, {}, first.ctx as never);
    await first.settle();
    assert.equal(res1.status, 200);
    assert.equal(res1.headers.get("X-Cache"), "MISS");
    assert.deepEqual(await res1.json(), { run: 1 });

    const second = fakeExecutionCtx();
    const res2 = await app.request("/leaderboard", {}, {}, second.ctx as never);
    assert.equal(res2.headers.get("X-Cache"), "HIT");
    assert.deepEqual(await res2.json(), { run: 1 }, "cached body, not a re-run of the handler");
    assert.equal(handlerRuns, 1, "handler (and therefore D1) must not be touched on a hit");
    assert.equal(state.putCount, 1);
  } finally {
    uninstallFakeCache();
  }
});

test("edgeCache keys on the full URL, so a different query string is a separate entry", async () => {
  installFakeCache();
  try {
    const app = new Hono();
    app.get("/scores", edgeCache({ ttlSeconds: 30 }), (c) =>
      c.json({ difficulty: c.req.query("difficulty") ?? "none" }),
    );

    const a = fakeExecutionCtx();
    const resNormal = await app.request("/scores?difficulty=normal", {}, {}, a.ctx as never);
    await a.settle();
    const b = fakeExecutionCtx();
    const resHard = await app.request("/scores?difficulty=hard", {}, {}, b.ctx as never);
    await b.settle();

    assert.deepEqual(await resNormal.json(), { difficulty: "normal" });
    assert.deepEqual(
      await resHard.json(),
      { difficulty: "hard" },
      "a different difficulty must not be served the other tier's cached leaderboard",
    );
  } finally {
    uninstallFakeCache();
  }
});

test("edgeCache never caches a non-200 response", async () => {
  const state = installFakeCache();
  try {
    const app = new Hono();
    app.get("/boom", edgeCache({ ttlSeconds: 30 }), (c) => c.json({ error: "nope" }, 500));

    const ctx = fakeExecutionCtx();
    const res = await app.request("/boom", {}, {}, ctx.ctx as never);
    await ctx.settle();

    assert.equal(res.status, 500);
    assert.equal(state.putCount, 0, "a 500 must not be pinned at the edge for the whole TTL");
  } finally {
    uninstallFakeCache();
  }
});

test("edgeCache strips Set-Cookie rather than caching a user-specific response", async () => {
  const state = installFakeCache();
  try {
    const app = new Hono();
    app.get("/oops", edgeCache({ ttlSeconds: 30 }), (c) => {
      c.header("Set-Cookie", "owogg_session=leaked; Path=/");
      return c.json({ ok: true });
    });

    const ctx = fakeExecutionCtx();
    await app.request("/oops", {}, {}, ctx.ctx as never);
    await ctx.settle();

    const stored = state.entries.get(new Request("http://localhost/oops").url);
    assert.ok(stored);
    assert.equal(
      stored.headers.get("Set-Cookie"),
      null,
      "a session cookie must never be stored in a shared edge cache entry",
    );
  } finally {
    uninstallFakeCache();
  }
});

test("edgeCache passes non-GET straight through without caching", async () => {
  const state = installFakeCache();
  try {
    let runs = 0;
    const app = new Hono();
    app.post("/submit", edgeCache({ ttlSeconds: 30 }), (c) => {
      runs += 1;
      return c.json({ runs });
    });

    const a = fakeExecutionCtx();
    await app.request("/submit", { method: "POST" }, {}, a.ctx as never);
    const b = fakeExecutionCtx();
    await app.request("/submit", { method: "POST" }, {}, b.ctx as never);

    assert.equal(runs, 2, "writes must always reach the handler");
    assert.equal(state.putCount, 0);
  } finally {
    uninstallFakeCache();
  }
});

test("the per-user /api/scores/user/me route is matched before the cached /:gameId route", async () => {
  // Safety regression guard. In scores.ts, `/user/me` (per-user, reads owogg_session) is
  // registered before `/:gameId` (public, edge-cached). If that order were ever reversed — or if
  // the router preferred the param route — "user" would be captured as a gameId and the
  // per-user response would be served from a URL-keyed shared cache entry, leaking one user's
  // bests to every other visitor. This asserts the real app's routing, not a local fixture.
  const { app } = await import("../src/index.js");

  const res = await app.request(
    "/api/scores/user/me",
    {},
    // No DB binding and no session cookie: /user/me returns its unauthenticated shape, whereas
    // the /:gameId handler would have rejected "user" as an invalid game id with a 400.
    {} as never,
  );

  assert.equal(res.status, 200);
  assert.deepEqual(
    await res.json(),
    { authenticated: false, bests: {} },
    "must be served by the per-user handler, never by the cached public leaderboard route",
  );
});

test("edgeCache falls through cleanly when the Cache API is absent entirely", async () => {
  // No installFakeCache() here — this is the bare-Node path (and any non-Workers runtime).
  let runs = 0;
  const app = new Hono();
  app.get("/nocache", edgeCache({ ttlSeconds: 30 }), (c) => {
    runs += 1;
    return c.json({ runs });
  });

  const res1 = await app.request("/nocache");
  const res2 = await app.request("/nocache");

  assert.equal(res1.status, 200);
  assert.equal(res2.status, 200);
  assert.equal(runs, 2, "without a Cache API every request must still be served correctly");
});
