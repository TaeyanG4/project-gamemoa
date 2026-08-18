import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/index.js";

/**
 * GET /api/scores/:gameId — gameId validation now goes through the shared GameRegistry singleton
 * (container.ts's `gameRegistry`) instead of importing GAME_MANIFEST_MAP directly, and each
 * leaderboard row now carries `gameTitle` resolved server-side, so the web client no longer needs
 * its own GAME_MANIFEST_MAP-based title lookup (apps/web/app/features/scores/api.ts).
 *
 * api.test.ts and edgeCache.test.ts already cover the unknown-gameId 400 and the DB-less 200
 * shape; this file is only the behaviour those didn't exercise — gameTitle actually appearing,
 * and coming from the real registry rather than the row data.
 */

interface FakeScoreRow {
  id: number;
  user_id: number;
  nickname: string;
  avatar_url: string | null;
  game_id: string;
  score: number;
  difficulty: string;
  created_at: string;
}

function createDb(rows: FakeScoreRow[]) {
  function statement(query: string) {
    let values: unknown[] = [];
    return {
      bind(...bound: unknown[]) {
        values = bound;
        return this;
      },
      async first() {
        return null;
      },
      async all<T>() {
        if (query.includes("FROM scores")) {
          const gameId = String(values[0]);
          const matching = rows.filter((r) => r.game_id === gameId);
          return { results: matching as unknown as T[] };
        }
        return { results: [] as T[] };
      },
      async run() {
        return { success: true, meta: { changes: 0 } };
      },
    };
  }

  return {
    prepare(query: string) {
      return statement(query);
    },
    async batch(statements: Array<ReturnType<typeof statement>>) {
      return statements.map(() => ({ success: true, meta: { changes: 0 } }));
    },
  };
}

test("GET /api/scores/:gameId includes the registry's title on every row, not the row's own data", async () => {
  const db = createDb([
    {
      id: 1,
      user_id: 42,
      nickname: "Player",
      avatar_url: null,
      game_id: "reaction-time",
      score: 200,
      difficulty: "normal",
      created_at: new Date().toISOString(),
    },
  ]);

  const res = await app.request("/api/scores/reaction-time", {}, { DB: db } as any);
  assert.equal(res.status, 200);

  const body = (await res.json()) as { leaderboard: Array<Record<string, unknown>> };
  assert.equal(body.leaderboard.length, 1);
  assert.equal(body.leaderboard[0]?.gameTitle, "반응속도 테스트");
});

test("GET /api/scores/:gameId still 400s a creator/unknown gameId even with a DB bound", async () => {
  // ScoreUseCases has never supported creator score submission, and this route's own gameId gate
  // (now registry-backed) is what enforces the same rule on the read side — a sandbox slug (which
  // the registry has never heard of) must not silently return an empty-but-200 leaderboard.
  const db = createDb([]);
  const res = await app.request("/api/scores/some-sandbox-game-slug", {}, { DB: db } as any);

  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, "INVALID_GAME_ID");
});

test("GET /api/scores/:gameId gameTitle is consistent across multiple rows of the same game", async () => {
  const db = createDb([
    {
      id: 1,
      user_id: 1,
      nickname: "A",
      avatar_url: null,
      game_id: "memory-test",
      score: 5,
      difficulty: "normal",
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      user_id: 2,
      nickname: "B",
      avatar_url: null,
      game_id: "memory-test",
      score: 12,
      difficulty: "normal",
      created_at: new Date().toISOString(),
    },
  ]);

  const res = await app.request("/api/scores/memory-test", {}, { DB: db } as any);
  const body = (await res.json()) as { leaderboard: Array<Record<string, unknown>> };

  assert.equal(body.leaderboard.length, 2);
  assert.ok(body.leaderboard.every((row) => row.gameTitle === "순서 기억력 테스트"));
});
