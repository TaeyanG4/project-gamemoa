import { z } from "zod";
import { apiFetch } from "../../lib/api/client";
import {
  CreatorRankEntrySchema,
  CreatorPlatformSchema,
  CreatorProfileDtoSchema,
} from "@gamemoa/contracts";

export const CreatorRankingsResponseSchema = z.object({
  entries: z.array(CreatorRankEntrySchema),
  total: z.number(),
  mode: z.string(),
  gameId: z.string().optional(),
  platform: CreatorPlatformSchema.optional(),
  limit: z.number(),
  offset: z.number(),
});

export const CreatorProvidersResponseSchema = z.object({
  YOUTUBE: z.object({ configured: z.boolean() }),
  TWITCH: z.object({ configured: z.boolean() }),
  CHZZK: z.object({ configured: z.boolean() }),
  SOOP: z.object({ configured: z.boolean() }),
});

export async function fetchCreatorRankingsApi(
  mode: "score" | "xp" = "score",
  gameId?: string,
  platform?: string,
  limit = 20,
  offset = 0,
) {
  const params = new URLSearchParams();
  params.set("mode", mode);
  if (gameId && gameId !== "all") params.set("gameId", gameId);
  if (platform && platform !== "ALL") params.set("platform", platform);
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  return apiFetch(`/api/creators/rankings?${params.toString()}`, CreatorRankingsResponseSchema);
}

export async function fetchCreatorProvidersApi() {
  return apiFetch("/api/creators/providers", CreatorProvidersResponseSchema);
}

export async function fetchMyCreatorProfileApi() {
  return apiFetch("/api/creators/me", z.object({ profile: CreatorProfileDtoSchema.nullable() }));
}
