import { z } from "zod";

export const CreatorPlatformSchema = z.enum(["YOUTUBE", "CHZZK", "SOOP", "TWITCH"]);
export type CreatorPlatform = z.infer<typeof CreatorPlatformSchema>;

export const CreatorStatusSchema = z.enum(["UNVERIFIED", "VERIFIED", "SUSPENDED"]);
export type CreatorStatus = z.infer<typeof CreatorStatusSchema>;

export const FeaturedStatusSchema = z.enum(["NONE", "FEATURED", "PARTNER"]);
export type FeaturedStatus = z.infer<typeof FeaturedStatusSchema>;

export const CreatorPlatformAccountDtoSchema = z.object({
  id: z.number(),
  creatorId: z.number(),
  platform: CreatorPlatformSchema,
  platformUserId: z.string(),
  channelName: z.string(),
  channelHandle: z.string().nullable(),
  channelUrl: z.string(),
  avatarUrl: z.string().nullable(),
  verificationStatus: z.string(),
  verifiedAt: z.string().nullable(),
  audienceCount: z.number(),
  channelCreatedAt: z.string().nullable(),
  metricsSyncedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CreatorPlatformAccountDto = z.infer<typeof CreatorPlatformAccountDtoSchema>;

export const CreatorFeaturedReviewSchema = z.object({
  status: z.enum([
    "AUTO_REVIEW_PENDING",
    "FEATURED",
    "NOT_ELIGIBLE",
    "MANUAL_REVIEW",
    "FAILED_RETRYABLE",
  ]),
  reason: z.string().nullable(),
  nextCheckAt: z.string().nullable(),
  attemptCount: z.number(),
});
export type CreatorFeaturedReview = z.infer<typeof CreatorFeaturedReviewSchema>;

export const CreatorProfileDtoSchema = z.object({
  id: z.number(),
  userId: z.number(),
  status: CreatorStatusSchema,
  featuredStatus: FeaturedStatusSchema,
  featuredReason: z.string().nullable(),
  featuredSince: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  platformAccounts: z.array(CreatorPlatformAccountDtoSchema),
  featuredReview: CreatorFeaturedReviewSchema.nullable(),
});
export type CreatorProfileDto = z.infer<typeof CreatorProfileDtoSchema>;

export const CreatorRankEntrySchema = z.object({
  userId: z.number(),
  nickname: z.string(),
  avatarUrl: z.string().nullable(),
  country: z.string().nullable(),
  creatorId: z.number(),
  featuredStatus: FeaturedStatusSchema,
  platformAccounts: z.array(
    z.object({
      platform: CreatorPlatformSchema,
      channelName: z.string(),
      channelUrl: z.string(),
      avatarUrl: z.string().nullable(),
    }),
  ),
  score: z.number().optional(),
  formattedScore: z.string().optional(),
  gameId: z.string().optional(),
  gameTitle: z.string().optional(),
  totalXp: z.number().optional(),
  level: z.number().optional(),
  rank: z.number(),
});
export type CreatorRankEntryDto = z.infer<typeof CreatorRankEntrySchema>;

export const CreatorRankingQuerySchema = z.object({
  mode: z.enum(["score", "xp"]).default("score"),
  gameId: z.string().optional(),
  platform: CreatorPlatformSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type CreatorRankingQuery = z.infer<typeof CreatorRankingQuerySchema>;
