import test from "node:test";
import assert from "node:assert/strict";
import { ScoreUseCases } from "../src/application/scoreUseCases.js";
import type {
  Score,
  ScoreRepository,
  UserPersonalBestAggregate,
} from "../src/ports/repositories.js";

class FakeScoreRepository implements ScoreRepository {
  public scores: Score[] = [];

  async saveScore(data: {
    userId?: number | null;
    nickname: string;
    avatarUrl?: string | null;
    gameId: string;
    score: number;
  }): Promise<Score> {
    const newScore: Score = {
      id: this.scores.length + 1,
      user_id: data.userId ?? null,
      nickname: data.nickname,
      avatar_url: data.avatarUrl ?? null,
      game_id: data.gameId,
      score: data.score,
      created_at: new Date().toISOString(),
    };
    this.scores.push(newScore);
    return newScore;
  }

  async getLeaderboard(
    gameId: string,
    limit = 20,
    direction: "asc" | "desc" = "desc",
  ): Promise<Score[]> {
    const filtered = this.scores.filter((s) => s.game_id === gameId);
    filtered.sort((a, b) => (direction === "asc" ? a.score - b.score : b.score - a.score));
    return filtered.slice(0, limit);
  }

  async getUserPersonalBests(userId: number): Promise<UserPersonalBestAggregate[]> {
    const userScores = this.scores.filter((s) => s.user_id === userId);
    const byGame = new Map<string, number[]>();

    for (const s of userScores) {
      const list = byGame.get(s.game_id) || [];
      list.push(s.score);
      byGame.set(s.game_id, list);
    }

    const result: UserPersonalBestAggregate[] = [];
    for (const [game_id, scoreList] of byGame.entries()) {
      result.push({
        game_id,
        min_score: Math.min(...scoreList),
        max_score: Math.max(...scoreList),
      });
    }

    return result;
  }
}

test("ScoreUseCases - submitScore validates score payload before persistence", async () => {
  const repo = new FakeScoreRepository();
  const useCases = new ScoreUseCases(repo);

  // Invalid score out of range for reaction-time (min: 50, max: 10000)
  const invalidRes = await useCases.submitScore({
    gameId: "reaction-time",
    score: 1,
    nickname: "Tester",
  });
  assert.equal(invalidRes.valid, false);
  assert.equal(repo.scores.length, 0);

  // Valid score
  const validRes = await useCases.submitScore({
    gameId: "reaction-time",
    score: 250,
    nickname: "Tester",
  });
  assert.equal(validRes.valid, true);
  assert.equal(repo.scores.length, 1);
  assert.equal(validRes.saved?.score, 250);
});

test("ScoreUseCases - getLeaderboard respects manifest ordering direction", async () => {
  const repo = new FakeScoreRepository();
  const useCases = new ScoreUseCases(repo);

  // reaction-time direction is 'asc' (lower is better)
  await useCases.submitScore({ gameId: "reaction-time", score: 300, nickname: "Slow" });
  await useCases.submitScore({ gameId: "reaction-time", score: 150, nickname: "Fast" });

  const reactionBoard = await useCases.getLeaderboard("reaction-time");
  assert.equal(reactionBoard[0]?.playerName, "Fast");
  assert.equal(reactionBoard[0]?.formattedScore, "150 ms");
  assert.equal(reactionBoard[1]?.playerName, "Slow");

  // memory-test direction is 'desc' (higher is better)
  await useCases.submitScore({ gameId: "memory-test", score: 5, nickname: "Rookie" });
  await useCases.submitScore({ gameId: "memory-test", score: 15, nickname: "Master" });

  const memoryBoard = await useCases.getLeaderboard("memory-test");
  assert.equal(memoryBoard[0]?.playerName, "Master");
  assert.equal(memoryBoard[0]?.formattedScore, "Level 15");
  assert.equal(memoryBoard[1]?.playerName, "Rookie");
});

test("ScoreUseCases - getUserBests picks min_score for asc and max_score for desc", async () => {
  const repo = new FakeScoreRepository();
  const useCases = new ScoreUseCases(repo);

  await useCases.submitScore({
    userId: 42,
    gameId: "reaction-time",
    score: 300,
    nickname: "User42",
  });
  await useCases.submitScore({
    userId: 42,
    gameId: "reaction-time",
    score: 180,
    nickname: "User42",
  });

  await useCases.submitScore({ userId: 42, gameId: "memory-test", score: 5, nickname: "User42" });
  await useCases.submitScore({ userId: 42, gameId: "memory-test", score: 12, nickname: "User42" });

  const bests = await useCases.getUserBests(42);
  assert.equal(bests["reaction-time"], 180); // asc -> MIN
  assert.equal(bests["memory-test"], 12); // desc -> MAX
});
