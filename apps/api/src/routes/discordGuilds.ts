import { Hono } from "hono";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { createContainer } from "../container.js";
import type { ApiEnv } from "./auth.js";
import {
  RegisterGuildRequestSchema,
  UpdateGuildRequestSchema,
  ServerSearchQuerySchema,
  DiscordGuildRankingQuerySchema,
  DiscordGuildGameRankingQuerySchema,
} from "@gamemoa/contracts";
import { GAME_MANIFEST_MAP, type DiscordGuild } from "@gamemoa/core";

async function requireAuth(
  c: Context<ApiEnv>,
): Promise<{ userId: number; user: { id: number; nickname: string } } | null> {
  const sessionId = getCookie(c, "gamemoa_session");
  if (!sessionId) return null;
  const { sessionRepo } = createContainer(c.env.DB);
  const result = await sessionRepo.findSession(sessionId);
  if (!result) return null;
  return { userId: result.user.id, user: { id: result.user.id, nickname: result.user.nickname } };
}

function mapGuildToDto(guild: DiscordGuild) {
  return {
    guildId: guild.guild_id,
    slug: guild.slug,
    name: guild.name,
    iconUrl: guild.icon_url,
    description: guild.description,
    visibility: guild.visibility,
    registrationStatus: guild.registration_status,
    registeredByUserId: guild.registered_by_user_id,
    registeredAt: guild.registered_at,
    firstSeenAt: guild.first_seen_at,
    lastSeenAt: guild.last_seen_at,
    updatedAt: guild.updated_at,
  };
}

export const discordGuildsRouter = new Hono<ApiEnv>();

// GET /api/discord/guilds/candidates?token=...
discordGuildsRouter.get("/candidates", async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }

  const token = c.req.query("token");
  if (!token) {
    return c.json({ error: { code: "INVALID_REQUEST", message: "Token is required" } }, 400);
  }

  const { discordGuildRegistrationUseCases } = createContainer(c.env.DB);
  const result = await discordGuildRegistrationUseCases.getCandidatesFromToken(auth.userId, token);

  if (!result.valid || !result.candidates) {
    return c.json(
      { error: { code: "INVALID_TOKEN", message: result.reason || "Invalid candidate token" } },
      400,
    );
  }

  return c.json({
    valid: true,
    candidates: result.candidates,
  });
});

// POST /api/discord/guilds/register
discordGuildsRouter.post("/register", async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }

  const json = await c.req.json().catch(() => ({}));
  const parse = RegisterGuildRequestSchema.safeParse(json);
  if (!parse.success) {
    return c.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: parse.error.issues[0]?.message || "Invalid body",
        },
      },
      400,
    );
  }

  const { discordGuildRegistrationUseCases } = createContainer(c.env.DB);
  try {
    const guild = await discordGuildRegistrationUseCases.registerGuild({
      userId: auth.userId,
      token: parse.data.token,
      guildId: parse.data.guildId,
      slug: parse.data.slug,
      description: parse.data.description,
      visibility: parse.data.visibility,
    });

    return c.json({ guild: mapGuildToDto(guild) }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    const status = msg.includes("already in use") ? 409 : msg.includes("authority") ? 403 : 400;
    return c.json({ error: { code: "REGISTRATION_FAILED", message: msg } }, status);
  }
});

// GET /api/discord/guilds/search?q=...&limit=...&offset=...
discordGuildsRouter.get("/search", async (c) => {
  const queryParse = ServerSearchQuerySchema.safeParse({
    q: c.req.query("q"),
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
  });

  if (!queryParse.success) {
    return c.json(
      { error: { code: "INVALID_QUERY", message: "검색어와 페이지 범위를 확인해주세요." } },
      400,
    );
  }

  const { q, limit, offset } = queryParse.data;

  const { discordGuildDirectoryUseCases } = createContainer(c.env.DB);
  const result = await discordGuildDirectoryUseCases.searchPublicGuilds(q, limit, offset);

  return c.json({
    guilds: result.guilds.map(mapGuildToDto),
    total: result.total,
    limit,
    offset,
  });
});

// GET /api/discord/guilds/ranking?period=alltime|weekly&limit=...&offset=...
discordGuildsRouter.get("/ranking", async (c) => {
  const queryParse = DiscordGuildRankingQuerySchema.safeParse({
    period: c.req.query("period"),
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
  });
  if (!queryParse.success) {
    return c.json(
      {
        error: { code: "INVALID_QUERY", message: "period, limit, offset 값이 올바르지 않습니다." },
      },
      400,
    );
  }
  const { period, limit, offset } = queryParse.data;

  const { discordGuildXpUseCases } = createContainer(c.env.DB);
  const result = await discordGuildXpUseCases.getGlobalGuildRanking(period, limit, offset);

  return c.json({
    guilds: result.guilds,
    total: result.total,
    period,
    limit,
    offset,
  });
});

// GET /api/discord/guilds/my
discordGuildsRouter.get("/my", async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }

  const { discordGuildDirectoryUseCases } = createContainer(c.env.DB);
  const guilds = await discordGuildDirectoryUseCases.getUserManagedGuilds(auth.userId);

  return c.json({
    guilds: guilds.map(mapGuildToDto),
  });
});

// GET /api/discord/guilds/by-slug/:slug
discordGuildsRouter.get("/by-slug/:slug", async (c) => {
  const slug = c.req.param("slug");
  const auth = await requireAuth(c);

  const { discordGuildDirectoryUseCases, discordGuildXpUseCases } = createContainer(c.env.DB);
  const result = await discordGuildDirectoryUseCases.getGuildPageBySlug(slug, auth?.userId);

  if (result.status === "NOT_FOUND") {
    return c.json({ error: { code: "NOT_FOUND", message: "Guild not found" } }, 404);
  }

  if (result.status === "FORBIDDEN") {
    return c.json({ error: { code: "NOT_FOUND", message: "Guild not found" } }, 404);
  }

  const guildId = result.guild.guild_id;
  const summary = await discordGuildXpUseCases.getGuildSummary(guildId);
  const topAllTime = await discordGuildXpUseCases.getGuildLeaderboard(guildId, "alltime", 10, 0);
  const topWeekly = await discordGuildXpUseCases.getGuildLeaderboard(guildId, "weekly", 10, 0);

  return c.json({
    guild: mapGuildToDto(result.guild),
    isManager: result.isManager,
    summary,
    topAllTime: topAllTime.entries,
    topWeekly: topWeekly.entries,
  });
});

// GET /api/discord/guilds/by-slug/:slug/xp-leaderboard
discordGuildsRouter.get("/by-slug/:slug/xp-leaderboard", async (c) => {
  const slug = c.req.param("slug");
  const auth = await requireAuth(c);
  const queryParse = DiscordGuildRankingQuerySchema.safeParse({
    period: c.req.query("period"),
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
  });
  if (!queryParse.success) {
    return c.json(
      {
        error: { code: "INVALID_QUERY", message: "period, limit, offset 값이 올바르지 않습니다." },
      },
      400,
    );
  }
  const { period, limit, offset } = queryParse.data;

  const { discordGuildDirectoryUseCases, discordGuildXpUseCases } = createContainer(c.env.DB);
  const pageResult = await discordGuildDirectoryUseCases.getGuildPageBySlug(slug, auth?.userId);

  if (pageResult.status === "NOT_FOUND") {
    return c.json({ error: { code: "NOT_FOUND", message: "Guild not found" } }, 404);
  }
  if (pageResult.status === "FORBIDDEN") {
    return c.json({ error: { code: "NOT_FOUND", message: "Guild not found" } }, 404);
  }

  const result = await discordGuildXpUseCases.getGuildLeaderboard(
    pageResult.guild.guild_id,
    period,
    limit,
    offset,
  );

  return c.json({
    entries: result.entries,
    total: result.total,
    period,
    limit,
    offset,
  });
});

// GET /api/discord/guilds/by-slug/:slug/games/:gameId
discordGuildsRouter.get("/by-slug/:slug/games/:gameId", async (c) => {
  const slug = c.req.param("slug");
  const gameId = c.req.param("gameId");
  const queryParse = DiscordGuildGameRankingQuerySchema.safeParse({
    limit: c.req.query("limit"),
  });
  if (!queryParse.success || !GAME_MANIFEST_MAP[gameId]) {
    return c.json(
      { error: { code: "INVALID_QUERY", message: "존재하는 게임 ID와 limit을 입력해주세요." } },
      400,
    );
  }
  const { limit } = queryParse.data;
  const auth = await requireAuth(c);

  const { discordGuildDirectoryUseCases, discordGuildXpUseCases } = createContainer(c.env.DB);
  const pageResult = await discordGuildDirectoryUseCases.getGuildPageBySlug(slug, auth?.userId);

  if (pageResult.status === "NOT_FOUND") {
    return c.json({ error: { code: "NOT_FOUND", message: "Guild not found" } }, 404);
  }
  if (pageResult.status === "FORBIDDEN") {
    return c.json({ error: { code: "NOT_FOUND", message: "Guild not found" } }, 404);
  }

  const leaderboard = await discordGuildXpUseCases.getGuildGameLeaderboard(
    pageResult.guild.guild_id,
    gameId,
    limit,
  );

  return c.json({
    gameId,
    leaderboard,
  });
});

// PATCH /api/discord/guilds/by-slug/:slug
discordGuildsRouter.patch("/by-slug/:slug", async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }

  const slugParam = c.req.param("slug");
  const json = await c.req.json().catch(() => ({}));
  const parse = UpdateGuildRequestSchema.safeParse(json);
  if (!parse.success) {
    return c.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: parse.error.issues[0]?.message || "Invalid body",
        },
      },
      400,
    );
  }

  const { discordGuildDirectoryUseCases, discordGuildManagementUseCases } = createContainer(
    c.env.DB,
  );
  const pageResult = await discordGuildDirectoryUseCases.getGuildPageBySlug(slugParam, auth.userId);

  if (pageResult.status !== "OK") {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Guild not found or access denied" } },
      404,
    );
  }

  try {
    const updated = await discordGuildManagementUseCases.updateGuildSettings({
      userId: auth.userId,
      guildId: pageResult.guild.guild_id,
      slug: parse.data.slug,
      description: parse.data.description,
      visibility: parse.data.visibility,
    });

    return c.json({ guild: mapGuildToDto(updated) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Update failed";
    const status = msg.includes("Unauthorized") ? 403 : msg.includes("already in use") ? 409 : 400;
    return c.json({ error: { code: "UPDATE_FAILED", message: msg } }, status);
  }
});

// POST /api/discord/guilds/by-slug/:slug/unregister
discordGuildsRouter.post("/by-slug/:slug/unregister", async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }

  const slugParam = c.req.param("slug");
  const { discordGuildDirectoryUseCases, discordGuildManagementUseCases } = createContainer(
    c.env.DB,
  );
  const pageResult = await discordGuildDirectoryUseCases.getGuildPageBySlug(slugParam, auth.userId);

  if (pageResult.status !== "OK") {
    return c.json({ error: { code: "NOT_FOUND", message: "Guild not found" } }, 404);
  }

  try {
    const disabled = await discordGuildManagementUseCases.unregisterGuild({
      userId: auth.userId,
      guildId: pageResult.guild.guild_id,
    });

    return c.json({ guild: mapGuildToDto(disabled) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unregister failed";
    const status = msg.includes("Unauthorized") ? 403 : 400;
    return c.json({ error: { code: "UNREGISTER_FAILED", message: msg } }, status);
  }
});
