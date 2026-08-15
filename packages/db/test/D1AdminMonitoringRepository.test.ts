import test from "node:test";
import assert from "node:assert/strict";
import { D1AdminMonitoringRepository } from "../src/d1/D1AdminMonitoringRepository.js";
import { createSqliteD1, ADMIN_MONITORING_TEST_SCHEMA } from "./helpers/sqliteD1.js";

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function seedXpEvent(raw: import("node:sqlite").DatabaseSync, userId: number, createdAt: string) {
  raw
    .prepare(
      `INSERT INTO xp_events (user_id, amount, reason, source_type, source_id, created_at)
       VALUES (?, 10, 'GAME_COMPLETION', 'score', ?, ?)`,
    )
    .run(userId, `src-${userId}-${createdAt}`, createdAt);
}

function seedScore(
  raw: import("node:sqlite").DatabaseSync,
  gameId: string,
  createdAt: string,
  userId = 1,
) {
  raw
    .prepare(
      `INSERT INTO scores (user_id, nickname, game_id, score, created_at) VALUES (?, 'p', ?, 100, ?)`,
    )
    .run(userId, gameId, createdAt);
}

test("getActiveUserCounts counts distinct users within the last 1/7 days, ignores older activity", async () => {
  const { db, raw } = createSqliteD1(ADMIN_MONITORING_TEST_SCHEMA);
  // User 1: active today AND 5 days ago (dedup'd, counts once toward both windows).
  seedXpEvent(raw, 1, isoDaysAgo(0));
  seedXpEvent(raw, 1, isoDaysAgo(5));
  // User 2: only active 5 days ago — should count toward WAU but not DAU.
  seedXpEvent(raw, 2, isoDaysAgo(5));
  // User 3: active 30 days ago — outside both windows.
  seedXpEvent(raw, 3, isoDaysAgo(30));

  const repo = new D1AdminMonitoringRepository(db);
  const { dau, wau } = await repo.getActiveUserCounts();

  assert.equal(dau, 1);
  assert.equal(wau, 2);
});

test("getGamePlayCounts groups by game within the window, most-played first, excludes older rows", async () => {
  const { db, raw } = createSqliteD1(ADMIN_MONITORING_TEST_SCHEMA);
  seedScore(raw, "reaction-time", isoDaysAgo(1));
  seedScore(raw, "reaction-time", isoDaysAgo(2));
  seedScore(raw, "aim-test", isoDaysAgo(1));
  // Outside the 7-day window — must not be counted.
  seedScore(raw, "aim-test", isoDaysAgo(30));

  const repo = new D1AdminMonitoringRepository(db);
  const counts = await repo.getGamePlayCounts(7);

  assert.deepEqual(counts, [
    { gameId: "reaction-time", count: 2 },
    { gameId: "aim-test", count: 1 },
  ]);
});

test("getGamePlayCounts returns an empty array when nothing was played in the window", async () => {
  const { db } = createSqliteD1(ADMIN_MONITORING_TEST_SCHEMA);
  const repo = new D1AdminMonitoringRepository(db);
  assert.deepEqual(await repo.getGamePlayCounts(7), []);
});

test("checkD1Health reports healthy with a non-negative latency against a live connection", async () => {
  const { db } = createSqliteD1(ADMIN_MONITORING_TEST_SCHEMA);
  const repo = new D1AdminMonitoringRepository(db);
  const result = await repo.checkD1Health();

  assert.equal(result.healthy, true);
  assert.ok(result.latencyMs >= 0);
});
