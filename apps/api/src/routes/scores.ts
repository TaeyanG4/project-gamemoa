import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { createContainer, evaluateAchievementsForUser } from "../container.js";
import { scoreSubmissionSchema } from "@owogg/contracts";
import { GAME_MANIFEST_MAP } from "@owogg/core";
import type { ApiEnv } from "./auth.js";

export const scoresRouter = new Hono<ApiEnv>();

// POST /api/scores
scoresRouter.post("/", async (c) => {
  try {
    const sessionId = getCookie(c, "owogg_session");
    if (!sessionId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const container = createContainer(c.env.DB);
    const { sessionRepo, scoreUseCases } = container;

    let authData;
    try {
      authData = await sessionRepo.findSession(sessionId);
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (!authData) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const rawBody = await c.req.json().catch(() => ({}));
    const parseResult = scoreSubmissionSchema.safeParse({
      gameId: rawBody.game_id ?? rawBody.gameId,
      score: rawBody.score,
      grade: rawBody.grade,
      metadata: rawBody.metadata,
      playToken: rawBody.playToken ?? rawBody.play_token,
      timestamp: rawBody.timestamp,
    });

    if (!parseResult.success) {
      return c.json({ error: "Invalid payload", details: parseResult.error.errors }, 400);
    }

    const { gameId, score } = parseResult.data;

    // Admin kill switch (see adminGames.ts) — checked here, not just filtered from the catalog,
    // so a disabled game can't be scored via a direct API call even if a client still has the
    // gameplay screen open from before it was disabled.
    const disabledGameIds = await container.gameSettingsUseCases.getDisabledGameIds();
    if (disabledGameIds.includes(gameId)) {
      return c.json(
        { error: { code: "GAME_DISABLED", message: "현재 비활성화된 게임입니다." } },
        400,
      );
    }

    // Server identity strictly from session user
    const userId = authData.user.id;
    const nickname = authData.user.nickname;
    const avatarUrl = authData.user.avatar_url;

    const result = await scoreUseCases.submitScore({
      userId,
      nickname,
      avatarUrl,
      gameId,
      score,
    });

    if (!result.valid || !result.saved) {
      return c.json({ error: result.reason || "Invalid score" }, 400);
    }

    // Progression side-effects: server-authoritative XP for this accepted, authenticated
    // completion (idempotent by the saved score's own row id), then re-evaluate
    // achievements. Never influences the score/leaderboard above.
    let xpAwarded = 0;
    let guildXpAwarded = 0;
    let guildId: string | undefined = undefined;
    let newlyUnlockedAchievements: string[] = [];
    try {
      const completion = await container.progressionUseCases.recordAcceptedGameCompletion({
        userId,
        gameId: result.saved.game_id,
        sourceId: String(result.saved.id),
      });
      xpAwarded = completion.xpAwarded;

      if (parseResult.data.playToken && completion.xpEventId) {
        const guildAttr = await container.discordGuildXpUseCases.attributeCompletionToGuild({
          userId,
          gameId: result.saved.game_id,
          sourceXpEventId: completion.xpEventId,
          xpAmount: xpAwarded,
          playToken: parseResult.data.playToken,
        });
        if (guildAttr.attributed) {
          guildXpAwarded = guildAttr.amount ?? 0;
          guildId = guildAttr.guildId;
        }
      }

      newlyUnlockedAchievements = await evaluateAchievementsForUser(container, userId);
    } catch (progressionErr) {
      // Progression bookkeeping must never fail the score submission itself.
      console.error("Progression Update Error:", progressionErr);
    }

    return c.json({
      success: true,
      score_id: result.saved.id,
      game_id: result.saved.game_id,
      score: result.saved.score,
      nickname: result.saved.nickname,
      xpAwarded,
      ...(guildXpAwarded > 0 || guildId ? { guildXpAwarded, guildId } : {}),
      newlyUnlockedAchievements,
    });
  } catch (err) {
    console.error("Submit Score Error:", err);
    return c.json({ error: "Failed to submit score" }, 500);
  }
});

// GET /api/scores/user/me
scoresRouter.get("/user/me", async (c) => {
  const sessionId = getCookie(c, "owogg_session");
  if (!sessionId) {
    return c.json({ authenticated: false, bests: {} });
  }

  try {
    const { sessionRepo, scoreUseCases } = createContainer(c.env.DB);
    const authData = await sessionRepo.findSession(sessionId);

    if (!authData) {
      return c.json({ authenticated: false, bests: {} });
    }

    const bests = await scoreUseCases.getUserBests(authData.user.id);

    return c.json({
      authenticated: true,
      user_id: authData.user.id,
      bests,
    });
  } catch (err) {
    console.error("Get My Scores Error:", err);
    return c.json({ authenticated: false, bests: {} });
  }
});

// GET /api/scores/:gameId
scoresRouter.get("/:gameId", async (c) => {
  const gameId = c.req.param("gameId");

  if (!GAME_MANIFEST_MAP[gameId]) {
    return c.json(
      { error: { code: "INVALID_GAME_ID", message: "존재하지 않는 게임 ID입니다." } },
      400,
    );
  }

  if (!c.env?.DB) {
    return c.json({ game_id: gameId, leaderboard: [] });
  }

  try {
    const { scoreUseCases } = createContainer(c.env.DB);
    const leaderboard = await scoreUseCases.getLeaderboard(gameId, 20);

    const formattedLeaderboard = leaderboard.map((item) => ({
      id: item.id,
      user_id: item.user_id,
      nickname: item.nickname,
      playerName: item.playerName,
      avatar_url: item.avatar_url,
      avatarUrl: item.avatar_url,
      gameId: item.game_id,
      score: item.score,
      formattedScore: item.formattedScore,
      createdAt: item.created_at?.split("T")[0] ?? item.created_at,
      created_at: item.created_at,
    }));

    return c.json({
      game_id: gameId,
      leaderboard: formattedLeaderboard,
    });
  } catch (err) {
    console.error("Get Leaderboard Error:", err);
    return c.json({ game_id: gameId, leaderboard: [] });
  }
});
