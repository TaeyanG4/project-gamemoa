import { z } from "zod";

export const RecentPlaySchema = z.object({
  gameId: z.string(),
  lastPlayedAt: z.string(),
});

export type RecentPlay = z.infer<typeof RecentPlaySchema>;

export const PersonalizationStateSchema = z.object({
  favoriteGameIds: z.array(z.string()),
  recentPlays: z.array(RecentPlaySchema),
});

export type PersonalizationState = z.infer<typeof PersonalizationStateSchema>;

export const ImportGuestPersonalizationRequestSchema = z.object({
  guestFavorites: z.array(z.string()),
  guestRecentPlays: z.array(RecentPlaySchema),
});

export type ImportGuestPersonalizationRequest = z.infer<
  typeof ImportGuestPersonalizationRequestSchema
>;

export const MutationResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export type MutationResult = z.infer<typeof MutationResultSchema>;
