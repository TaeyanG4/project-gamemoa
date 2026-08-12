import { z } from "zod";
import { apiFetch } from "../../lib/api/client";
import { CreatorRankEntrySchema, CreatorPlatformSchema } from "@gamemoa/contracts";

export const CreatorRankingsResponseSchema = z.object({
  entries: z.array(CreatorRankEntrySchema),
  total: z.number(),
  mode: z.string(),
  gameId: z.string().optional(),
  platform: CreatorPlatformSchema.optional(),
  limit: z.number(),
  offset: z.number(),
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
