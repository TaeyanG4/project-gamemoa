import { z } from "zod";
import { apiFetch } from "../../lib/api/client";
import { API_URL } from "../../lib/api/config";
import {
  DiscordCandidateGuildSchema,
  DiscordGuildDtoSchema,
  type RegisterGuildRequest,
  type UpdateGuildRequest,
} from "@gamemoa/contracts";

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

export async function fetchMyManagedGuilds() {
  return apiFetch(`/api/discord/guilds/my`, GuildListResponseSchema);
}

export async function fetchDiscordGuildBySlug(slug: string) {
  return apiFetch(
    `/api/discord/guilds/by-slug/${encodeURIComponent(slug)}`,
    GuildPageResponseSchema,
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
