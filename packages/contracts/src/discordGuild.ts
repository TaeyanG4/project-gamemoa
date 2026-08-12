import { z } from "zod";

export const DiscordGuildVisibilitySchema = z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]);
export type DiscordGuildVisibility = z.infer<typeof DiscordGuildVisibilitySchema>;

export const DiscordGuildRegistrationStatusSchema = z.enum(["ACTIVE", "DISABLED"]);
export type DiscordGuildRegistrationStatus = z.infer<typeof DiscordGuildRegistrationStatusSchema>;

export const DiscordCandidateGuildSchema = z.object({
  guildId: z.string(),
  name: z.string(),
  iconUrl: z.string().nullable(),
});
export type DiscordCandidateGuildDto = z.infer<typeof DiscordCandidateGuildSchema>;

export const DiscordGuildDtoSchema = z.object({
  guildId: z.string(),
  slug: z.string(),
  name: z.string(),
  iconUrl: z.string().nullable(),
  description: z.string().nullable(),
  visibility: DiscordGuildVisibilitySchema,
  registrationStatus: DiscordGuildRegistrationStatusSchema,
  registeredByUserId: z.number(),
  registeredAt: z.string(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  updatedAt: z.string(),
});
export type DiscordGuildDto = z.infer<typeof DiscordGuildDtoSchema>;

export const RegisterGuildRequestSchema = z.object({
  token: z.string().min(1, "Token is required"),
  guildId: z.string().min(1, "Guild ID is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  visibility: DiscordGuildVisibilitySchema.default("PUBLIC"),
});
export type RegisterGuildRequest = z.infer<typeof RegisterGuildRequestSchema>;

export const UpdateGuildRequestSchema = z.object({
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  visibility: DiscordGuildVisibilitySchema.optional(),
});
export type UpdateGuildRequest = z.infer<typeof UpdateGuildRequestSchema>;

export const ServerSearchQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});
export type ServerSearchQuery = z.infer<typeof ServerSearchQuerySchema>;

// Phase H2 Contracts

export const GuildXpLeaderboardEntrySchema = z.object({
  userId: z.number(),
  nickname: z.string(),
  avatarUrl: z.string().nullable(),
  xp: z.number(),
  rank: z.number(),
});
export type GuildXpLeaderboardEntryDto = z.infer<typeof GuildXpLeaderboardEntrySchema>;

export const GlobalGuildRankEntrySchema = z.object({
  guildId: z.string(),
  slug: z.string(),
  name: z.string(),
  iconUrl: z.string().nullable(),
  totalXp: z.number(),
  weeklyXp: z.number(),
  participantCount: z.number(),
  rank: z.number(),
});
export type GlobalGuildRankEntryDto = z.infer<typeof GlobalGuildRankEntrySchema>;

export const ServerGameLeaderboardEntrySchema = z.object({
  id: z.number(),
  userId: z.number(),
  nickname: z.string(),
  avatarUrl: z.string().nullable(),
  gameId: z.string(),
  score: z.number(),
  formattedScore: z.string(),
  createdAt: z.string(),
});
export type ServerGameLeaderboardEntryDto = z.infer<typeof ServerGameLeaderboardEntrySchema>;

export const GuildSummarySchema = z.object({
  totalXp: z.number(),
  weeklyXp: z.number(),
  participantCount: z.number(),
});
export type GuildSummaryDto = z.infer<typeof GuildSummarySchema>;
