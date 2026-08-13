import test from "node:test";
import assert from "node:assert/strict";
import { D1AdminAuthRepository } from "../src/d1/D1AdminAuthRepository.js";
import { createSqliteD1, ADMIN_AUTH_TEST_SCHEMA } from "./helpers/sqliteD1.js";

function iso(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

test("step-up challenge: consume succeeds once, then fails on replay", async () => {
  const { db } = createSqliteD1(ADMIN_AUTH_TEST_SCHEMA);
  const repo = new D1AdminAuthRepository(db);

  const { rawToken } = await repo.createStepUpChallenge({
    userId: 1,
    googleSub: "google-sub-1",
    rawSessionToken: "session-raw-token",
    nowIso: iso(),
    expiresAtIso: iso(5 * 60 * 1000),
  });

  const first = await repo.consumeStepUpChallenge({
    rawToken,
    rawSessionToken: "session-raw-token",
    nowIso: iso(),
  });
  assert.deepEqual(first, { userId: 1, googleSub: "google-sub-1" });

  const replay = await repo.consumeStepUpChallenge({
    rawToken,
    rawSessionToken: "session-raw-token",
    nowIso: iso(),
  });
  assert.equal(replay, null);
});

test("step-up challenge: expired challenge is rejected", async () => {
  const { db } = createSqliteD1(ADMIN_AUTH_TEST_SCHEMA);
  const repo = new D1AdminAuthRepository(db);

  const { rawToken } = await repo.createStepUpChallenge({
    userId: 1,
    googleSub: "google-sub-1",
    rawSessionToken: "session-raw-token",
    nowIso: iso(-10 * 60 * 1000),
    expiresAtIso: iso(-5 * 60 * 1000), // already expired
  });

  const result = await repo.consumeStepUpChallenge({
    rawToken,
    rawSessionToken: "session-raw-token",
    nowIso: iso(),
  });
  assert.equal(result, null);
});

test("step-up challenge: bound to a different underlying session token is rejected", async () => {
  const { db } = createSqliteD1(ADMIN_AUTH_TEST_SCHEMA);
  const repo = new D1AdminAuthRepository(db);

  const { rawToken } = await repo.createStepUpChallenge({
    userId: 1,
    googleSub: "google-sub-1",
    rawSessionToken: "session-A",
    nowIso: iso(),
    expiresAtIso: iso(5 * 60 * 1000),
  });

  const result = await repo.consumeStepUpChallenge({
    rawToken,
    rawSessionToken: "session-B",
    nowIso: iso(),
  });
  assert.equal(result, null);
});

test("admin session: valid session is found, expired/revoked/wrong-session are rejected", async () => {
  const { db } = createSqliteD1(ADMIN_AUTH_TEST_SCHEMA);
  const repo = new D1AdminAuthRepository(db);

  const { rawToken } = await repo.createAdminSession({
    userId: 7,
    rawSessionToken: "session-A",
    nowIso: iso(),
    expiresAtIso: iso(30 * 60 * 1000),
  });

  const valid = await repo.findValidAdminSession({
    rawToken,
    rawSessionToken: "session-A",
    nowIso: iso(),
  });
  assert.ok(valid);
  assert.equal(valid?.userId, 7);

  const wrongSession = await repo.findValidAdminSession({
    rawToken,
    rawSessionToken: "session-B",
    nowIso: iso(),
  });
  assert.equal(wrongSession, null);

  await repo.revokeAdminSession(rawToken);
  const afterRevoke = await repo.findValidAdminSession({
    rawToken,
    rawSessionToken: "session-A",
    nowIso: iso(),
  });
  assert.equal(afterRevoke, null);
});

test("admin session: expires after its absolute TTL", async () => {
  const { db } = createSqliteD1(ADMIN_AUTH_TEST_SCHEMA);
  const repo = new D1AdminAuthRepository(db);

  const { rawToken } = await repo.createAdminSession({
    userId: 7,
    rawSessionToken: "session-A",
    nowIso: iso(-40 * 60 * 1000),
    expiresAtIso: iso(-10 * 60 * 1000), // expired 10 minutes ago
  });

  const result = await repo.findValidAdminSession({
    rawToken,
    rawSessionToken: "session-A",
    nowIso: iso(),
  });
  assert.equal(result, null);
});

test("revokeAdminSessionsForSessionToken revokes every admin session bound to that session", async () => {
  const { db } = createSqliteD1(ADMIN_AUTH_TEST_SCHEMA);
  const repo = new D1AdminAuthRepository(db);

  const s1 = await repo.createAdminSession({
    userId: 7,
    rawSessionToken: "session-A",
    nowIso: iso(),
    expiresAtIso: iso(30 * 60 * 1000),
  });
  const s2 = await repo.createAdminSession({
    userId: 7,
    rawSessionToken: "session-A",
    nowIso: iso(),
    expiresAtIso: iso(30 * 60 * 1000),
  });

  await repo.revokeAdminSessionsForSessionToken("session-A");

  assert.equal(
    await repo.findValidAdminSession({
      rawToken: s1.rawToken,
      rawSessionToken: "session-A",
      nowIso: iso(),
    }),
    null,
  );
  assert.equal(
    await repo.findValidAdminSession({
      rawToken: s2.rawToken,
      rawSessionToken: "session-A",
      nowIso: iso(),
    }),
    null,
  );
});

test("revokeAllAdminSessionsForUserId revokes every session for that user, leaves other users' sessions intact", async () => {
  const { db } = createSqliteD1(ADMIN_AUTH_TEST_SCHEMA);
  const repo = new D1AdminAuthRepository(db);

  const mine1 = await repo.createAdminSession({
    userId: 7,
    rawSessionToken: "session-A",
    nowIso: iso(),
    expiresAtIso: iso(30 * 60 * 1000),
  });
  const mine2 = await repo.createAdminSession({
    userId: 7,
    rawSessionToken: "session-B",
    nowIso: iso(),
    expiresAtIso: iso(30 * 60 * 1000),
  });
  const other = await repo.createAdminSession({
    userId: 8,
    rawSessionToken: "session-C",
    nowIso: iso(),
    expiresAtIso: iso(30 * 60 * 1000),
  });

  await repo.revokeAllAdminSessionsForUserId(7);

  assert.equal(
    await repo.findValidAdminSession({
      rawToken: mine1.rawToken,
      rawSessionToken: "session-A",
      nowIso: iso(),
    }),
    null,
  );
  assert.equal(
    await repo.findValidAdminSession({
      rawToken: mine2.rawToken,
      rawSessionToken: "session-B",
      nowIso: iso(),
    }),
    null,
  );
  assert.ok(
    await repo.findValidAdminSession({
      rawToken: other.rawToken,
      rawSessionToken: "session-C",
      nowIso: iso(),
    }),
  );
});

test("login attempts: only failed attempts inside the window are returned", async () => {
  const { db } = createSqliteD1(ADMIN_AUTH_TEST_SCHEMA);
  const repo = new D1AdminAuthRepository(db);

  const now = Date.now();
  await repo.recordLoginAttempt({
    userId: 1,
    success: false,
    nowIso: new Date(now - 20 * 60 * 1000).toISOString(), // outside a 15 min window
  });
  await repo.recordLoginAttempt({
    userId: 1,
    success: false,
    nowIso: new Date(now - 5 * 60 * 1000).toISOString(),
  });
  await repo.recordLoginAttempt({
    userId: 1,
    success: true,
    nowIso: new Date(now - 4 * 60 * 1000).toISOString(),
  });
  await repo.recordLoginAttempt({
    userId: 2,
    success: false,
    nowIso: new Date(now - 1 * 60 * 1000).toISOString(),
  });

  const sinceIso = new Date(now - 15 * 60 * 1000).toISOString();
  const failed = await repo.listRecentFailedAttempts(1, sinceIso);
  assert.equal(failed.length, 1);
});

test("cleanupExpired removes expired challenges/sessions and old login attempts, bounded", async () => {
  const { db } = createSqliteD1(ADMIN_AUTH_TEST_SCHEMA);
  const repo = new D1AdminAuthRepository(db);

  await repo.createStepUpChallenge({
    userId: 1,
    googleSub: "sub",
    rawSessionToken: "s",
    nowIso: iso(-20 * 60 * 1000),
    expiresAtIso: iso(-15 * 60 * 1000),
  });
  await repo.createAdminSession({
    userId: 1,
    rawSessionToken: "s",
    nowIso: iso(-60 * 60 * 1000),
    expiresAtIso: iso(-30 * 60 * 1000),
  });
  await repo.recordLoginAttempt({
    userId: 1,
    success: false,
    nowIso: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // > 24h old
  });

  await repo.cleanupExpired(iso());

  // No exceptions and the tables should now be empty (verified indirectly via a fresh
  // rate-limit query returning nothing for the pruned attempt).
  const sinceIso = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const failed = await repo.listRecentFailedAttempts(1, sinceIso);
  assert.equal(failed.length, 0);
});
