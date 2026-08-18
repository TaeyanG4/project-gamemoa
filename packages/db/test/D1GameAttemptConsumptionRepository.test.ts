import test from "node:test";
import assert from "node:assert/strict";
import { D1GameAttemptConsumptionRepository } from "../src/d1/D1GameAttemptConsumptionRepository.js";
import { createSqliteD1, GAME_ATTEMPT_CONSUMPTIONS_TEST_SCHEMA } from "./helpers/sqliteD1.js";
import type { DatabaseSync } from "node:sqlite";

function seedFixtures(raw: DatabaseSync) {
  raw
    .prepare(`INSERT INTO users (id, nickname, email, created_at) VALUES (1, 'Dev', 'd@e.com', ?)`)
    .run(new Date().toISOString());
  raw
    .prepare(
      `INSERT INTO sandbox_games (id, slug, developer_user_id, title, genre, visibility, live_version_id, created_at, updated_at)
       VALUES (1, 'test-game', 1, 'Test Game', 'puzzle', 'PUBLIC', 1, ?, ?)`,
    )
    .run(new Date().toISOString(), new Date().toISOString());
  raw
    .prepare(
      `INSERT INTO sandbox_game_versions (id, game_id, object_key, content_hash, bundle_bytes, status, uploaded_at)
       VALUES (1, 1, 'uploads/1/a.zip', 'hash', 100, 'APPROVED', ?)`,
    )
    .run(new Date().toISOString());
}

function claim(
  input: Partial<Parameters<D1GameAttemptConsumptionRepository["consumeAttempt"]>[0]> = {},
) {
  return {
    attemptId: "11111111-1111-1111-1111-111111111111",
    userId: 1,
    gameId: 1,
    versionId: 1,
    nowIso: new Date().toISOString(),
    ...input,
  };
}

test("the first consume of an attemptId succeeds", async () => {
  const { db, raw } = createSqliteD1(GAME_ATTEMPT_CONSUMPTIONS_TEST_SCHEMA);
  seedFixtures(raw);
  const repo = new D1GameAttemptConsumptionRepository(db);

  const result = await repo.consumeAttempt(claim());
  assert.deepEqual(result, { consumed: true });

  const row = raw
    .prepare(`SELECT * FROM game_attempt_consumptions WHERE attempt_id = ?`)
    .get("11111111-1111-1111-1111-111111111111") as Record<string, unknown>;
  assert.equal(row.user_id, 1);
  assert.equal(row.game_id, 1);
  assert.equal(row.version_id, 1);
});

test("consuming the same attemptId a second time is rejected — the row is untouched by the second call", async () => {
  const { db, raw } = createSqliteD1(GAME_ATTEMPT_CONSUMPTIONS_TEST_SCHEMA);
  seedFixtures(raw);
  const repo = new D1GameAttemptConsumptionRepository(db);

  const first = await repo.consumeAttempt(claim());
  assert.equal(first.consumed, true);

  // A second attempt to consume the SAME attemptId, even with different (userId/gameId/versionId)
  // claims — the attemptId itself is the unique key, not the tuple of who's claiming it.
  const second = await repo.consumeAttempt(claim({ userId: 2, gameId: 99, versionId: 5 }));
  assert.deepEqual(second, { consumed: false });

  const rows = raw.prepare(`SELECT * FROM game_attempt_consumptions`).all() as Record<
    string,
    unknown
  >[];
  assert.equal(rows.length, 1, "a rejected second consume must not write a second row");
  assert.equal(rows[0]?.user_id, 1, "the original row's claim is untouched by the rejected retry");
});

test("a different attemptId is a completely independent claim", async () => {
  const { db, raw } = createSqliteD1(GAME_ATTEMPT_CONSUMPTIONS_TEST_SCHEMA);
  seedFixtures(raw);
  const repo = new D1GameAttemptConsumptionRepository(db);

  const first = await repo.consumeAttempt(
    claim({ attemptId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }),
  );
  const second = await repo.consumeAttempt(
    claim({ attemptId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }),
  );

  assert.equal(first.consumed, true);
  assert.equal(second.consumed, true);
});

test("concurrent consume calls for the same attemptId — exactly one succeeds (real race, not simulated)", async () => {
  const { db, raw } = createSqliteD1(GAME_ATTEMPT_CONSUMPTIONS_TEST_SCHEMA);
  seedFixtures(raw);
  const repo = new D1GameAttemptConsumptionRepository(db);

  // Ten concurrent duplicate requests fired at once, all claiming the exact same attemptId — D1's
  // single serialized query queue (see docs/DATABASE.md §4) means these interleave at the
  // statement level exactly like concurrent HTTP requests would in production, which is the
  // scenario the PRIMARY KEY / ON CONFLICT DO NOTHING pairing exists to make safe.
  const results = await Promise.all(Array.from({ length: 10 }, () => repo.consumeAttempt(claim())));

  const succeeded = results.filter((r) => r.consumed);
  assert.equal(succeeded.length, 1, "exactly 1 of 10 concurrent duplicate requests may succeed");

  const rows = raw.prepare(`SELECT * FROM game_attempt_consumptions`).all() as unknown[];
  assert.equal(rows.length, 1, "only one row is ever written, regardless of how many raced");
});

test("the PRIMARY KEY itself rejects a second row for an already-claimed attemptId, independent of app logic", () => {
  const { raw } = createSqliteD1(GAME_ATTEMPT_CONSUMPTIONS_TEST_SCHEMA);
  seedFixtures(raw);

  raw
    .prepare(
      `INSERT INTO game_attempt_consumptions (attempt_id, user_id, game_id, version_id, consumed_at)
       VALUES ('11111111-1111-1111-1111-111111111111', 1, 1, 1, ?)`,
    )
    .run(new Date().toISOString());

  // Bypass the repository entirely and try to insert a second row with the same attempt_id
  // directly via raw SQL, no ON CONFLICT clause — this is the actual DB invariant, not the
  // application code's cooperation with it.
  assert.throws(() => {
    raw
      .prepare(
        `INSERT INTO game_attempt_consumptions (attempt_id, user_id, game_id, version_id, consumed_at)
         VALUES ('11111111-1111-1111-1111-111111111111', 2, 2, 2, ?)`,
      )
      .run(new Date().toISOString());
  });
});
