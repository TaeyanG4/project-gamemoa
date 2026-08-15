import type { Context } from "hono";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import {
  ProgressResponseSchema,
  XpLeaderboardResponseSchema,
  XpLeaderboardQuerySchema,
  AchievementSummaryResponseSchema,
} from "@owogg/contracts";
import type { ApiEnv } from "./auth.js";
import { createContainer } from "../container.js";
import { edgeCache } from "../middleware/edgeCache.js";
import { createReadContainer } from "../readReplica.js";

export const progressionRouter = new Hono<ApiEnv>();

async function getAuthUserId(c: Context<ApiEnv>): Promise<number | null> {
  const sessionId = getCookie(c, "owogg_session");
  if (!sessionId || !c.env?.DB) return null;

  try {
    const { sessionRepo } = createContainer(c.env.DB);
    const result = await sessionRepo.findSession(sessionId);
    return result ? result.user.id : null;
  } catch {
    return null;
  }
}

// GET /api/progression/me — current user's XP/level summary. Never exposes other users' data.
progressionRouter.get("/me", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthenticated" }, 401);
  }
  if (!c.env?.DB) {
    return c.json({ error: "Database unavailable" }, 500);
  }

  const { progressionUseCases } = createContainer(c.env.DB);
  const { summary, eligibleCompletions } = await progressionUseCases.getProgressionSummary(userId);
  const globalRank = await progressionUseCases.getGlobalXpRank(userId);

  const validated = ProgressResponseSchema.parse({
    summary,
    eligibleCompletions,
    globalRank,
  });
  return c.json(validated, 200);
});

// GET /api/progression/leaderboard?limit=20 — public global XP ranking ("who has been
// actively using OwOGG"), separate from any game skill leaderboard. Edge-cached (60s): the
// response depends only on ?limit, and global XP standings move far more slowly than a
// per-game leaderboard, so a longer TTL than /api/scores/:gameId is safe here.
progressionRouter.get("/leaderboard", edgeCache({ ttlSeconds: 60 }), async (c) => {
  const query = XpLeaderboardQuerySchema.safeParse({ limit: c.req.query("limit") });
  if (!query.success) {
    return c.json(
      { error: { code: "INVALID_QUERY", message: "limit은 1에서 100 사이의 정수여야 합니다." } },
      400,
    );
  }

  if (!c.env?.DB) {
    return c.json({ entries: [] }, 200);
  }

  // Read-replica eligible: public ranking, already edge-cached for 60s (see readReplica.ts).
  const { progressionUseCases } = createReadContainer(c.env.DB);
  const entries = await progressionUseCases.getGlobalXpLeaderboard(query.data.limit);

  const validated = XpLeaderboardResponseSchema.parse({
    entries: entries.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      nickname: entry.nickname,
      avatarUrl: entry.avatarUrl,
      totalXp: entry.totalXp,
    })),
  });
  return c.json(validated, 200);
});

// GET /api/progression/achievements — current user's achievement unlock summary.
progressionRouter.get("/achievements", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthenticated" }, 401);
  }
  if (!c.env?.DB) {
    return c.json({ error: "Database unavailable" }, 500);
  }

  const { achievementUseCases } = createContainer(c.env.DB);
  const summary = await achievementUseCases.getSummary(userId);

  const validated = AchievementSummaryResponseSchema.parse({
    unlockedCodes: summary.unlockedCodes,
    totalAchievements: summary.totalAchievements,
    recentlyUnlocked: summary.recentlyUnlocked.map((a) => ({
      code: a.achievementCode,
      unlockedAt: a.unlockedAt,
    })),
  });
  return c.json(validated, 200);
});
