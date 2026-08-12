import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { D1ScoreRepository, D1SessionRepository } from "@gamemoa/db";
import { scoreSubmissionSchema } from "@gamemoa/shared";
import { validateScorePayload } from "../services/scoreValidation.js";
import type { ApiEnv } from "./auth.js";

export const scoresRouter = new Hono<ApiEnv>();

// POST /api/scores
scoresRouter.post("/", async (c) => {
  try {
    const rawBody = await c.req.json().catch(() => ({}));
    const parseResult = scoreSubmissionSchema.safeParse({
      gameId: rawBody.game_id ?? rawBody.gameId,
      score: rawBody.score,
      grade: rawBody.grade,
      metadata: rawBody.metadata,
      timestamp: rawBody.timestamp,
    });

    if (!parseResult.success) {
      return c.json(
        { error: "Invalid payload", details: parseResult.error.errors },
        400
      );
    }

    const { gameId, score } = parseResult.data;
    const customNickname = typeof rawBody.nickname === "string" ? rawBody.nickname : "게스트";

    // Validate score sanity
    const valResult = validateScorePayload(gameId, score);
    if (!valResult.valid) {
      return c.json({ error: valResult.reason || "Invalid score" }, 400);
    }

    // Check optional authentication
    let userId: number | null = null;
    let nickname = customNickname;
    let avatarUrl: string | null = null;

    const sessionId = getCookie(c, "gamemoa_session");
    if (sessionId) {
      try {
        const sessionRepo = new D1SessionRepository(c.env.DB);
        const authData = await sessionRepo.findSession(sessionId);
        if (authData) {
          userId = authData.user.id;
          nickname = authData.user.nickname;
          avatarUrl = authData.user.avatar_url;
        }
      } catch {
        // Session lookup failure falls back to guest
      }
    }

    const scoreRepo = new D1ScoreRepository(c.env.DB);
    const saved = await scoreRepo.saveScore({
      userId,
      nickname,
      avatarUrl,
      gameId,
      score,
    });

    return c.json({
      success: true,
      score_id: saved.id,
      game_id: saved.game_id,
      score: saved.score,
      nickname: saved.nickname,
    });
  } catch (err) {
    console.error("Submit Score Error:", err);
    return c.json({ error: "Failed to submit score" }, 500);
  }
});

// GET /api/scores/user/me
scoresRouter.get("/user/me", async (c) => {
  const sessionId = getCookie(c, "gamemoa_session");
  if (!sessionId) {
    return c.json({ authenticated: false, bests: {} });
  }

  try {
    const sessionRepo = new D1SessionRepository(c.env.DB);
    const authData = await sessionRepo.findSession(sessionId);

    if (!authData) {
      return c.json({ authenticated: false, bests: {} });
    }

    const scoreRepo = new D1ScoreRepository(c.env.DB);
    const bests = await scoreRepo.getUserPersonalBests(authData.user.id);

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

  try {
    const scoreRepo = new D1ScoreRepository(c.env.DB);
    const rawScores = await scoreRepo.getLeaderboard(gameId, 20);

    const leaderboard = rawScores.map((item) => {
      let formattedScore = `${item.score}`;
      if (item.game_id === "reaction-time") {
        formattedScore = `${item.score} ms`;
      } else if (item.game_id === "memory-test") {
        formattedScore = `Level ${item.score}`;
      } else if (item.game_id === "aim-test") {
        formattedScore = `${item.score} ms`;
      }

      return {
        id: item.id,
        user_id: item.user_id,
        nickname: item.nickname,
        playerName: item.nickname,
        avatar_url: item.avatar_url,
        avatarUrl: item.avatar_url,
        gameId: item.game_id,
        score: item.score,
        formattedScore,
        createdAt: item.created_at?.split("T")[0] ?? item.created_at,
        created_at: item.created_at,
      };
    });

    return c.json({
      game_id: gameId,
      leaderboard,
    });
  } catch (err) {
    console.error("Get Leaderboard Error:", err);
    return c.json({ game_id: gameId, leaderboard: [] });
  }
});
