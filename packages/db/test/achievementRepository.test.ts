import test from "node:test";
import assert from "node:assert/strict";
import { D1AchievementRepository } from "../src/d1/D1AchievementRepository.js";
import type { D1Database } from "../src/d1/D1UserRepository.js";

function createMockD1(): {
  db: D1Database;
  rows: { user_id: number; achievement_code: string; unlocked_at: string }[];
} {
  const rows: { user_id: number; achievement_code: string; unlocked_at: string }[] = [];

  const db: D1Database = {
    prepare(query: string) {
      let bound: unknown[] = [];
      const stmt = {
        bind(...args: unknown[]) {
          bound = args;
          return stmt;
        },
        async first<T = unknown>(): Promise<T | null> {
          return null;
        },
        async all<T = unknown>(): Promise<{ results: T[] }> {
          if (query.includes("FROM user_achievements")) {
            const [userId] = bound as [number];
            const results = rows
              .filter((r) => r.user_id === userId)
              .map((r) => ({ achievement_code: r.achievement_code, unlocked_at: r.unlocked_at }));
            return { results: results as unknown as T[] };
          }
          return { results: [] };
        },
        async run(): Promise<{ success: boolean; meta?: { changes?: number } }> {
          if (query.startsWith("INSERT INTO user_achievements")) {
            const [userId, code, unlockedAt] = bound as [number, string, string];
            const conflict = rows.some((r) => r.user_id === userId && r.achievement_code === code);
            if (conflict) return { success: true, meta: { changes: 0 } };
            rows.push({ user_id: userId, achievement_code: code, unlocked_at: unlockedAt });
            return { success: true, meta: { changes: 1 } };
          }
          return { success: true };
        },
      };
      return stmt as unknown as ReturnType<D1Database["prepare"]>;
    },
    async batch() {
      return [];
    },
  };

  return { db, rows };
}

test("unlockAchievement reports unlocked=true on first grant", async () => {
  const { db } = createMockD1();
  const repo = new D1AchievementRepository(db);

  const result = await repo.unlockAchievement(1, "FIRST_PLAY");
  assert.equal(result.unlocked, true);

  const unlocked = await repo.getUnlockedAchievements(1);
  assert.equal(unlocked.length, 1);
  assert.equal(unlocked[0]?.achievementCode, "FIRST_PLAY");
});

test("unlockAchievement is idempotent — a second grant of the same code is a no-op", async () => {
  const { db } = createMockD1();
  const repo = new D1AchievementRepository(db);

  await repo.unlockAchievement(1, "FIRST_PLAY");
  const second = await repo.unlockAchievement(1, "FIRST_PLAY");
  assert.equal(second.unlocked, false);

  const unlocked = await repo.getUnlockedAchievements(1);
  assert.equal(unlocked.length, 1); // not duplicated
});

test("achievements are scoped per user", async () => {
  const { db } = createMockD1();
  const repo = new D1AchievementRepository(db);

  await repo.unlockAchievement(1, "FIRST_PLAY");
  await repo.unlockAchievement(2, "FIRST_PLAY");

  const user1 = await repo.getUnlockedAchievements(1);
  const user2 = await repo.getUnlockedAchievements(2);
  assert.equal(user1.length, 1);
  assert.equal(user2.length, 1);
});
