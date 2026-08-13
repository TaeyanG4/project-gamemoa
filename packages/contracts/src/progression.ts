import { z } from "zod";

// CRITICAL: XP/level represent OwOGG activity/progression only — never game score or
// ranking skill. These schemas must never be combined with score/leaderboard contracts.

export const ProgressionSummarySchema = z.object({
  level: z.number().int().min(1),
  totalXp: z.number().int().min(0),
  currentLevelStartXp: z.number().int().min(0),
  nextLevelXp: z.number().int().min(0),
  currentLevelProgressXp: z.number().int().min(0),
  currentLevelSpanXp: z.number().int().min(0),
  progressPercent: z.number().min(0).max(100),
});
export type ProgressionSummary = z.infer<typeof ProgressionSummarySchema>;

export const ProgressResponseSchema = z.object({
  summary: ProgressionSummarySchema,
  eligibleCompletions: z.number().int().min(0),
  globalRank: z.number().int().min(1).nullable(),
});
export type ProgressResponse = z.infer<typeof ProgressResponseSchema>;

export const XpLeaderboardEntrySchema = z.object({
  rank: z.number().int().min(1),
  userId: z.number(),
  nickname: z.string(),
  avatarUrl: z.string().nullable(),
  totalXp: z.number().int().min(0),
});
export type XpLeaderboardEntry = z.infer<typeof XpLeaderboardEntrySchema>;

export const XpLeaderboardResponseSchema = z.object({
  entries: z.array(XpLeaderboardEntrySchema),
});
export type XpLeaderboardResponse = z.infer<typeof XpLeaderboardResponseSchema>;

export const XpLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type XpLeaderboardQuery = z.infer<typeof XpLeaderboardQuerySchema>;

export const AchievementCodeSchema = z.enum([
  "FIRST_PLAY",
  "PLAY_10",
  "PLAY_100",
  "FIRST_FAVORITE",
  "LEVEL_5",
  "LEVEL_10",
  "ALL_GAMES",
]);
export type AchievementCodeContract = z.infer<typeof AchievementCodeSchema>;

export const UnlockedAchievementSchema = z.object({
  code: AchievementCodeSchema,
  unlockedAt: z.string(),
});
export type UnlockedAchievementContract = z.infer<typeof UnlockedAchievementSchema>;

export const AchievementSummaryResponseSchema = z.object({
  unlockedCodes: z.array(AchievementCodeSchema),
  totalAchievements: z.number().int().min(0),
  recentlyUnlocked: z.array(UnlockedAchievementSchema),
});
export type AchievementSummaryResponse = z.infer<typeof AchievementSummaryResponseSchema>;
