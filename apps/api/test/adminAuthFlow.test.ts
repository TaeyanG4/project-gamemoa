import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createSign, type KeyObject } from "node:crypto";
import { app } from "../src/index.js";
import { clearGoogleJwksCache } from "../src/infrastructure/oauth/google.ts";
import { createSqliteD1 } from "../../../packages/db/test/helpers/sqliteD1.js";

// Full route-level integration test for the admin step-up authentication flow, backed by a
// real SQLite engine (same helper packages/db uses) rather than a hand-rolled query-matching
// mock — this exercises the actual production SQL end to end, including hashing/binding.

const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";
const ADMIN_GOOGLE_SUB = "admin-google-sub-1";
const ADMIN_USER_ID = 1;
const GAMEMOA_SESSION_RAW = "e2e_valid_session_token";
const ADMIN_USERNAME = "gamemoa-admin";
const ADMIN_PASSWORD = "correct-horse-battery-staple";

function base64UrlEncode(buf: Uint8Array): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildJwt(
  privateKey: KeyObject,
  payload: Record<string, unknown>,
  headerKid = "test-kid-1",
): string {
  const headerB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT", kid: headerKid })),
  );
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const sig = signer.sign(privateKey);
  return `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;
}

function createRsaKeySet() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicJwk = publicKey.export({ format: "jwk" }) as Record<string, string>;
  return { privateKey, publicJwk };
}

function mockJwksFetch(keys: Record<string, string>[]) {
  const originalFetch = globalThis.fetch;
  return {
    install() {
      globalThis.fetch = (async (input: URL | RequestInfo | string) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === GOOGLE_JWKS_URI) {
          return new Response(JSON.stringify({ keys }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not Found", { status: 404 });
      }) as unknown as typeof fetch;
    },
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

function freshGooglePayload(overrides: Record<string, unknown> = {}) {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    exp: nowSec + 3600,
    iat: nowSec,
    sub: ADMIN_GOOGLE_SUB,
    email: "admin@example.com",
    email_verified: true,
    name: "Admin",
    picture: null,
    ...overrides,
  };
}

const FULL_SCHEMA = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  country TEXT,
  nickname_updated_at TEXT,
  country_updated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE oauth_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE admin_step_up_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  google_sub TEXT NOT NULL,
  session_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);
CREATE TABLE admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  session_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE TABLE admin_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  success INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE discord_guilds (
  guild_id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon_url TEXT,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'PUBLIC',
  registration_status TEXT NOT NULL DEFAULT 'ACTIVE',
  registered_by_user_id INTEGER NOT NULL,
  registered_at TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE creator_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  featured_status TEXT NOT NULL DEFAULT 'NONE',
  featured_reason TEXT,
  featured_since TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE creator_platform_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_handle TEXT,
  channel_url TEXT NOT NULL,
  avatar_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  verified_at TEXT,
  audience_count INTEGER DEFAULT 0,
  audience_count_known INTEGER NOT NULL DEFAULT 0,
  channel_created_at TEXT,
  metrics_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE creator_review_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_platform_account_id INTEGER NOT NULL,
  review_type TEXT NOT NULL DEFAULT 'ACQUISITION',
  status TEXT NOT NULL,
  initial_audience INTEGER,
  initial_channel_created_at TEXT,
  next_check_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  review_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE TABLE creator_review_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_platform_account_id INTEGER NOT NULL,
  review_job_id INTEGER,
  reviewer_user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  metric_snapshot TEXT,
  created_at TEXT NOT NULL
);
`;

async function seedFixtures(raw: import("node:sqlite").DatabaseSync) {
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 86_400_000).toISOString();
  raw
    .prepare(`INSERT INTO users (id, nickname, created_at, updated_at) VALUES (?, ?, ?, ?)`)
    .run(ADMIN_USER_ID, "AdminUser", now, now);
  raw
    .prepare(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`)
    .run(GAMEMOA_SESSION_RAW, ADMIN_USER_ID, now, expires);
  raw
    .prepare(
      `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email, created_at) VALUES (?, 'google', ?, ?, ?)`,
    )
    .run(ADMIN_USER_ID, ADMIN_GOOGLE_SUB, "admin@example.com", now);
}

function extractCookie(res: Response, name: string): string | null {
  const setCookieHeaders =
    typeof (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [res.headers.get("set-cookie") ?? ""];
  for (const header of setCookieHeaders) {
    const match = header.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1] ?? null;
  }
  return null;
}

async function setup() {
  const { db, raw } = createSqliteD1(FULL_SCHEMA);
  await seedFixtures(raw);
  const { hashAdminPassword } = await import("../src/auth/adminPassword.js");
  const passwordRecord = await hashAdminPassword(ADMIN_PASSWORD, 1000);
  const env = {
    DB: db,
    ADMIN_USER_IDS: String(ADMIN_USER_ID),
    ADMIN_GOOGLE_SUBS: ADMIN_GOOGLE_SUB,
    ADMIN_LOGIN_USERNAME: ADMIN_USERNAME,
    ADMIN_PASSWORD_PBKDF2: passwordRecord,
    GOOGLE_CLIENT_ID: CLIENT_ID,
    FRONTEND_URL: "http://localhost:5173",
  };
  return { env };
}

test("full admin step-up flow: Google step-up -> login -> elevated session -> logout", async () => {
  clearGoogleJwksCache();
  const { privateKey, publicJwk } = createRsaKeySet();
  const jwks = mockJwksFetch([{ ...publicJwk, kid: "test-kid-1", use: "sig", alg: "RS256" }]);
  jwks.install();

  try {
    const { env } = await setup();
    const sessionCookie = `gamemoa_session=${GAMEMOA_SESSION_RAW}`;

    // Before any step-up: eligible, not admin-authenticated.
    const meBefore = await app.request(
      "/api/admin/me",
      { headers: { Cookie: sessionCookie } },
      env as any,
    );
    assert.deepEqual(await meBefore.json(), {
      authenticated: true,
      eligible: true,
      adminAuthenticated: false,
      stepUpRequired: true,
    });

    // Step 1: Google step-up.
    const idToken = buildJwt(privateKey, freshGooglePayload());
    const stepUpRes = await app.request(
      "/api/admin/auth/google",
      {
        method: "POST",
        headers: {
          Cookie: sessionCookie,
          "Content-Type": "application/json",
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ credential: idToken }),
      },
      env as any,
    );
    assert.equal(stepUpRes.status, 200);
    assert.deepEqual(await stepUpRes.json(), { stepUpVerified: true });
    const stepUpCookie = extractCookie(stepUpRes, "gamemoa_admin_stepup");
    assert.ok(stepUpCookie, "step-up cookie must be set");

    // Step 2: admin username/password login.
    const loginRes = await app.request(
      "/api/admin/auth/login",
      {
        method: "POST",
        headers: {
          Cookie: `${sessionCookie}; gamemoa_admin_stepup=${stepUpCookie}`,
          "Content-Type": "application/json",
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
      },
      env as any,
    );
    assert.equal(loginRes.status, 200);
    assert.deepEqual(await loginRes.json(), { adminAuthenticated: true });
    const adminSessionCookie = extractCookie(loginRes, "gamemoa_admin_session");
    assert.ok(adminSessionCookie, "admin session cookie must be set");

    // Now elevated.
    const meAfter = await app.request(
      "/api/admin/me",
      { headers: { Cookie: `${sessionCookie}; gamemoa_admin_session=${adminSessionCookie}` } },
      env as any,
    );
    assert.deepEqual(await meAfter.json(), {
      authenticated: true,
      eligible: true,
      adminAuthenticated: true,
      stepUpRequired: false,
    });

    // Protected admin endpoint now succeeds.
    const overview = await app.request(
      "/api/admin/overview",
      { headers: { Cookie: `${sessionCookie}; gamemoa_admin_session=${adminSessionCookie}` } },
      env as any,
    );
    assert.equal(overview.status, 200);

    // The step-up challenge is single-use — retrying login with the same (now-cleared) cookie fails.
    const replayLogin = await app.request(
      "/api/admin/auth/login",
      {
        method: "POST",
        headers: {
          Cookie: `${sessionCookie}; gamemoa_admin_stepup=${stepUpCookie}`,
          "Content-Type": "application/json",
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
      },
      env as any,
    );
    assert.equal(replayLogin.status, 403);

    // Logout revokes the admin session.
    const logout = await app.request(
      "/api/admin/auth/logout",
      {
        method: "POST",
        headers: {
          Cookie: `${sessionCookie}; gamemoa_admin_session=${adminSessionCookie}`,
          Origin: "http://localhost:5173",
        },
      },
      env as any,
    );
    assert.equal(logout.status, 200);

    const afterLogout = await app.request(
      "/api/admin/overview",
      { headers: { Cookie: `${sessionCookie}; gamemoa_admin_session=${adminSessionCookie}` } },
      env as any,
    );
    assert.equal(afterLogout.status, 403);
  } finally {
    jwks.restore();
  }
});

test("login without completing step-up first is denied (403), never bypasses to a session", async () => {
  clearGoogleJwksCache();
  const { env } = await setup();
  const sessionCookie = `gamemoa_session=${GAMEMOA_SESSION_RAW}`;

  const res = await app.request(
    "/api/admin/auth/login",
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
    },
    env as any,
  );
  assert.equal(res.status, 403);
});

test("Google step-up: sub not in ADMIN_GOOGLE_SUBS is denied even for an eligible user", async () => {
  clearGoogleJwksCache();
  const { privateKey, publicJwk } = createRsaKeySet();
  const jwks = mockJwksFetch([{ ...publicJwk, kid: "test-kid-1", use: "sig", alg: "RS256" }]);
  jwks.install();
  try {
    const { env } = await setup();
    const sessionCookie = `gamemoa_session=${GAMEMOA_SESSION_RAW}`;
    const idToken = buildJwt(privateKey, freshGooglePayload({ sub: "some-other-sub" }));

    const res = await app.request(
      "/api/admin/auth/google",
      {
        method: "POST",
        headers: {
          Cookie: sessionCookie,
          "Content-Type": "application/json",
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ credential: idToken }),
      },
      env as any,
    );
    assert.equal(res.status, 403);
  } finally {
    jwks.restore();
  }
});

test("Google step-up: stale token (old iat) is rejected even though still cryptographically valid", async () => {
  clearGoogleJwksCache();
  const { privateKey, publicJwk } = createRsaKeySet();
  const jwks = mockJwksFetch([{ ...publicJwk, kid: "test-kid-1", use: "sig", alg: "RS256" }]);
  jwks.install();
  try {
    const { env } = await setup();
    const sessionCookie = `gamemoa_session=${GAMEMOA_SESSION_RAW}`;
    const staleIat = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const idToken = buildJwt(privateKey, freshGooglePayload({ iat: staleIat }));

    const res = await app.request(
      "/api/admin/auth/google",
      {
        method: "POST",
        headers: {
          Cookie: sessionCookie,
          "Content-Type": "application/json",
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ credential: idToken }),
      },
      env as any,
    );
    assert.equal(res.status, 403);
  } finally {
    jwks.restore();
  }
});

test("admin login: wrong password after valid step-up is rate-limited after 5 failures", async () => {
  clearGoogleJwksCache();
  const { privateKey, publicJwk } = createRsaKeySet();
  const jwks = mockJwksFetch([{ ...publicJwk, kid: "test-kid-1", use: "sig", alg: "RS256" }]);
  jwks.install();
  try {
    const { env } = await setup();
    const sessionCookie = `gamemoa_session=${GAMEMOA_SESSION_RAW}`;

    for (let i = 0; i < 5; i++) {
      const idToken = buildJwt(privateKey, freshGooglePayload());
      const stepUpRes = await app.request(
        "/api/admin/auth/google",
        {
          method: "POST",
          headers: {
            Cookie: sessionCookie,
            "Content-Type": "application/json",
            Origin: "http://localhost:5173",
          },
          body: JSON.stringify({ credential: idToken }),
        },
        env as any,
      );
      const stepUpCookie = extractCookie(stepUpRes, "gamemoa_admin_stepup");

      const loginRes = await app.request(
        "/api/admin/auth/login",
        {
          method: "POST",
          headers: {
            Cookie: `${sessionCookie}; gamemoa_admin_stepup=${stepUpCookie}`,
            "Content-Type": "application/json",
            Origin: "http://localhost:5173",
          },
          body: JSON.stringify({ username: ADMIN_USERNAME, password: "wrong-password" }),
        },
        env as any,
      );
      assert.equal(loginRes.status, 401);
    }

    // 6th attempt (even with a fresh, valid step-up) is rate-limited before credentials are checked.
    const idToken = buildJwt(privateKey, freshGooglePayload());
    const stepUpRes = await app.request(
      "/api/admin/auth/google",
      {
        method: "POST",
        headers: {
          Cookie: sessionCookie,
          "Content-Type": "application/json",
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ credential: idToken }),
      },
      env as any,
    );
    const stepUpCookie = extractCookie(stepUpRes, "gamemoa_admin_stepup");

    const lockedRes = await app.request(
      "/api/admin/auth/login",
      {
        method: "POST",
        headers: {
          Cookie: `${sessionCookie}; gamemoa_admin_stepup=${stepUpCookie}`,
          "Content-Type": "application/json",
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }), // even correct now
      },
      env as any,
    );
    assert.equal(lockedRes.status, 429);
    assert.ok(lockedRes.headers.get("Retry-After"));
  } finally {
    jwks.restore();
  }
});

test("ADMIN_USER_IDS removed after an admin session was already issued is immediately denied", async () => {
  clearGoogleJwksCache();
  const { privateKey, publicJwk } = createRsaKeySet();
  const jwks = mockJwksFetch([{ ...publicJwk, kid: "test-kid-1", use: "sig", alg: "RS256" }]);
  jwks.install();
  try {
    const { env } = await setup();
    const sessionCookie = `gamemoa_session=${GAMEMOA_SESSION_RAW}`;
    const idToken = buildJwt(privateKey, freshGooglePayload());
    const stepUpRes = await app.request(
      "/api/admin/auth/google",
      {
        method: "POST",
        headers: {
          Cookie: sessionCookie,
          "Content-Type": "application/json",
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ credential: idToken }),
      },
      env as any,
    );
    const stepUpCookie = extractCookie(stepUpRes, "gamemoa_admin_stepup");
    const loginRes = await app.request(
      "/api/admin/auth/login",
      {
        method: "POST",
        headers: {
          Cookie: `${sessionCookie}; gamemoa_admin_stepup=${stepUpCookie}`,
          "Content-Type": "application/json",
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
      },
      env as any,
    );
    const adminSessionCookie = extractCookie(loginRes, "gamemoa_admin_session");

    // Operator removes this user from ADMIN_USER_IDS — the still-unexpired admin session cookie
    // must no longer grant access.
    const envWithoutAdmin = { ...env, ADMIN_USER_IDS: "" };
    const res = await app.request(
      "/api/admin/overview",
      { headers: { Cookie: `${sessionCookie}; gamemoa_admin_session=${adminSessionCookie}` } },
      envWithoutAdmin as any,
    );
    assert.equal(res.status, 403);
  } finally {
    jwks.restore();
  }
});
