import { z } from "zod";
import { apiFetch } from "../../lib/api/client";
import { API_URL } from "../../lib/api/config";
import {
  DiscordCandidateGuildSchema,
  DiscordGuildDtoSchema,
  GuildXpLeaderboardEntrySchema,
  GlobalGuildRankEntrySchema,
  ServerGameLeaderboardEntrySchema,
  GuildSummarySchema,
  type RegisterGuildRequest,
  type UpdateGuildRequest,
} from "@owogg/contracts";

export const CandidateResponseSchema = z.object({
  valid: z.boolean(),
  candidates: z.array(DiscordCandidateGuildSchema),
});

export const GuildSingleResponseSchema = z.object({
  guild: DiscordGuildDtoSchema,
});

export const GuildPageResponseSchema = z.object({
  guild: DiscordGuildDtoSchema,
  isManager: z.boolean(),
  summary: GuildSummarySchema.optional(),
  topAllTime: z.array(GuildXpLeaderboardEntrySchema).optional(),
  topWeekly: z.array(GuildXpLeaderboardEntrySchema).optional(),
});

export const GuildListResponseSchema = z.object({
  guilds: z.array(DiscordGuildDtoSchema),
});

export const GuildSearchResponseSchema = z.object({
  guilds: z.array(DiscordGuildDtoSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const GlobalGuildRankingResponseSchema = z.object({
  guilds: z.array(GlobalGuildRankEntrySchema),
  total: z.number(),
  period: z.string(),
  limit: z.number(),
  offset: z.number(),
});

export const ServerXpLeaderboardResponseSchema = z.object({
  entries: z.array(GuildXpLeaderboardEntrySchema),
  total: z.number(),
  period: z.string(),
  limit: z.number(),
  offset: z.number(),
});

export const ServerGameLeaderboardResponseSchema = z.object({
  gameId: z.string(),
  leaderboard: z.array(ServerGameLeaderboardEntrySchema),
});

export async function fetchRegistrationCandidates(token: string) {
  return apiFetch(
    `/api/discord/guilds/candidates?token=${encodeURIComponent(token)}`,
    CandidateResponseSchema,
  );
}

export async function registerDiscordGuild(body: RegisterGuildRequest) {
  return apiFetch(`/api/discord/guilds/register`, GuildSingleResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function searchDiscordGuilds(q?: string, limit = 20, offset = 0) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return apiFetch(`/api/discord/guilds/search?${params.toString()}`, GuildSearchResponseSchema);
}

export async function fetchGlobalGuildRanking(
  period: "alltime" | "weekly" = "alltime",
  limit = 20,
  offset = 0,
) {
  const params = new URLSearchParams();
  params.set("period", period);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return apiFetch(
    `/api/discord/guilds/ranking?${params.toString()}`,
    GlobalGuildRankingResponseSchema,
  );
}

export async function fetchMyManagedGuilds() {
  return apiFetch(`/api/discord/guilds/my`, GuildListResponseSchema);
}

export async function fetchDiscordGuildBySlug(slug: string) {
  return apiFetch(
    `/api/discord/guilds/by-slug/${encodeURIComponent(slug)}`,
    GuildPageResponseSchema,
  );
}

export async function fetchGuildXpLeaderboard(
  slug: string,
  period: "alltime" | "weekly" = "alltime",
  limit = 20,
  offset = 0,
) {
  const params = new URLSearchParams();
  params.set("period", period);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return apiFetch(
    `/api/discord/guilds/by-slug/${encodeURIComponent(slug)}/xp-leaderboard?${params.toString()}`,
    ServerXpLeaderboardResponseSchema,
  );
}

export async function fetchGuildServerGameLeaderboard(slug: string, gameId: string, limit = 20) {
  return apiFetch(
    `/api/discord/guilds/by-slug/${encodeURIComponent(slug)}/games/${encodeURIComponent(gameId)}?limit=${limit}`,
    ServerGameLeaderboardResponseSchema,
  );
}

export async function updateDiscordGuild(slug: string, body: UpdateGuildRequest) {
  return apiFetch(
    `/api/discord/guilds/by-slug/${encodeURIComponent(slug)}`,
    GuildSingleResponseSchema,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function unregisterDiscordGuild(slug: string) {
  return apiFetch(
    `/api/discord/guilds/by-slug/${encodeURIComponent(slug)}/unregister`,
    GuildSingleResponseSchema,
    {
      method: "POST",
    },
  );
}

export function getDiscordRegisterAuthUrl() {
  return `${API_URL}/api/auth/discord/register-server`;
}
