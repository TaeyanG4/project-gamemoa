import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/index.js";
import { hashSessionToken } from "@owogg/db";

// Auth-gating + routing/schema-wiring smoke tests for /api/admin/users. The underlying business
// logic (suspend/ban validation, session revocation, soft-delete reset/restore, per-user audit
// scoping) already has thorough coverage against real SQLite and in-memory fakes — see
// packages/db/test/D1UserModerationRepository.test.ts and
// packages/core/test/userModerationUseCases.test.ts. This file only confirms the route layer
// enforces the same elevated-admin gate as every other /api/admin/* endpoint and doesn't crash
// when wired end to end.
const OWOGG_SESSION_RAW_TOKEN = "valid_session";
const ADMIN_SESSION_RAW_TOKEN = "admin_session_valid_token";
const OWOGG_SESSION_TOKEN_HASH = await hashSessionToken(OWOGG_SESSION_RAW_TOKEN);
const ADMIN_SESSION_TOKEN_HASH = await hashSessionToken(ADMIN_SESSION_RAW_TOKEN);

function createAdminDb(userId: number) {
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
            user_id: userId,
            session_token_hash: OWOGG_SESSION_TOKEN_HASH,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            revoked_at: null,
          } as T;
        }
        if (query.includes("JOIN users u ON s.user_id = u.id")) {
          return {
            session_id: "valid_session",
            user_id: userId,
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            session_created_at: new Date().toISOString(),
            nickname: "admin",
            email: "admin@example.com",
            avatar_url: null,
            user_created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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

test("GET /api/admin/users is denied for non-admin", async () => {
  const mock = createAdminDb(7);
  const res = await app.request(
    "/api/admin/users?query=test",
    {
      headers: {
        Cookie: "owogg_session=valid_session; owogg_admin_session=admin_session_valid_token",
      },
    },
    { DB: mock.db, ADMIN_USER_IDS: "1" } as any,
  );
  assert.equal(res.status, 403);
});

test("GET /api/admin/users?query= returns an empty result set for an admin, not a crash", async () => {
  const mock = createAdminDb(1);
  const res = await app.request(
    "/api/admin/users?query=nobody",
    {
      headers: {
        Cookie: "owogg_session=valid_session; owogg_admin_session=admin_session_valid_token",
      },
    },
    { DB: mock.db, ADMIN_USER_IDS: "1" } as any,
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  const body = (await res.json()) as { users: unknown[] };
  assert.deepEqual(body.users, []);
});

test("GET /api/admin/users?query= with nothing typed short-circuits to an empty list without querying", async () => {
  const mock = createAdminDb(1);
  const res = await app.request(
    "/api/admin/users",
    {
      headers: {
        Cookie: "owogg_session=valid_session; owogg_admin_session=admin_session_valid_token",
      },
    },
    { DB: mock.db, ADMIN_USER_IDS: "1" } as any,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { users: unknown[] };
  assert.deepEqual(body.users, []);
});

test("GET /api/admin/users/:userId returns USER_NOT_FOUND for an id the mock DB has no row for", async () => {
  const mock = createAdminDb(1);
  const res = await app.request(
    "/api/admin/users/12345",
    {
      headers: {
        Cookie: "owogg_session=valid_session; owogg_admin_session=admin_session_valid_token",
      },
    },
    { DB: mock.db, ADMIN_USER_IDS: "1" } as any,
  );
  assert.equal(res.status, 404);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, "USER_NOT_FOUND");
});

test("POST /api/admin/users/:userId/suspend is denied for non-admin", async () => {
  const mock = createAdminDb(7);
  const res = await app.request(
    "/api/admin/users/1/suspend",
    {
      method: "POST",
      headers: {
        Cookie: "owogg_session=valid_session; owogg_admin_session=admin_session_valid_token",
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        suspendedUntil: new Date(Date.now() + 86400000).toISOString(),
        reason: "test",
      }),
    },
    { DB: mock.db, ADMIN_USER_IDS: "1", FRONTEND_URL: "http://localhost:5173" } as any,
  );
  assert.equal(res.status, 403);
});

// Every POST test below needs a matching FRONTEND_URL — the trusted-Origin check in
// isTrustedAdminOrigin only recognizes localhost as a dev exception when FRONTEND_URL is itself
// set to a localhost value (its default is the production owogg.com origin).
const LOCALHOST_ENV = { FRONTEND_URL: "http://localhost:5173" };

test("POST /api/admin/users/:userId/suspend rejects an unknown user with USER_NOT_FOUND", async () => {
  const mock = createAdminDb(1);
  const res = await app.request(
    "/api/admin/users/99999/suspend",
    {
      method: "POST",
      headers: {
        Cookie: "owogg_session=valid_session; owogg_admin_session=admin_session_valid_token",
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        suspendedUntil: new Date(Date.now() + 86400000).toISOString(),
        reason: "test",
      }),
    },
    { DB: mock.db, ADMIN_USER_IDS: "1", ...LOCALHOST_ENV } as any,
  );
  assert.equal(res.status, 404);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, "USER_NOT_FOUND");
});

test("POST /api/admin/users/:userId/ban without a reason is rejected before touching the DB", async () => {
  const mock = createAdminDb(1);
  const res = await app.request(
    "/api/admin/users/1/ban",
    {
      method: "POST",
      headers: {
        Cookie: "owogg_session=valid_session; owogg_admin_session=admin_session_valid_token",
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ reason: "" }),
    },
    { DB: mock.db, ADMIN_USER_IDS: "1", ...LOCALHOST_ENV } as any,
  );
  assert.equal(res.status, 400);
});
