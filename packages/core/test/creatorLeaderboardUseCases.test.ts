import test from "node:test";
import assert from "node:assert/strict";
import { CreatorLeaderboardUseCases } from "../src/application/creatorLeaderboardUseCases.js";
import type { SandboxGameRecord, SandboxGameRepository } from "../src/ports/sandboxGames.js";
import type { Score, ScoreRepository } from "../src/ports/repositories.js";

// The PB-dedup/sort SQL itself is NOT re-tested here — CreatorLeaderboardUseCases calls the exact
// same D1ScoreRepository.getLeaderboard SYSTEM games already use, unchanged, and that query's
// correctness (including decimal scores and "one PB per user among many rows") is already proven
// against real SQLite in packages/db/test/leaderboardPersonalBest.test.ts (ball-dodge is that
// file's own decimal fixture slug). This file covers what's actually new here: the availability
// gate and the direction/formatting wiring, using a fake ScoreRepository whose job is only to
// prove this class calls it correctly, not to re-implement its SQL.

function makeGame(overrides: Partial<SandboxGameRecord> = {}): SandboxGameRecord {
  return {
    id: 8,
    slug: "ball-dodge",
    developerUserId: 1,
    title: "공 피하기",
    shortDescription: null,
    description: null,
    genre: "arcade",
    mode: "single",
    logoKey: null,
    xpPerCompletion: 0,
    scoreUnit: "seconds",
    scoreDirection: "desc",
    scoreMin: 0,
    scoreMax: 3600,
    scoreDisplayPrefix: null,
    scoreDisplaySuffix: null,
    visibility: "PUBLIC",
    liveVersionId: 17,
    reviewSlot: null,
    deletedAt: null,
    deletedByAdminId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeScore(overrides: Partial<Score> = {}): Score {
  return {
    id: 1,
    user_id: 1,
    nickname: "player",
    avatar_url: null,
    game_id: "ball-dodge",
    score: 4.4,
    difficulty: "normal",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createFakeSandboxGameRepo(
  game: SandboxGameRecord | null,
): Pick<SandboxGameRepository, "findBySlug"> {
  return {
    async findBySlug(slug) {
      return game && game.slug === slug ? game : null;
    },
  };
}

function createFakeScoreRepo(rows: Score[]): ScoreRepository & {
  calls: Array<{ gameId: string; limit: number; direction: "asc" | "desc"; difficulty: string }>;
} {
  const calls: Array<{
    gameId: string;
    limit: number;
    direction: "asc" | "desc";
    difficulty: string;
  }> = [];
  return {
    calls,
    async saveScore() {
      throw new Error("not used by this use case");
    },
    async getLeaderboard(gameId, limit = 20, direction = "desc", difficulty = "normal") {
      calls.push({ gameId, limit, direction, difficulty });
      return rows;
    },
    async getUserPersonalBests() {
      return [];
    },
  };
}

test("a PUBLIC, live, fully-configured Creator game returns its leaderboard with the game's title", async () => {
  const game = makeGame();
  const sandboxGameRepo = createFakeSandboxGameRepo(game) as SandboxGameRepository;
  const scoreRepo = createFakeScoreRepo([makeScore()]);
  const useCases = new CreatorLeaderboardUseCases(sandboxGameRepo, scoreRepo);

  const result = await useCases.getLeaderboard("ball-dodge");

  assert.ok(result);
  assert.equal(result?.gameTitle, "공 피하기");
  assert.equal(result?.rows.length, 1);
  assert.equal(result?.rows[0]?.playerName, "player");
});

test("passes the policy's own direction (desc), display suffix, and a decimal score through to the formatted result unchanged", async () => {
  const game = makeGame({ scoreDirection: "desc", scoreDisplaySuffix: "초" });
  const sandboxGameRepo = createFakeSandboxGameRepo(game) as SandboxGameRepository;
  const scoreRepo = createFakeScoreRepo([makeScore({ score: 4.4 })]);
  const useCases = new CreatorLeaderboardUseCases(sandboxGameRepo, scoreRepo);

  const result = await useCases.getLeaderboard("ball-dodge");

  assert.equal(scoreRepo.calls[0]?.direction, "desc");
  assert.equal(scoreRepo.calls[0]?.difficulty, "normal", "Creator games have no difficulty tiers");
  assert.equal(result?.rows[0]?.score, 4.4, "the decimal score itself is never rounded/truncated");
  assert.equal(result?.rows[0]?.formattedScore, "4.4초");
});

test("an ascending-direction policy is passed through just as faithfully as descending", async () => {
  const game = makeGame({ scoreDirection: "asc" });
  const sandboxGameRepo = createFakeSandboxGameRepo(game) as SandboxGameRepository;
  const scoreRepo = createFakeScoreRepo([makeScore()]);
  const useCases = new CreatorLeaderboardUseCases(sandboxGameRepo, scoreRepo);

  await useCases.getLeaderboard("ball-dodge");
  assert.equal(scoreRepo.calls[0]?.direction, "asc");
});

test("an unknown slug is rejected (null), indistinguishable from a private one", async () => {
  const sandboxGameRepo = createFakeSandboxGameRepo(null) as SandboxGameRepository;
  const scoreRepo = createFakeScoreRepo([]);
  const useCases = new CreatorLeaderboardUseCases(sandboxGameRepo, scoreRepo);

  const result = await useCases.getLeaderboard("no-such-game");
  assert.equal(result, null);
  assert.equal(scoreRepo.calls.length, 0, "never queries scores for a game that isn't available");
});

test("a PRIVATE game is rejected", async () => {
  const game = makeGame({ visibility: "PRIVATE" });
  const sandboxGameRepo = createFakeSandboxGameRepo(game) as SandboxGameRepository;
  const scoreRepo = createFakeScoreRepo([]);
  const useCases = new CreatorLeaderboardUseCases(sandboxGameRepo, scoreRepo);

  assert.equal(await useCases.getLeaderboard("ball-dodge"), null);
  assert.equal(scoreRepo.calls.length, 0);
});

test("a game with no live version is rejected", async () => {
  const game = makeGame({ liveVersionId: null });
  const sandboxGameRepo = createFakeSandboxGameRepo(game) as SandboxGameRepository;
  const scoreRepo = createFakeScoreRepo([]);
  const useCases = new CreatorLeaderboardUseCases(sandboxGameRepo, scoreRepo);

  assert.equal(await useCases.getLeaderboard("ball-dodge"), null);
  assert.equal(scoreRepo.calls.length, 0);
});

test("a game with no score policy configured yet is rejected, not treated as unbounded", async () => {
  const game = makeGame({
    scoreUnit: null,
    scoreDirection: null,
    scoreMin: null,
    scoreMax: null,
  });
  const sandboxGameRepo = createFakeSandboxGameRepo(game) as SandboxGameRepository;
  const scoreRepo = createFakeScoreRepo([]);
  const useCases = new CreatorLeaderboardUseCases(sandboxGameRepo, scoreRepo);

  assert.equal(await useCases.getLeaderboard("ball-dodge"), null);
  assert.equal(scoreRepo.calls.length, 0);
});

test("a partially-configured policy (only some score_* fields set) is still rejected", async () => {
  const game = makeGame({ scoreMax: null }); // unit/direction/min set, max missing
  const sandboxGameRepo = createFakeSandboxGameRepo(game) as SandboxGameRepository;
  const scoreRepo = createFakeScoreRepo([]);
  const useCases = new CreatorLeaderboardUseCases(sandboxGameRepo, scoreRepo);

  assert.equal(await useCases.getLeaderboard("ball-dodge"), null);
});
