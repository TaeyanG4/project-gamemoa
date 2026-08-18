import test from "node:test";
import assert from "node:assert/strict";
import { D1CreatorScoreAcceptanceRepository } from "../src/d1/D1CreatorScoreAcceptanceRepository.js";
import { createSqliteD1, CREATOR_SCORE_ACCEPTANCE_TEST_SCHEMA } from "./helpers/sqliteD1.js";
import type { DatabaseSync } from "node:sqlite";

function seedFixtures(raw: DatabaseSync) {
  raw
    .prepare(`INSERT INTO users (id, nickname, email, created_at) VALUES (1, 'Dev', 'd@e.com', ?)`)
    .run(new Date().toISOString());
  raw
    .prepare(
      `INSERT INTO sandbox_games (id, slug, developer_user_id, title, genre, visibility, live_version_id, created_at, updated_at)
       VALUES (1, 'ball-dodge', 1, 'Ball Dodge', 'arcade', 'PUBLIC', 1, ?, ?)`,
    )
    .run(new Date().toISOString(), new Date().toISOString());
  raw
    .prepare(
      `INSERT INTO sandbox_game_versions (id, game_id, object_key, content_hash, bundle_bytes, status, uploaded_at)
       VALUES (1, 1, 'uploads/1/a.zip', 'hash', 100, 'APPROVED', ?)`,
    )
    .run(new Date().toISOString());
}

function acceptInput(
  overrides: Partial<Parameters<D1CreatorScoreAcceptanceRepository["acceptScore"]>[0]> = {},
) {
  return {
    attemptId: "11111111-1111-1111-1111-111111111111",
    userId: 1,
    gameId: 1,
    versionId: 1,
    slug: "ball-dodge",
    nickname: "player",
    avatarUrl: null,
    score: 42,
    difficulty: "normal",
    nowIso: new Date().toISOString(),
    ...overrides,
  };
}

test("the first accept succeeds — both the attempt-consumption row and the score row exist afterward", async () => {
  const { db, raw } = createSqliteD1(CREATOR_SCORE_ACCEPTANCE_TEST_SCHEMA);
  seedFixtures(raw);
  const repo = new D1CreatorScoreAcceptanceRepository(db);

  const result = await repo.acceptScore(acceptInput());
  assert.deepEqual(result, { accepted: true });

  const attempt = raw
    .prepare(`SELECT * FROM game_attempt_consumptions WHERE attempt_id = ?`)
    .get("11111111-1111-1111-1111-111111111111");
  assert.ok(attempt, "the attempt must be recorded as consumed");

  const scores = raw.prepare(`SELECT * FROM scores`).all() as Record<string, unknown>[];
  assert.equal(scores.length, 1);
  assert.equal(scores[0]?.game_id, "ball-dodge");
  assert.equal(scores[0]?.score, 42);
  assert.equal(scores[0]?.nickname, "player");
});

test("a second accept of the same attemptId is rejected, and no second score row is written", async () => {
  const { db, raw } = createSqliteD1(CREATOR_SCORE_ACCEPTANCE_TEST_SCHEMA);
  seedFixtures(raw);
  const repo = new D1CreatorScoreAcceptanceRepository(db);

  const first = await repo.acceptScore(acceptInput());
  assert.equal(first.accepted, true);

  // Even with a different (higher) score — the attemptId is what's spent, not the specific score
  // value; a duplicate can't slip a "better" score through either.
  const second = await repo.acceptScore(acceptInput({ score: 9999 }));
  assert.deepEqual(second, { accepted: false });

  const scores = raw.prepare(`SELECT * FROM scores`).all() as Record<string, unknown>[];
  assert.equal(scores.length, 1, "a rejected accept must not write a second score row");
  assert.equal(scores[0]?.score, 42, "the original accepted score is untouched");
});

test("an attemptId already consumed by SOME other means (not this repository) still blocks the score write", async () => {
  // Simulates game_attempt_consumptions already holding a row for this attemptId — e.g. written
  // by GameAttemptConsumptionRepository directly, or a prior request this repository didn't see.
  // The atomic gate must still work: no assumption that this repository is the only writer.
  const { db, raw } = createSqliteD1(CREATOR_SCORE_ACCEPTANCE_TEST_SCHEMA);
  seedFixtures(raw);
  raw
    .prepare(
      `INSERT INTO game_attempt_consumptions (attempt_id, user_id, game_id, version_id, consumed_at)
       VALUES ('11111111-1111-1111-1111-111111111111', 1, 1, 1, ?)`,
    )
    .run(new Date().toISOString());

  const repo = new D1CreatorScoreAcceptanceRepository(db);
  const result = await repo.acceptScore(acceptInput());

  assert.deepEqual(result, { accepted: false });
  const scores = raw.prepare(`SELECT * FROM scores`).all() as unknown[];
  assert.equal(scores.length, 0, "no score may be saved for an attemptId consumed elsewhere");
});

test("concurrent accept calls for the same attemptId — exactly one score is ever saved (real race, not simulated)", async () => {
  const { db, raw } = createSqliteD1(CREATOR_SCORE_ACCEPTANCE_TEST_SCHEMA);
  seedFixtures(raw);
  const repo = new D1CreatorScoreAcceptanceRepository(db);

  // Ten concurrent duplicate requests, all claiming the same attemptId — D1's single serialized
  // query queue means these interleave at the statement level exactly like concurrent HTTP
  // requests would in production.
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) => repo.acceptScore(acceptInput({ score: i }))),
  );

  const succeeded = results.filter((r) => r.accepted);
  assert.equal(succeeded.length, 1, "exactly 1 of 10 concurrent duplicate requests may succeed");

  const scores = raw.prepare(`SELECT * FROM scores`).all() as unknown[];
  assert.equal(
    scores.length,
    1,
    "exactly one score row is ever written, regardless of how many raced",
  );

  const attempts = raw.prepare(`SELECT * FROM game_attempt_consumptions`).all() as unknown[];
  assert.equal(attempts.length, 1, "exactly one attempt-consumption row is ever written");
});

test("accept/reject reads meta.rows_written on the scores INSERT, not meta.changes — the SQL changes() gate and the accept/reject decision are deliberately different signals", async () => {
  // A fake batch() that deliberately makes `changes` and `rows_written` disagree on the scores
  // INSERT result, so a repository that (incorrectly) fell back to reading `changes` here would
  // report the opposite of what this test asserts. Proves the implementation reads
  // `rows_written` specifically, not merely "whichever numeric field happens to be present."
  function fakeDb(scoreMeta: { changes: number; rows_written: number }) {
    const calls: Array<{ query: string; values: unknown[] }> = [];
    function statement(query: string) {
      let values: unknown[] = [];
      return {
        bind(...bound: unknown[]) {
          values = bound;
          return this;
        },
        query,
        get values() {
          return values;
        },
      };
    }
    return {
      calls,
      db: {
        prepare(query: string) {
          return statement(query);
        },
        async batch(statements: Array<ReturnType<typeof statement>>) {
          for (const s of statements) calls.push({ query: s.query, values: s.values });
          return [
            { success: true, meta: { changes: 1, rows_written: 1 } }, // attempt-consume: fresh
            { success: true, meta: scoreMeta }, // scores INSERT: the field under test
          ];
        },
      },
    };
  }

  const acceptedCase = fakeDb({ changes: 0, rows_written: 1 });
  const repoAccepted = new D1CreatorScoreAcceptanceRepository(acceptedCase.db as never);
  const acceptedResult = await repoAccepted.acceptScore(acceptInput());
  assert.deepEqual(
    acceptedResult,
    { accepted: true },
    "rows_written: 1 must accept even though changes reads 0",
  );

  const rejectedCase = fakeDb({ changes: 1, rows_written: 0 });
  const repoRejected = new D1CreatorScoreAcceptanceRepository(rejectedCase.db as never);
  const rejectedResult = await repoRejected.acceptScore(acceptInput());
  assert.deepEqual(
    rejectedResult,
    { accepted: false },
    "rows_written: 0 must reject even though changes reads 1",
  );
});

test("different attemptIds are independent — each may accept its own score", async () => {
  const { db, raw } = createSqliteD1(CREATOR_SCORE_ACCEPTANCE_TEST_SCHEMA);
  seedFixtures(raw);
  const repo = new D1CreatorScoreAcceptanceRepository(db);

  const first = await repo.acceptScore(
    acceptInput({ attemptId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", score: 10 }),
  );
  const second = await repo.acceptScore(
    acceptInput({ attemptId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", score: 20 }),
  );

  assert.equal(first.accepted, true);
  assert.equal(second.accepted, true);

  const scores = raw.prepare(`SELECT score FROM scores ORDER BY score`).all() as {
    score: number;
  }[];
  assert.deepEqual(
    scores.map((s) => s.score),
    [10, 20],
  );
});
