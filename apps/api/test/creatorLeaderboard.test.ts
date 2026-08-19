import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/index.js";

// GET /api/scores/:gameId, generalized to also serve PUBLIC + live + score-policy-configured
// Creator games (feat/creator-leaderboard-read) — this file covers the Creator branch and the
// availability gate; scoresLeaderboard.test.ts already covers (and, run alongside this file,
// still proves no regression in) the SYSTEM branch untouched by this change. The underlying
// PB-dedup/sort SQL itself is D1ScoreRepository.getLeaderboard, unchanged and already proven
// against real SQLite in packages/db/test/leaderboardPersonalBest.test.ts (including ball-dodge's
// own decimal scores) — the fake `scores` table below re-implements that same dedup/sort logic in
// JS only so this file can exercise the actual HTTP route end-to-end, not to re-derive its
// correctness a second time.

interface FakeGame {
  id: number;
  slug: string;
  title: string;
  visibility: "PRIVATE" | "PUBLIC";
  live_version_id: number | null;
  score_unit?: string | null;
  score_direction?: "asc" | "desc" | null;
  score_min?: number | null;
  score_max?: number | null;
}
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

function createDb(options: { game?: FakeGame; scores?: FakeScoreRow[] }) {
  const { game, scores = [] } = options;

  function statement(query: string) {
    let values: unknown[] = [];
    return {
      bind(...bound: unknown[]) {
        values = bound;
        return this;
      },
      async first<T>() {
        const wantsGameBySlug = query.includes("FROM sandbox_games WHERE slug");
        if (wantsGameBySlug) {
          if (!game || game.slug !== values[0]) return null;
          return {
            id: game.id,
            slug: game.slug,
            developer_user_id: 1,
            title: game.title,
            short_description: null,
            description: null,
            genre: "arcade",
            xp_per_completion: 0,
            score_unit: game.score_unit ?? null,
            score_direction: game.score_direction ?? null,
            score_min: game.score_min ?? null,
            score_max: game.score_max ?? null,
            score_display_prefix: null,
            score_display_suffix: null,
            visibility: game.visibility,
            live_version_id: game.live_version_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as T;
        }
        return null;
      },
      async all<T>() {
        if (query.includes("FROM scores")) {
          const gameId = String(values[0]);
          // The real query's tie-breakers (`created_at ASC, id ASC`) always contain "ASC" — the
          // actual requested direction is only in "score ASC"/"score DESC" specifically.
          const direction = query.includes("score DESC") ? "desc" : "asc";
          const matching = scores.filter((r) => r.game_id === gameId);

          // Same dedup rule as the real SQL: one row per user, their best (per `direction`).
          const bestByUser = new Map<number, FakeScoreRow>();
          for (const row of matching) {
            const current = bestByUser.get(row.user_id);
            if (
              !current ||
              (direction === "asc" ? row.score < current.score : row.score > current.score)
            ) {
              bestByUser.set(row.user_id, row);
            }
          }
          const deduped = [...bestByUser.values()].sort((a, b) =>
            direction === "asc" ? a.score - b.score : b.score - a.score,
          );
          return { results: deduped as unknown as T[] };
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

const BALL_DODGE: FakeGame = {
  id: 8,
  slug: "ball-dodge",
  title: "공 피하기",
  visibility: "PUBLIC",
  live_version_id: 17,
  score_unit: "seconds",
  score_direction: "desc",
  score_min: 0,
  score_max: 3600,
};

test("ball-dodge (desc): the PB leaderboard is returned with the Creator game's own title", async () => {
  const db = createDb({
    game: BALL_DODGE,
    scores: [
      {
        id: 1,
        user_id: 1,
        nickname: "A",
        avatar_url: null,
        game_id: "ball-dodge",
        score: 12.75,
        difficulty: "normal",
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: 2,
        nickname: "B",
        avatar_url: null,
        game_id: "ball-dodge",
        score: 4.4,
        difficulty: "normal",
        created_at: new Date().toISOString(),
      },
    ],
  });

  const res = await app.request("/api/scores/ball-dodge", {}, { DB: db } as any);
  assert.equal(res.status, 200);

  const body = (await res.json()) as { leaderboard: Array<Record<string, unknown>> };
  assert.equal(body.leaderboard.length, 2);
  assert.equal(body.leaderboard[0]?.score, 12.75, "higher survival time ranks first (desc)");
  assert.equal(body.leaderboard[1]?.score, 4.4);
  assert.ok(
    body.leaderboard.every((row) => row.gameTitle === "공 피하기"),
    "gameTitle comes from the Creator game's own record, not a SYSTEM registry lookup",
  );
});

test("a user's best decimal score wins the PB dedup — their other, worse attempts never appear", async () => {
  const db = createDb({
    game: BALL_DODGE,
    scores: [
      {
        id: 1,
        user_id: 1,
        nickname: "A",
        avatar_url: null,
        game_id: "ball-dodge",
        score: 4.4,
        difficulty: "normal",
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: 1,
        nickname: "A",
        avatar_url: null,
        game_id: "ball-dodge",
        score: 12.75,
        difficulty: "normal",
        created_at: new Date().toISOString(),
      },
      {
        id: 3,
        user_id: 1,
        nickname: "A",
        avatar_url: null,
        game_id: "ball-dodge",
        score: 8.1,
        difficulty: "normal",
        created_at: new Date().toISOString(),
      },
    ],
  });

  const res = await app.request("/api/scores/ball-dodge", {}, { DB: db } as any);
  const body = (await res.json()) as { leaderboard: Array<Record<string, unknown>> };

  assert.equal(body.leaderboard.length, 1, "one row per user, not one per raw attempt");
  assert.equal(body.leaderboard[0]?.score, 12.75, "their true PB, not just an early or late row");
});

test("an ascending-direction Creator game (lower is better) sorts the leaderboard accordingly", async () => {
  const ascGame: FakeGame = { ...BALL_DODGE, score_direction: "asc" };
  const db = createDb({
    game: ascGame,
    scores: [
      {
        id: 1,
        user_id: 1,
        nickname: "A",
        avatar_url: null,
        game_id: "ball-dodge",
        score: 12.75,
        difficulty: "normal",
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: 2,
        nickname: "B",
        avatar_url: null,
        game_id: "ball-dodge",
        score: 4.4,
        difficulty: "normal",
        created_at: new Date().toISOString(),
      },
    ],
  });

  const res = await app.request("/api/scores/ball-dodge", {}, { DB: db } as any);
  const body = (await res.json()) as { leaderboard: Array<Record<string, unknown>> };
  assert.equal(body.leaderboard[0]?.score, 4.4, "lower score ranks first when direction is asc");
});

test("a PRIVATE Creator game 400s exactly like an unknown gameId", async () => {
  const db = createDb({ game: { ...BALL_DODGE, visibility: "PRIVATE" } });
  const res = await app.request("/api/scores/ball-dodge", {}, { DB: db } as any);

  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, "INVALID_GAME_ID");
});

test("a Creator game with no live version 400s exactly like an unknown gameId", async () => {
  const db = createDb({ game: { ...BALL_DODGE, live_version_id: null } });
  const res = await app.request("/api/scores/ball-dodge", {}, { DB: db } as any);
  assert.equal(res.status, 400);
});

test("a Creator game with no score policy configured yet 400s exactly like an unknown gameId", async () => {
  const db = createDb({
    game: {
      ...BALL_DODGE,
      score_unit: null,
      score_direction: null,
      score_min: null,
      score_max: null,
    },
  });
  const res = await app.request("/api/scores/ball-dodge", {}, { DB: db } as any);
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, "INVALID_GAME_ID");
});

test("an unknown slug (neither SYSTEM nor a Creator game at all) still 400s", async () => {
  const db = createDb({});
  const res = await app.request("/api/scores/no-such-game-anywhere", {}, { DB: db } as any);
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, "INVALID_GAME_ID");
});
