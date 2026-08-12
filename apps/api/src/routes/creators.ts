import { Hono } from "hono";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { createContainer } from "../container.js";
import type { ApiEnv } from "./auth.js";
import { CreatorRankingQuerySchema, type CreatorPlatform } from "@gamemoa/contracts";

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

export const creatorsRouter = new Hono<ApiEnv>();

// GET /api/creators/rankings
creatorsRouter.get("/rankings", async (c) => {
  const queryParse = CreatorRankingQuerySchema.safeParse({
    mode: c.req.query("mode"),
    gameId: c.req.query("gameId"),
    platform: c.req.query("platform"),
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
  });

  const { mode, gameId, platform, limit, offset } = queryParse.success
    ? queryParse.data
    : { mode: "score" as const, gameId: undefined, platform: undefined, limit: 20, offset: 0 };

  const { creatorUseCases } = createContainer(c.env.DB);

  const queryOpts: {
    mode: "score" | "xp";
    gameId?: string;
    platform?: CreatorPlatform;
    limit?: number;
    offset?: number;
  } = {
    mode,
    limit,
    offset,
  };
  if (gameId !== undefined) queryOpts.gameId = gameId;
  if (platform !== undefined) queryOpts.platform = platform;

  const result = await creatorUseCases.getCreatorRankings(queryOpts);

  return c.json({
    entries: result.entries,
    total: result.total,
    mode,
    gameId,
    platform,
    limit,
    offset,
  });
});

// GET /api/creators/me
creatorsRouter.get("/me", async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }

  const { creatorUseCases } = createContainer(c.env.DB);
  const profile = await creatorUseCases.getCreatorProfileByUserId(auth.userId);

  return c.json({
    profile: profile
      ? {
          id: profile.id,
          userId: profile.userId,
          status: profile.status,
          featuredStatus: profile.featuredStatus,
          featuredReason: profile.featuredReason,
          featuredSince: profile.featuredSince,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          platformAccounts: profile.platformAccounts,
        }
      : null,
  });
});
