import type { AchievementRepository, UnlockedAchievement } from "@owogg/core";
import type { D1Database } from "./D1UserRepository.js";

export class D1AchievementRepository implements AchievementRepository {
  constructor(private db: D1Database) {}

  async getUnlockedAchievements(userId: number): Promise<UnlockedAchievement[]> {
    const res = await this.db
      .prepare(
        `SELECT achievement_code, unlocked_at FROM user_achievements
         WHERE user_id = ? ORDER BY unlocked_at ASC`,
      )
      .bind(userId)
      .all<Record<string, unknown>>();

    return res.results.map((row) => ({
      achievementCode: String(row.achievement_code),
      unlockedAt: String(row.unlocked_at),
    }));
  }

  async unlockAchievement(userId: number, code: string): Promise<{ unlocked: boolean }> {
    const result = await this.db
      .prepare(
        `INSERT INTO user_achievements (user_id, achievement_code, unlocked_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, achievement_code) DO NOTHING`,
      )
      .bind(userId, code, new Date().toISOString())
      .run();

    // Fall back to trusting the call as a fresh unlock when meta is unavailable (test doubles).
    const unlocked = result.meta?.changes !== 0;
    return { unlocked };
  }
}
