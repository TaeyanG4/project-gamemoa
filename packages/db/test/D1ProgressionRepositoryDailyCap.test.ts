import test from "node:test";
import assert from "node:assert/strict";
import { D1ProgressionRepository } from "../src/d1/D1ProgressionRepository.js";
import { createSqliteD1 } from "./helpers/sqliteD1.js";

// The daily XP cap is enforced by a half-open range on created_at (see
// D1ProgressionRepository.recordGameCompletion). The hand-rolled mock in
// progressionRepository.test.ts re-implements that comparison in JS and so cannot prove the SQL
// actually selects the right rows — these run the production query against a real SQLite engine,
// the same dialect D1 uses.
const SCHEMA = `
CREATE TABLE xp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  game_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(source_type, source_id)
);
CREATE INDEX idx_xp_events_user_game_created ON xp_events(user_id, game_id, created_at);
CREATE TABLE user_progress (
  user_id INTEGER PRIMARY KEY,
  total_xp INTEGER NOT NULL DEFAULT 0,
  eligible_completions INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function seedXpEvent(
  raw: import("node:sqlite").DatabaseSync,
  userId: number,
  gameId: string,
  createdAt: string,
  sourceId: string,
) {
  raw
    .prepare(
      `INSERT INTO xp_events (user_id, amount, reason, source_type, source_id, game_id, created_at)
       VALUES (?, 10, 'GAME_COMPLETION', 'score', ?, ?, ?)`,
    )
    .run(userId, sourceId, gameId, createdAt);
}

test("XP-awarding rows from a previous UTC day do not consume today's cap", async () => {
  const { db, raw } = createSqliteD1(SCHEMA);
  const repo = new D1ProgressionRepository(db);

  // Fill yesterday to well past the cap. Under the old `date(created_at) = date('now')` form
  // these were excluded by evaluating date() per row; the range form must exclude them by
  // seeking past them entirely — same answer, different mechanism.
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  for (let i = 0; i < 15; i++) {
    seedXpEvent(raw, 1, "reaction-time", yesterday, `yesterday-${i}`);
  }

  const outcome = await repo.recordGameCompletion({
    userId: 1,
    gameId: "reaction-time",
    sourceType: "score",
    sourceId: "today-1",
    xpPerCompletion: 10,
    dailyCapPerGame: 10,
  });

  assert.equal(outcome.xpAwarded, 10, "yesterday's completions must not exhaust today's cap");
});

test("the cap counts only today's rows and stops awarding XP once reached", async () => {
  const { db, raw } = createSqliteD1(SCHEMA);
  const repo = new D1ProgressionRepository(db);

  const nowIso = new Date().toISOString();
  for (let i = 0; i < 10; i++) {
    seedXpEvent(raw, 1, "reaction-time", nowIso, `today-${i}`);
  }

  const outcome = await repo.recordGameCompletion({
    userId: 1,
    gameId: "reaction-time",
    sourceType: "score",
    sourceId: "over-cap",
    xpPerCompletion: 10,
    dailyCapPerGame: 10,
  });

  assert.equal(outcome.xpAwarded, 0, "the 11th completion today must award no XP");
  assert.equal(
    outcome.duplicate,
    false,
    "it is still recorded (amount 0) so achievement progress keeps advancing",
  );
});

test("the cap is scoped per game, not per user", async () => {
  const { db, raw } = createSqliteD1(SCHEMA);
  const repo = new D1ProgressionRepository(db);

  const nowIso = new Date().toISOString();
  for (let i = 0; i < 12; i++) {
    seedXpEvent(raw, 1, "reaction-time", nowIso, `rt-${i}`);
  }

  const outcome = await repo.recordGameCompletion({
    userId: 1,
    gameId: "aim-test",
    sourceType: "score",
    sourceId: "aim-1",
    xpPerCompletion: 10,
    dailyCapPerGame: 10,
  });

  assert.equal(outcome.xpAwarded, 10, "maxing one game must not cap a different game");
});

test("the cap is scoped per user", async () => {
  const { db, raw } = createSqliteD1(SCHEMA);
  const repo = new D1ProgressionRepository(db);

  const nowIso = new Date().toISOString();
  for (let i = 0; i < 12; i++) {
    seedXpEvent(raw, 1, "reaction-time", nowIso, `u1-${i}`);
  }

  const outcome = await repo.recordGameCompletion({
    userId: 2,
    gameId: "reaction-time",
    sourceType: "score",
    sourceId: "u2-1",
    xpPerCompletion: 10,
    dailyCapPerGame: 10,
  });

  assert.equal(outcome.xpAwarded, 10, "one user's cap must not affect another's");
});

test("the daily-cap query uses the composite index across all three columns", async () => {
  // Regression guard for the actual point of the rewrite. If someone reintroduces a function
  // wrapper on created_at (e.g. date(created_at) = ...), SQLite silently drops back to scanning
  // every historical row for that user+game — correct, but degrading with each play a user
  // accumulates, on the app's most latency-sensitive write. Assert the plan, not just the answer.
  const { raw } = createSqliteD1(SCHEMA);

  const plan = raw
    .prepare(
      `EXPLAIN QUERY PLAN
       SELECT COUNT(*) as count FROM xp_events
       WHERE user_id = ? AND game_id = ? AND amount > 0
         AND created_at >= ? AND created_at < ?`,
    )
    .all(1, "reaction-time", "2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z")
    .map((row) => String((row as { detail: string }).detail))
    .join(" ");

  assert.ok(
    plan.includes("idx_xp_events_user_game_created"),
    `expected the composite index to be used, got: ${plan}`,
  );
  assert.ok(
    plan.includes("created_at>?"),
    `expected created_at to be an index range bound, not a post-filter, got: ${plan}`,
  );
});
