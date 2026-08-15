import test from "node:test";
import assert from "node:assert/strict";
import { D1SessionRepository, hashSessionToken } from "../src/d1/D1SessionRepository.js";
import { createSqliteD1, SESSION_MODERATION_TEST_SCHEMA } from "./helpers/sqliteD1.js";

async function seedUserWithSession(
  raw: import("node:sqlite").DatabaseSync,
  rawToken: string,
  moderation?: {
    status: "SUSPENDED" | "BANNED";
    suspendedUntil?: string | null;
    scoreSubmissionBlocked?: boolean;
  },
) {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 86400000).toISOString();
  raw
    .prepare(`INSERT INTO users (id, nickname, created_at, updated_at) VALUES (1, 'p', ?, ?)`)
    .run(now, now);
  const tokenHash = await hashSessionToken(rawToken);
  raw
    .prepare(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, 1, ?, ?)`)
    .run(tokenHash, now, future);
  if (moderation) {
    raw
      .prepare(
        `INSERT INTO user_moderation (user_id, status, suspended_until, score_submission_blocked, updated_at)
         VALUES (1, ?, ?, ?, ?)`,
      )
      .run(
        moderation.status,
        moderation.suspendedUntil ?? null,
        moderation.scoreSubmissionBlocked ? 1 : 0,
        now,
      );
  }
}

test("findSession succeeds for a user with no user_moderation row (never touched)", async () => {
  const { db, raw } = createSqliteD1(SESSION_MODERATION_TEST_SCHEMA);
  await seedUserWithSession(raw, "tok-clean");
  const repo = new D1SessionRepository(db);

  const result = await repo.findSession("tok-clean");
  assert.ok(result);
  assert.equal(result.user.score_submission_blocked, false);
});

test("findSession rejects a BANNED user", async () => {
  const { db, raw } = createSqliteD1(SESSION_MODERATION_TEST_SCHEMA);
  await seedUserWithSession(raw, "tok-banned", { status: "BANNED" });
  const repo = new D1SessionRepository(db);

  assert.equal(await repo.findSession("tok-banned"), null);
});

test("findSession rejects a currently-SUSPENDED user (suspended_until in the future)", async () => {
  const { db, raw } = createSqliteD1(SESSION_MODERATION_TEST_SCHEMA);
  const future = new Date(Date.now() + 3600000).toISOString();
  await seedUserWithSession(raw, "tok-suspended", {
    status: "SUSPENDED",
    suspendedUntil: future,
  });
  const repo = new D1SessionRepository(db);

  assert.equal(await repo.findSession("tok-suspended"), null);
});

test("findSession allows a user whose SUSPENDED window has already expired", async () => {
  const { db, raw } = createSqliteD1(SESSION_MODERATION_TEST_SCHEMA);
  const past = new Date(Date.now() - 3600000).toISOString();
  await seedUserWithSession(raw, "tok-expired-suspend", {
    status: "SUSPENDED",
    suspendedUntil: past,
  });
  const repo = new D1SessionRepository(db);

  const result = await repo.findSession("tok-expired-suspend");
  assert.ok(result, "an expired suspension must not block login");
});

test("findSession allows an ACTIVE user with score_submission_blocked and surfaces the flag", async () => {
  const { db, raw } = createSqliteD1(SESSION_MODERATION_TEST_SCHEMA);
  // status defaults to 'ACTIVE' in the schema even though we only ever set scoreSubmissionBlocked.
  raw
    .prepare(
      `INSERT INTO user_moderation (user_id, status, score_submission_blocked, updated_at)
       VALUES (1, 'ACTIVE', 1, ?)`,
    )
    .run(new Date().toISOString());
  await seedUserWithSession(raw, "tok-score-blocked");
  const repo = new D1SessionRepository(db);

  const result = await repo.findSession("tok-score-blocked");
  assert.ok(result);
  assert.equal(result.user.score_submission_blocked, true);
});
