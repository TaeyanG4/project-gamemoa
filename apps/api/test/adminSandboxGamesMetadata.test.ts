import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/index.js";
import { hashSessionToken } from "@owogg/db";

// Stage C-2 (Creator B2 canonical write-through) route-level wiring — the actual sync logic
// (patch/first-create/parity-check semantics) is covered thoroughly at the use-case level in
// packages/core/test/sandboxGameUseCases.test.ts and packages/core/test/
// creatorGameCanonicalPatch.test.ts; this file only proves PATCH /api/admin/sandbox-games/:id/
// metadata is wired correctly: it now requires a real B2 config (never a silent D1-only
// fallback), and request-shape validation still runs before that check.

const OWOGG_SESSION_RAW_TOKEN = "valid_session";
const ADMIN_SESSION_RAW_TOKEN = "admin_session_valid_token";
const OWOGG_SESSION_TOKEN_HASH = await hashSessionToken(OWOGG_SESSION_RAW_TOKEN);
const ADMIN_SESSION_TOKEN_HASH = await hashSessionToken(ADMIN_SESSION_RAW_TOKEN);

const ADMIN_COOKIE = "owogg_session=valid_session; owogg_admin_session=admin_session_valid_token";

/** A root-via-ADMIN_USER_IDS elevated admin session — no admin_accounts row, matching
 * adminCreators.test.ts's own established fake-DB convention for this exact auth chain. */
function createAdminDb(options: { userId: number; sandboxGameRow?: Record<string, unknown> }) {
  const gameQueries: string[] = [];
  function statement(query: string) {
    let values: unknown[] = [];
    return {
      query,
      bind(...bound: unknown[]) {
        values = bound;
        return this;
      },
      async first<T>() {
        if (query.includes("FROM admin_sessions WHERE token_hash")) {
          const [queriedTokenHash] = values as [string];
          if (queriedTokenHash !== ADMIN_SESSION_TOKEN_HASH) return null;
          return {
            id: 1,
            token_hash: ADMIN_SESSION_TOKEN_HASH,
            user_id: options.userId,
            session_token_hash: OWOGG_SESSION_TOKEN_HASH,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            revoked_at: null,
          } as T;
        }
        if (query.includes("JOIN users u ON s.user_id = u.id")) {
          return {
            session_id: "valid_session",
            user_id: options.userId,
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            session_created_at: new Date().toISOString(),
            nickname: "admin",
            email: "admin@example.com",
            avatar_url: null,
            user_created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as T;
        }
        if (query.includes("FROM admin_accounts WHERE user_id")) {
          return null; // root-via-ADMIN_USER_IDS, never a managed admin in these tests
        }
        if (query.includes("FROM sandbox_games WHERE id")) {
          gameQueries.push(query);
          return (options.sandboxGameRow ?? null) as T;
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
    gameQueries,
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

test("PATCH /api/admin/sandbox-games/:id/metadata returns 503 GAME_BUNDLES_NOT_CONFIGURED when B2 config is absent, and never reaches sandbox_games at all", async () => {
  const { db, gameQueries } = createAdminDb({ userId: 1 });
  const res = await app.request(
    "/api/admin/sandbox-games/1/metadata",
    {
      method: "PATCH",
      headers: {
        Cookie: ADMIN_COOKIE,
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "New Title" }),
    },
    { DB: db, ADMIN_USER_IDS: "1", FRONTEND_URL: "http://localhost:5173" } as any,
  );

  assert.equal(res.status, 503);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, "GAME_BUNDLES_NOT_CONFIGURED");
  // No fallback to a D1-only update — the row is never even looked up.
  assert.equal(gameQueries.length, 0);
});

test("PATCH /api/admin/sandbox-games/:id/metadata still validates the request body before the B2 config check", async () => {
  const { db } = createAdminDb({ userId: 1 });
  const res = await app.request(
    "/api/admin/sandbox-games/1/metadata",
    {
      method: "PATCH",
      headers: {
        Cookie: ADMIN_COOKIE,
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
      },
      // title exceeds the 60-char cap — SandboxGameMetadataUpdateRequestSchema must reject this
      // with a plain 400, the same as before Stage C-2, regardless of B2 config.
      body: JSON.stringify({ title: "x".repeat(61) }),
    },
    { DB: db, ADMIN_USER_IDS: "1", FRONTEND_URL: "http://localhost:5173" } as any,
  );

  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, "INVALID_REQUEST");
});

test("PATCH /api/admin/sandbox-games/:id/metadata is still denied for a non-admin, regardless of B2 config", async () => {
  const { db } = createAdminDb({ userId: 7 });
  const res = await app.request(
    "/api/admin/sandbox-games/1/metadata",
    {
      method: "PATCH",
      headers: {
        Cookie: "owogg_session=valid_session",
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "New Title" }),
    },
    { DB: db, ADMIN_USER_IDS: "1", FRONTEND_URL: "http://localhost:5173" } as any,
  );

  // userId 7 is not in ADMIN_USER_IDS ("1") -> not eligible at all, same 403 as
  // adminCreators.test.ts's own "non-admin is denied" case.
  assert.equal(res.status, 403);
});

test("GET /api/admin/sandbox-games (an unrelated, non-B2 admin route) is unaffected by the metadata route's new B2 requirement", async () => {
  const { db } = createAdminDb({ userId: 1 });
  const res = await app.request("/api/admin/sandbox-games", { headers: { Cookie: ADMIN_COOKIE } }, {
    DB: db,
    ADMIN_USER_IDS: "1",
    FRONTEND_URL: "http://localhost:5173",
  } as any);

  assert.equal(res.status, 200);
});
