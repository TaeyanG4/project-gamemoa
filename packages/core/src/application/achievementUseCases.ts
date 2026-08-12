import type { AchievementRepository, UnlockedAchievement } from "../ports/repositories.js";
import { ALL_ACHIEVEMENT_CODES, type AchievementCode } from "../domain/achievements.js";
import { GAME_MANIFEST_MAP } from "../registry/gameRegistry.generated.js";

export interface AchievementFacts {
  eligibleCompletions: number;
  level: number;
  hasFavorite: boolean;
  /** Distinct game ids the user has at least one accepted completion/score for. */
  playedGameIds: string[];
}

export interface AchievementSummary {
  unlockedCodes: string[];
  totalAchievements: number;
  recentlyUnlocked: UnlockedAchievement[];
}

function publishedGameIds(): string[] {
  return Object.values(GAME_MANIFEST_MAP)
    .filter((manifest) => manifest.status === "published")
    .map((manifest) => manifest.id);
}

/** Pure evaluation: which achievement codes are currently satisfied by the given facts. */
export function evaluateEligibleAchievements(facts: AchievementFacts): AchievementCode[] {
  const codes: AchievementCode[] = [];

  if (facts.eligibleCompletions >= 1) codes.push("FIRST_PLAY");
  if (facts.eligibleCompletions >= 10) codes.push("PLAY_10");
  if (facts.eligibleCompletions >= 100) codes.push("PLAY_100");
  if (facts.hasFavorite) codes.push("FIRST_FAVORITE");
  if (facts.level >= 5) codes.push("LEVEL_5");
  if (facts.level >= 10) codes.push("LEVEL_10");

  const published = publishedGameIds();
  if (published.length > 0 && published.every((id) => facts.playedGameIds.includes(id))) {
    codes.push("ALL_GAMES");
  }

  return codes;
}

export class AchievementUseCases {
  constructor(private repo: AchievementRepository) {}

  /**
   * Evaluates the given facts and unlocks any achievements the user newly qualifies for.
   * Idempotent — already-unlocked achievements are skipped (both here and at the DB
   * uniqueness layer). Achievements never grant XP.
   */
  async evaluateAndUnlock(userId: number, facts: AchievementFacts): Promise<AchievementCode[]> {
    const eligible = evaluateEligibleAchievements(facts);
    if (eligible.length === 0) return [];

    const existing = await this.repo.getUnlockedAchievements(userId);
    const existingCodes = new Set(existing.map((a) => a.achievementCode));
    const candidates = eligible.filter((code) => !existingCodes.has(code));

    const newlyUnlocked: AchievementCode[] = [];
    for (const code of candidates) {
      const result = await this.repo.unlockAchievement(userId, code);
      if (result.unlocked) newlyUnlocked.push(code);
    }
    return newlyUnlocked;
  }

  async getSummary(userId: number): Promise<AchievementSummary> {
    const unlocked = await this.repo.getUnlockedAchievements(userId);
    const recentlyUnlocked = [...unlocked]
      .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
      .slice(0, 5);

    return {
      unlockedCodes: unlocked.map((a) => a.achievementCode),
      totalAchievements: ALL_ACHIEVEMENT_CODES.length,
      recentlyUnlocked,
    };
  }
}
