import { z } from "zod";
import { ProgressionSummarySchema, AchievementCodeSchema } from "./progression.js";
import { CreatorPlatformSchema } from "./creator.js";

// Public-facing profile ("/users/:id"). A strict subset of what /api/profile/* and
// /api/progression/* expose to the account owner — never includes email, linked-provider
// list, cooldown timestamps, or anything from the private /profile "My Page".

export const PublicGameBestSchema = z.object({
  gameId: z.string(),
  score: z.number(),
  formattedScore: z.string(),
});
export type PublicGameBest = z.infer<typeof PublicGameBestSchema>;

export const PublicCreatorBadgeSchema = z.object({
  platform: CreatorPlatformSchema,
  channelName: z.string(),
  channelUrl: z.string(),
  channelHandle: z.string().nullable(),
});
export type PublicCreatorBadge = z.infer<typeof PublicCreatorBadgeSchema>;

export const PublicProfileResponseSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  avatarUrl: z.string().nullable(),
  /** Self-reported ISO 3166-1 alpha-2 code, or null if unset — same field as the private profile. */
  country: z.string().nullable(),
  joinedAt: z.string(),
  progression: ProgressionSummarySchema,
  globalRank: z.number().int().min(1).nullable(),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  unlockedAchievementCodes: z.array(AchievementCodeSchema),
  totalAchievements: z.number().int().min(0),
  gameBests: z.array(PublicGameBestSchema),
  creatorBadges: z.array(PublicCreatorBadgeSchema),
});
export type PublicProfileResponse = z.infer<typeof PublicProfileResponseSchema>;
