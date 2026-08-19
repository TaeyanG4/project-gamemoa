import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/index.js";

// GET /official-games/:slug/:version/* — the SYSTEM (official OwOGG) counterpart to
// /games/:gameId/:versionId/* (feat/official-game-serving-foundation), serving bundles
// SystemGameBundlePublisher wrote (feat/official-game-publisher-foundation). Mirrors
// gameServing.test.ts's own pattern for the Creator route as closely as the identity difference
// allows — real Hono app, fetch stubbed only at the storage boundary. No sandbox_games/
// sandbox_game_versions rows exist for a SYSTEM game, so this file's fake DB is never actually
// queried for game data (see below); the D1 binding is only present because
// gameBundleStorageRepo is constructed through createContainer either way (this route's own
// comment explains why). Creator-serving regression coverage is gameServing.test.ts's own
// existing suite, run unmodified — this file adds no changes there.

const B2_ENV = {
  B2_ENDPOINT: "https://s3.us-west-004.backblazeb2.com",
  B2_REGION: "us-west-004",
  B2_BUCKET_NAME: "owogg-game-bundles",
  B2_KEY_ID: "someKeyId",
  B2_APPLICATION_KEY: "someApplicationKey",
};

/** Never actually queried by this route (no D1-backed SYSTEM identity), but createContainer
 * still requires the binding to exist — see officialGameAssetsRouter's own route comment. */
function createDb() {
  return {
    prepare() {
      throw new Error("officialGameAssetsRouter must never read D1 — no SYSTEM row exists");
    },
    async batch() {
      throw new Error("officialGameAssetsRouter must never read D1 — no SYSTEM row exists");
    },
  };
}

/** Stands in for object storage, keyed exactly like gameServing.test.ts's own createStorageStub. */
function createStorageStub(stored: Record<string, Uint8Array>) {
  const objects = new Map(Object.entries(stored));
  const originalFetch = globalThis.fetch;
  const requestedKeys: string[] = [];

  globalThis.fetch = (async (input: URL | RequestInfo | string) => {
    const href =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    const url = new URL(href);
    const key = decodeURIComponent(url.pathname.split("/").slice(2).join("/"));
    requestedKeys.push(key);

    const found = objects.get(key);
    if (!found) return new Response("not found", { status: 404 });
    return new Response(found, { status: 200 });
  }) as unknown as typeof fetch;

  return {
    requestedKeys,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

const SLUG = "reaction-time"; // a real, registered SYSTEM slug (game-registry/games/reaction-time)
const VERSION = "abc123def456"; // stands in for a real sha256 content hash — see this route's own
// doc comment on why the route itself never verifies that (it just reads whatever exists at the
// resulting key, same trust boundary as the Creator route's D1-assigned versionId).

function publishedObjects(): Record<string, Uint8Array> {
  return {
    [`official-games/${SLUG}/${VERSION}/.owogg-manifest.json`]: bytes(
      JSON.stringify({
        slug: SLUG,
        version: VERSION,
        entry: "index.html",
        fileCount: 2,
        totalSize: 42,
        publishedAt: "2026-08-19T00:00:00.000Z",
        files: [],
      }),
    ),
    [`official-games/${SLUG}/${VERSION}/index.html`]: bytes("<h1>reaction-time (fixture)</h1>"),
    [`official-games/${SLUG}/${VERSION}/game.js`]: bytes("console.log('placeholder');"),
  };
}

async function withStorage<T>(
  stored: Record<string, Uint8Array>,
  run: (stub: ReturnType<typeof createStorageStub>) => Promise<T>,
): Promise<T> {
  const stub = createStorageStub(stored);
  try {
    return await run(stub);
  } finally {
    stub.restore();
  }
}

test("GET /official-games/:slug/:version/index.html serves a valid, published SYSTEM asset with a CSP", async () => {
  const db = createDb();
  const res = await withStorage(publishedObjects(), () =>
    app.request(`/official-games/${SLUG}/${VERSION}/index.html`, {}, {
      DB: db,
      ...B2_ENV,
      FRONTEND_URL: "https://www.owogg.com",
    } as any),
  );

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.equal(await res.text(), "<h1>reaction-time (fixture)</h1>");

  const csp = res.headers.get("Content-Security-Policy") ?? "";
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /frame-ancestors https:\/\/www\.owogg\.com/);
});

test("GET for an unknown SYSTEM slug returns 404, even with a fully-published version at that key", async () => {
  const db = createDb();
  const stored: Record<string, Uint8Array> = {
    "official-games/not-a-real-game/abc123/.owogg-manifest.json": bytes("{}"),
    "official-games/not-a-real-game/abc123/index.html": bytes("<h1>hi</h1>"),
  };
  const res = await withStorage(stored, () =>
    app.request("/official-games/not-a-real-game/abc123/index.html", {}, {
      DB: db,
      ...B2_ENV,
    } as any),
  );
  assert.equal(res.status, 404);
});

test("GET for a real SYSTEM slug but a version whose manifest was never published returns 404", async () => {
  const db = createDb();
  const stub = createStorageStub({}); // nothing published at all
  try {
    const res = await app.request(`/official-games/${SLUG}/never-published/index.html`, {}, {
      DB: db,
      ...B2_ENV,
    } as any);
    assert.equal(res.status, 404);
  } finally {
    stub.restore();
  }
});

test("GET for a file that isn't part of the published version returns 404, even though the manifest exists", async () => {
  const db = createDb();
  const res = await withStorage(publishedObjects(), () =>
    app.request(`/official-games/${SLUG}/${VERSION}/does-not-exist.js`, {}, {
      DB: db,
      ...B2_ENV,
    } as any),
  );
  assert.equal(res.status, 404);
});

test("a real SYSTEM slug's manifest existing at a DIFFERENT version does not make an unpublished version servable", async () => {
  const db = createDb();
  const res = await withStorage(publishedObjects(), () =>
    app.request(`/official-games/${SLUG}/some-other-version/index.html`, {}, {
      DB: db,
      ...B2_ENV,
    } as any),
  );
  assert.equal(res.status, 404);
});

test("a published asset response carries a wildcard Access-Control-Allow-Origin, matching an Origin: null module-script fetch", async () => {
  const db = createDb();
  const res = await withStorage(publishedObjects(), () =>
    app.request(`/official-games/${SLUG}/${VERSION}/game.js`, { headers: { Origin: "null" } }, {
      DB: db,
      ...B2_ENV,
    } as any),
  );

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(res.headers.get("Access-Control-Allow-Credentials"), null);
});

test("a non-HTML asset carries no CSP — the policy belongs to the document, not the bytes", async () => {
  const db = createDb();
  const res = await withStorage(publishedObjects(), () =>
    app.request(`/official-games/${SLUG}/${VERSION}/game.js`, {}, { DB: db, ...B2_ENV } as any),
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Security-Policy"), null);
});

test("the versioned entry document and a non-HTML asset get the same TTL policy as the Creator path (short HTML, hour-long other assets)", async () => {
  const db = createDb();
  const html = await withStorage(publishedObjects(), () =>
    app.request(`/official-games/${SLUG}/${VERSION}/index.html`, {}, { DB: db, ...B2_ENV } as any),
  );
  assert.equal(html.headers.get("Cache-Control"), "public, max-age=60");
  assert.ok(!(html.headers.get("Cache-Control") ?? "").includes("immutable"));

  const js = await withStorage(publishedObjects(), () =>
    app.request(`/official-games/${SLUG}/${VERSION}/game.js`, {}, { DB: db, ...B2_ENV } as any),
  );
  assert.equal(js.headers.get("Cache-Control"), "public, max-age=3600");
});

test("the host guard blocks api.owogg.com from serving SYSTEM assets, same as the Creator path", async () => {
  const db = createDb();
  const res = await withStorage(publishedObjects(), () =>
    app.request(`https://api.owogg.com/official-games/${SLUG}/${VERSION}/index.html`, {}, {
      DB: db,
      ...B2_ENV,
    } as any),
  );
  assert.equal(res.status, 404);
});

test("the configured GAME_ORIGIN host is allowed to serve SYSTEM assets", async () => {
  const db = createDb();
  const res = await withStorage(publishedObjects(), () =>
    app.request(`https://play.owogg.com/official-games/${SLUG}/${VERSION}/index.html`, {}, {
      DB: db,
      ...B2_ENV,
      GAME_ORIGIN: "https://play.owogg.com",
    } as any),
  );
  assert.equal(res.status, 200);
});

// ── cache HIT still applies the latest policy headers (2026-08-18 fix, reused verbatim) ──────

class FakeCache {
  store = new Map<string, Response>();
  async match(request: Request) {
    return this.store.get(request.url)?.clone();
  }
  async put(request: Request, response: Response) {
    this.store.set(request.url, response.clone());
  }
}

const fakeExecutionCtx = {
  waitUntil: (promise: Promise<unknown>) => void promise,
  passThroughOnException: () => {},
};

function withFakeCaches<T>(run: () => Promise<T>): Promise<T> {
  const original = (globalThis as { caches?: unknown }).caches;
  (globalThis as { caches?: unknown }).caches = { default: new FakeCache() };
  return run().finally(() => {
    (globalThis as { caches?: unknown }).caches = original;
  });
}

test("a cache HIT rebuilds CORS/CSP fresh from the current FRONTEND_URL, never replaying a stale stored policy header", async () => {
  const db = createDb();

  await withFakeCaches(async () => {
    const first = await withStorage(publishedObjects(), () =>
      app.request(
        `/official-games/${SLUG}/${VERSION}/index.html`,
        {},
        { DB: db, ...B2_ENV, FRONTEND_URL: "https://www.owogg.com" } as any,
        fakeExecutionCtx as any,
      ),
    );
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("Access-Control-Allow-Origin"), "*");

    // Overwrite the byte-cache entry the way a pre-fix edge entry would look: full response
    // headers stored verbatim, including a deliberately wrong CORS origin and CSP.
    const cache = (
      (globalThis as { caches?: { default: FakeCache } }).caches as { default: FakeCache }
    ).default;
    const [key] = [...cache.store.keys()].filter((k) =>
      k.includes(`/official-games/${SLUG}/${VERSION}/index.html`),
    );
    assert.ok(key, "expected the byte-cache entry to exist after the first request");
    const staleBody = await cache.store.get(key)!.clone().arrayBuffer();
    cache.store.set(
      key,
      new Response(staleBody, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "https://evil.example",
          "Content-Security-Policy": "default-src 'none'",
        },
      }),
    );

    const second = await withStorage(publishedObjects(), () =>
      app.request(
        `/official-games/${SLUG}/${VERSION}/index.html`,
        {},
        { DB: db, ...B2_ENV, FRONTEND_URL: "https://www.owogg.com" } as any,
        fakeExecutionCtx as any,
      ),
    );

    assert.equal(second.status, 200);
    assert.equal(
      second.headers.get("Access-Control-Allow-Origin"),
      "*",
      "must not replay the stale entry's wrong ACAO",
    );
    const csp = second.headers.get("Content-Security-Policy") ?? "";
    assert.match(csp, /frame-ancestors https:\/\/www\.owogg\.com/);
    assert.ok(!csp.includes("default-src 'none'"), "must not replay the stale entry's CSP");
  });
});

test("a cache HIT reuses the cached body byte-for-byte, without touching storage again", async () => {
  const db = createDb();

  await withFakeCaches(async () => {
    const stub1 = createStorageStub(publishedObjects());
    let first: Response;
    try {
      first = await app.request(
        `/official-games/${SLUG}/${VERSION}/game.js`,
        {},
        { DB: db, ...B2_ENV } as any,
        fakeExecutionCtx as any,
      );
    } finally {
      stub1.restore();
    }
    assert.equal(first.status, 200);
    const firstBody = new Uint8Array(await first.arrayBuffer());

    // Deliberately empty storage for the second request — a HIT must not need it.
    const stub2 = createStorageStub({});
    let second: Response;
    try {
      second = await app.request(
        `/official-games/${SLUG}/${VERSION}/game.js`,
        {},
        { DB: db, ...B2_ENV } as any,
        fakeExecutionCtx as any,
      );
    } finally {
      stub2.restore();
    }

    assert.equal(second.status, 200, "a HIT must not need storage — this stub has nothing stored");
    assert.deepEqual(stub2.requestedKeys, [], "storage must not be touched again on a cache HIT");
    assert.deepEqual(new Uint8Array(await second.arrayBuffer()), firstBody);
  });
});
