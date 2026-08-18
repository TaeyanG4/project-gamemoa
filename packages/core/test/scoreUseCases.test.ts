import test from "node:test";
import assert from "node:assert/strict";
import { ScoreUseCases } from "../src/application/scoreUseCases.js";
import { StaticGameRegistry } from "../src/modules/game/registry/staticGameRegistry.js";
import { GAME_DEFINITIONS } from "../src/registry/gameDefinitions.generated.js";
import type {
  Score,
  ScoreRepository,
  UserPersonalBestAggregate,
} from "../src/ports/repositories.js";

class FakeScoreRepository implements ScoreRepository {
  public scores: Score[] = [];

  async saveScore(data: {
    userId: number;
    nickname: string;
    avatarUrl?: string | null;
    gameId: string;
    score: number;
    difficulty: string;
  }): Promise<Score> {
    const newScore: Score = {
      id: this.scores.length + 1,
      user_id: data.userId,
      nickname: data.nickname,
      avatar_url: data.avatarUrl ?? null,
      game_id: data.gameId,
      score: data.score,
      difficulty: data.difficulty,
      created_at: new Date().toISOString(),
    };
    this.scores.push(newScore);
    return newScore;
  }

  async getLeaderboard(
    gameId: string,
    limit = 20,
    direction: "asc" | "desc" = "desc",
    difficulty = "normal",
  ): Promise<Score[]> {
    const filtered = this.scores.filter((s) => s.game_id === gameId && s.difficulty === difficulty);
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

/**
 * The real production registry — `game-registry/`'s compiled output, the exact thing
 * `apps/api/src/container.ts` wires into `ScoreUseCases`. Using it here (rather than a hand-built
 * fake) is what makes this file double as the "the 4 official games behave identically" check:
 * every assertion below encodes a real score/difficulty boundary (reaction-time's 50-10000ms,
 * aim-test's normal/hard tiers, ...), and it is now the registry — not a hardcoded
 * `GAME_MANIFEST_MAP` import — answering them. `pnpm registry:check` independently guarantees
 * these definitions agree field-for-field with `GAME_MANIFESTS`
 * (scripts/registry-builder.ts's assertDefinitionsMatchManifests), so a value that was valid
 * against the old manifest-based validator stays valid here, and vice versa.
 */
function newUseCases(): ScoreUseCases {
  return new ScoreUseCases(new FakeScoreRepository(), new StaticGameRegistry(GAME_DEFINITIONS));
}

test("ScoreUseCases - submitScore validates score payload before persistence", async () => {
  const useCases = newUseCases();

  // Invalid score out of range for reaction-time (min: 50, max: 10000)
  const invalidRes = await useCases.submitScore({
    userId: 101,
    gameId: "reaction-time",
    score: 1,
    nickname: "Tester",
  });
  assert.equal(invalidRes.valid, false);

  // Valid score
  const validRes = await useCases.submitScore({
    userId: 101,
    gameId: "reaction-time",
    score: 250,
    nickname: "Tester",
  });
  assert.equal(validRes.valid, true);
  assert.equal(validRes.saved?.score, 250);
});

test("ScoreUseCases - submitScore rejects a game id absent from the registry and never persists it (2026-08-17 beta hardening)", async () => {
  const useCases = newUseCases();

  // A sandbox game slug (or any other unrecognized id) — score submission for these is explicitly
  // unsupported, not silently accepted under a loose bound. No row saved means no XP either,
  // since progression is only recorded off an *accepted* submission in the route layer.
  const res = await useCases.submitScore({
    userId: 101,
    gameId: "some-sandbox-game-slug",
    score: 100,
    nickname: "Tester",
  });
  assert.equal(res.valid, false);
  assert.equal(res.saved, undefined);
});

test("ScoreUseCases - getLeaderboard respects the registry's ordering direction", async () => {
  const useCases = newUseCases();

  // reaction-time direction is 'asc' (lower is better)
  await useCases.submitScore({ userId: 1, gameId: "reaction-time", score: 300, nickname: "Slow" });
  await useCases.submitScore({ userId: 2, gameId: "reaction-time", score: 150, nickname: "Fast" });

  const reactionBoard = await useCases.getLeaderboard("reaction-time");
  assert.equal(reactionBoard[0]?.playerName, "Fast");
  assert.equal(reactionBoard[0]?.formattedScore, "150 ms");
  assert.equal(reactionBoard[1]?.playerName, "Slow");

  // memory-test direction is 'desc' (higher is better)
  await useCases.submitScore({ userId: 3, gameId: "memory-test", score: 5, nickname: "Rookie" });
  await useCases.submitScore({ userId: 4, gameId: "memory-test", score: 15, nickname: "Master" });

  const memoryBoard = await useCases.getLeaderboard("memory-test");
  assert.equal(memoryBoard[0]?.playerName, "Master");
  assert.equal(memoryBoard[0]?.formattedScore, "Level 15");
  assert.equal(memoryBoard[1]?.playerName, "Rookie");
});

test("ScoreUseCases - getUserBests picks min_score for asc and max_score for desc", async () => {
  const useCases = newUseCases();

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

test("ScoreUseCases - getUserBestsFormatted applies each game's own display formatting", async () => {
  const useCases = newUseCases();
  await useCases.submitScore({ userId: 7, gameId: "reaction-time", score: 210, nickname: "U" });
  await useCases.submitScore({ userId: 7, gameId: "memory-test", score: 9, nickname: "U" });

  const formatted = await useCases.getUserBestsFormatted(7);
  const byGame = Object.fromEntries(formatted.map((e) => [e.gameId, e.formattedScore]));
  assert.equal(byGame["reaction-time"], "210 ms");
  assert.equal(byGame["memory-test"], "Level 9");
});

test("ScoreUseCases - a game without a difficulty config rejects anything but normal", async () => {
  const useCases = newUseCases();

  const res = await useCases.submitScore({
    userId: 1,
    gameId: "reaction-time",
    score: 200,
    nickname: "Tester",
    difficulty: "hard",
  });
  assert.equal(res.valid, false);
});

test("ScoreUseCases - aim-test accepts its declared difficulty tiers and rejects unknown ones", async () => {
  const useCases = newUseCases();

  const hardRes = await useCases.submitScore({
    userId: 1,
    gameId: "aim-test",
    score: 12000,
    nickname: "Tester",
    difficulty: "hard",
  });
  assert.equal(hardRes.valid, true);
  assert.equal(hardRes.saved?.difficulty, "hard");

  const unknownRes = await useCases.submitScore({
    userId: 1,
    gameId: "aim-test",
    score: 12000,
    nickname: "Tester",
    difficulty: "nightmare",
  });
  assert.equal(unknownRes.valid, false);
});

test("ScoreUseCases - getLeaderboard partitions scores by difficulty, never mixing tiers", async () => {
  const useCases = newUseCases();

  await useCases.submitScore({
    userId: 1,
    gameId: "aim-test",
    score: 8000,
    nickname: "NormalPlayer",
    difficulty: "normal",
  });
  await useCases.submitScore({
    userId: 2,
    gameId: "aim-test",
    score: 20000,
    nickname: "HardPlayer",
    difficulty: "hard",
  });

  const normalBoard = await useCases.getLeaderboard("aim-test", 20, "normal");
  assert.equal(normalBoard.length, 1);
  assert.equal(normalBoard[0]?.playerName, "NormalPlayer");

  const hardBoard = await useCases.getLeaderboard("aim-test", 20, "hard");
  assert.equal(hardBoard.length, 1);
  assert.equal(hardBoard[0]?.playerName, "HardPlayer");
});

// ── injected-registry behaviour ───────────────────────────────────────────────
//
// The property this refactor actually adds: ScoreUseCases no longer hardcodes which registry it
// resolves games through. A minimal two-entry registry proves the class has no residual dependency
// on the generated file beyond what's injected.

test("submitScore resolves entirely through the injected registry, not any hardcoded source", async () => {
  const customRegistry = new StaticGameRegistry([
    {
      slug: "custom-game",
      owner: { type: "SYSTEM" },
      title: "Custom",
      shortDescription: "",
      description: "",
      status: "published",
      categories: [],
      tags: [],
      modes: ["single"],
      inputMethods: ["mouse"],
      minPlayers: 1,
      maxPlayers: 1,
      thumbnail: "/thumb.svg",
      supportsReplay: false,
      policy: {
        score: { unit: "pt", direction: "desc", min: 0, max: 10 },
        leaderboard: true,
        xpPerCompletion: 0,
        requiresAuth: false,
      },
    },
  ]);
  const useCases = new ScoreUseCases(new FakeScoreRepository(), customRegistry);

  // A game this registry knows about, at its own custom bounds:
  const inBounds = await useCases.submitScore({
    userId: 1,
    gameId: "custom-game",
    score: 5,
    nickname: "T",
  });
  assert.equal(inBounds.valid, true);

  const outOfBounds = await useCases.submitScore({
    userId: 1,
    gameId: "custom-game",
    score: 999,
    nickname: "T",
  });
  assert.equal(outOfBounds.valid, false);

  // A real official-game slug is meaningless to THIS registry — it must not fall back to the
  // generated GAME_MANIFEST_MAP or any other source.
  const unknownToThisRegistry = await useCases.submitScore({
    userId: 1,
    gameId: "reaction-time",
    score: 200,
    nickname: "T",
  });
  assert.equal(unknownToThisRegistry.valid, false);
});
