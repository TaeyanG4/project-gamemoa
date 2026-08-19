import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { createContainer, evaluateAchievementsForUser, systemGameRegistry } from "../container.js";
import { createReadContainer } from "../readReplica.js";
import { edgeCache } from "../middleware/edgeCache.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { scoreSubmissionSchema } from "@owogg/contracts";
import type { FormattedScoreRecord } from "@owogg/core";
import type { ApiEnv } from "./auth.js";

export const scoresRouter = new Hono<ApiEnv>();

// POST /api/scores — the most D1-expensive endpoint in the app (~10-15 serialized queries per
// submission), so it is rate limited ahead of any DB work. The configured ceiling is far above
// what human play can produce: the fastest game is a 30-second round, so a real player cannot
// approach it, while a submission loop is capped before it can monopolize D1's throughput.
scoresRouter.post("/", rateLimit({ name: "score-submit" }), async (c) => {
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

    // Score-submission block (see UserModerationUseCases) — a lighter tool than SUSPENDED/BANNED,
    // which are already enforced by findSession itself (an actually-suspended/banned user never
    // gets this far — authData would be null). This lets an admin stop a specific abuser from
    // polluting leaderboards without locking them out of the rest of the site.
    if (authData.user.score_submission_blocked) {
      return c.json(
        {
          error: {
            code: "SCORE_SUBMISSION_BLOCKED",
            message: "현재 점수 제출이 제한된 계정입니다.",
          },
        },
        403,
      );
    }

    const rawBody = await c.req.json().catch(() => ({}));
    const parseResult = scoreSubmissionSchema.safeParse({
      gameId: rawBody.game_id ?? rawBody.gameId,
      score: rawBody.score,
      grade: rawBody.grade,
      metadata: rawBody.metadata,
      playToken: rawBody.playToken ?? rawBody.play_token,
      timestamp: rawBody.timestamp,
      difficulty: rawBody.difficulty,
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
      difficulty: parseResult.data.difficulty,
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

      // Achievement re-evaluation is 3 further reads (progression summary, personal bests,
      // personalization) plus any unlock writes — the largest remaining block of D1 work in this
      // request, and the only part the caller does not need before it can render the result
      // screen. Deferred via waitUntil so it runs after the response is sent: the submission's
      // latency (and its hold on D1's serialized queue) drops accordingly, while the work still
      // completes. `newlyUnlockedAchievements` is declared optional in scoreSubmissionResponse
      // and is not read by the web client, so omitting it here is within the contract; the
      // profile/achievements screens read unlock state from the DB on their own next load.
      const deferredAchievements = evaluateAchievementsForUser(container, userId).catch(
        (achievementErr) => {
          console.error("Deferred Achievement Evaluation Error:", achievementErr);
        },
      );
      try {
        c.executionCtx.waitUntil(deferredAchievements);
      } catch {
        // No ExecutionContext (test runner / non-Workers host): await inline so the behavior is
        // still correct and observable, just without the latency benefit.
        newlyUnlockedAchievements = (await deferredAchievements) ?? [];
      }
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

/** Shared row shape for both the SYSTEM and Creator branches below — one game's worth of already
 * PB-deduped, already-formatted rows plus the resolved title (resolved once per request, not
 * re-looked-up per row — lets the web client drop its own GAME_MANIFEST_MAP-based title lookup,
 * see apps/web/app/features/scores/api.ts). */
function formatLeaderboardEntry(item: FormattedScoreRecord, gameTitle: string) {
  return {
    id: item.id,
    user_id: item.user_id,
    nickname: item.nickname,
    playerName: item.playerName,
    avatar_url: item.avatar_url,
    avatarUrl: item.avatar_url,
    gameId: item.game_id,
    gameTitle,
    score: item.score,
    formattedScore: item.formattedScore,
    difficulty: item.difficulty,
    createdAt: item.created_at?.split("T")[0] ?? item.created_at,
    created_at: item.created_at,
  };
}

// GET /api/scores/:gameId — public leaderboard. Edge-cached: the response depends only on
// gameId + the ?difficulty query (both in the URL), never on who is asking, so one cached entry
// per URL correctly serves every visitor. This is the single hottest read path in the app.
//
// SYSTEM games resolve through the SYSTEM-only `systemGameRegistry` singleton (see
// container.ts — deliberately NOT the unified `gameRegistry` composite Stage C-3 added there;
// see that export's own doc comment) exactly as before this generalization — same lookup, same
// difficulty handling, same response shape, same cache. A slug that ISN'T a SYSTEM game now gets
// a second chance through the Creator path (CreatorLeaderboardUseCases: PUBLIC + live + score
// policy configured) before this falls back to INVALID_GAME_ID — the same "can't distinguish
// unknown from private/unconfigured" posture used everywhere else a Creator game is read
// publicly. No new endpoint, no new `scores` table, no new ranking SQL: both branches call the
// exact same D1ScoreRepository.getLeaderboard PB-dedup query, just resolved against a different
// registry.
scoresRouter.get("/:gameId", edgeCache({ ttlSeconds: 30 }), async (c) => {
  const gameId = c.req.param("gameId");

  const definition = await systemGameRegistry.findBySlug(gameId);

  if (definition) {
    if (!c.env?.DB) {
      return c.json({ game_id: gameId, leaderboard: [] });
    }

    try {
      // Read-replica eligible: this is a public leaderboard already served with a 30s edge cache,
      // so it is explicitly allowed to lag — a replica cannot make it staler than the cache TTL
      // already does. See readReplica.ts for why auth/session reads deliberately stay on primary.
      const { scoreUseCases } = createReadContainer(c.env.DB);
      const difficulty = c.req.query("difficulty");
      const leaderboard = await scoreUseCases.getLeaderboard(gameId, 20, difficulty);

      return c.json({
        game_id: gameId,
        leaderboard: leaderboard.map((item) => formatLeaderboardEntry(item, definition.title)),
      });
    } catch (err) {
      console.error("Get Leaderboard Error:", err);
      return c.json({ game_id: gameId, leaderboard: [] });
    }
  }

  // Not a SYSTEM game — try the Creator path before giving up.
  if (c.env?.DB) {
    try {
      const { creatorLeaderboardUseCases } = createReadContainer(c.env.DB);
      const creatorLeaderboard = await creatorLeaderboardUseCases.getLeaderboard(gameId, 20);
      if (creatorLeaderboard) {
        return c.json({
          game_id: gameId,
          leaderboard: creatorLeaderboard.rows.map((item) =>
            formatLeaderboardEntry(item, creatorLeaderboard.gameTitle),
          ),
        });
      }
    } catch (err) {
      console.error("Get Creator Leaderboard Error:", err);
      // Falls through to INVALID_GAME_ID below — same as any other unexpected failure resolving
      // this slug, never a 200 with an empty/partial leaderboard for a request that never actually
      // resolved a real game.
    }
  }

  return c.json(
    { error: { code: "INVALID_GAME_ID", message: "존재하지 않는 게임 ID입니다." } },
    400,
  );
});
