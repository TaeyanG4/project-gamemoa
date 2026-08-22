import test from "node:test";
import assert from "node:assert/strict";
import {
  AchievementUseCases,
  evaluateEligibleAchievements,
} from "../src/application/achievementUseCases.js";
import type { AchievementRepository, UnlockedAchievement } from "../src/ports/repositories.js";

class FakeAchievementRepository implements AchievementRepository {
  private unlocked = new Map<number, Map<string, string>>(); // userId -> code -> unlockedAt

  async getUnlockedAchievements(userId: number): Promise<UnlockedAchievement[]> {
    const codes = this.unlocked.get(userId);
    if (!codes) return [];
    return Array.from(codes.entries()).map(([achievementCode, unlockedAt]) => ({
      achievementCode,
      unlockedAt,
    }));
  }

  async unlockAchievement(userId: number, code: string): Promise<{ unlocked: boolean }> {
    const codes = this.unlocked.get(userId) ?? new Map<string, string>();
    if (codes.has(code)) return { unlocked: false };
    codes.set(code, new Date().toISOString());
    this.unlocked.set(userId, codes);
    return { unlocked: true };
  }
}

function publishedGameIds(): string[] {
  return ["reaction-time", "memory-test"];
}

test("evaluateEligibleAchievements grants FIRST_PLAY at the first completion", () => {
  const codes = evaluateEligibleAchievements({
    eligibleCompletions: 1,
    level: 1,
    hasFavorite: false,
    playedGameIds: [],
  });
  assert.ok(codes.includes("FIRST_PLAY"));
  assert.ok(!codes.includes("PLAY_10"));
});

test("evaluateEligibleAchievements grants PLAY_10 / PLAY_100 at their thresholds", () => {
  assert.ok(
    evaluateEligibleAchievements({
      eligibleCompletions: 10,
      level: 1,
      hasFavorite: false,
      playedGameIds: [],
    }).includes("PLAY_10"),
  );
  assert.ok(
    evaluateEligibleAchievements({
      eligibleCompletions: 100,
      level: 1,
      hasFavorite: false,
      playedGameIds: [],
    }).includes("PLAY_100"),
  );
  assert.ok(
    !evaluateEligibleAchievements({
      eligibleCompletions: 9,
      level: 1,
      hasFavorite: false,
      playedGameIds: [],
    }).includes("PLAY_10"),
  );
});

test("evaluateEligibleAchievements grants LEVEL_5 / LEVEL_10 at their thresholds", () => {
  assert.ok(
    evaluateEligibleAchievements({
      eligibleCompletions: 0,
      level: 5,
      hasFavorite: false,
      playedGameIds: [],
    }).includes("LEVEL_5"),
  );
  assert.ok(
    evaluateEligibleAchievements({
      eligibleCompletions: 0,
      level: 10,
      hasFavorite: false,
      playedGameIds: [],
    }).includes("LEVEL_10"),
  );
});

test("evaluateEligibleAchievements grants FIRST_FAVORITE only when a Favorite exists", () => {
  assert.ok(
    evaluateEligibleAchievements({
      eligibleCompletions: 0,
      level: 1,
      hasFavorite: true,
      playedGameIds: [],
    }).includes("FIRST_FAVORITE"),
  );
  assert.ok(
    !evaluateEligibleAchievements({
      eligibleCompletions: 0,
      level: 1,
      hasFavorite: false,
      playedGameIds: [],
    }).includes("FIRST_FAVORITE"),
  );
});

test("evaluateEligibleAchievements grants ALL_GAMES only once every published game is played", () => {
  const published = publishedGameIds();
  assert.ok(published.length > 0, "expected at least one published game in the registry");

  const partial = evaluateEligibleAchievements(
    {
      eligibleCompletions: 0,
      level: 1,
      hasFavorite: false,
      playedGameIds: published.slice(0, published.length - 1),
    },
    published,
  );
  assert.ok(!partial.includes("ALL_GAMES"));

  const complete = evaluateEligibleAchievements(
    {
      eligibleCompletions: 0,
      level: 1,
      hasFavorite: false,
      playedGameIds: published,
    },
    published,
  );
  assert.ok(complete.includes("ALL_GAMES"));
});

test("AchievementUseCases.evaluateAndUnlock only unlocks newly-eligible achievements once", async () => {
  const repo = new FakeAchievementRepository();
  const useCases = new AchievementUseCases(repo);

  const first = await useCases.evaluateAndUnlock(1, {
    eligibleCompletions: 1,
    level: 1,
    hasFavorite: false,
    playedGameIds: [],
  });
  assert.deepEqual(first, ["FIRST_PLAY"]);

  // Same facts again: FIRST_PLAY already unlocked, must not re-unlock or duplicate.
  const second = await useCases.evaluateAndUnlock(1, {
    eligibleCompletions: 1,
    level: 1,
    hasFavorite: false,
    playedGameIds: [],
  });
  assert.deepEqual(second, []);

  const summary = await useCases.getSummary(1);
  assert.deepEqual(summary.unlockedCodes, ["FIRST_PLAY"]);
});

test("AchievementUseCases.evaluateAndUnlock unlocks multiple newly-eligible codes together", async () => {
  const repo = new FakeAchievementRepository();
  const useCases = new AchievementUseCases(repo);

  const unlocked = await useCases.evaluateAndUnlock(1, {
    eligibleCompletions: 10,
    level: 5,
    hasFavorite: true,
    playedGameIds: [],
  });

  assert.deepEqual(unlocked.sort(), ["FIRST_FAVORITE", "FIRST_PLAY", "LEVEL_5", "PLAY_10"].sort());
});

test("AchievementUseCases.getSummary reports total achievement count and recent unlocks", async () => {
  const repo = new FakeAchievementRepository();
  const useCases = new AchievementUseCases(repo);

  await useCases.evaluateAndUnlock(1, {
    eligibleCompletions: 1,
    level: 1,
    hasFavorite: false,
    playedGameIds: [],
  });

  const summary = await useCases.getSummary(1);
  assert.equal(summary.totalAchievements, 7);
  assert.equal(summary.recentlyUnlocked.length, 1);
  assert.equal(summary.recentlyUnlocked[0]?.achievementCode, "FIRST_PLAY");
});
