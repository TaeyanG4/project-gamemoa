import { Hono } from "hono";
import { PublicGameAvailabilityResponseSchema } from "@owogg/contracts";
import { createContainer } from "../container.js";
import { edgeCache } from "../middleware/edgeCache.js";
import type { ApiEnv } from "./auth.js";

export const gamesRouter = new Hono<ApiEnv>();

// GET /api/games/availability — public, no auth. Just the set of game_ids an admin has
// explicitly disabled, so the web catalog/gameplay screen can filter/block without exposing who
// disabled a game or why (that detail is admin-only, see adminGames.ts).
//
// Edge-cached (60s). This fires on essentially every catalog/gameplay page load, so uncached it
// would be one of the highest-volume D1 reads in the app despite the answer being identical for
// everyone and changing only when an admin flips a switch. The kill switch stays effective
// because POST /api/scores re-checks the disabled set against D1 directly on submission — the
// cache only ever delays the catalog *display* update by up to a minute, never the enforcement.
gamesRouter.get("/availability", edgeCache({ ttlSeconds: 60 }), async (c) => {
  if (!c.env?.DB) {
    return c.json(PublicGameAvailabilityResponseSchema.parse({ disabledGameIds: [] }), 200);
  }

  const { gameSettingsUseCases } = createContainer(c.env.DB);
  const disabledGameIds = await gameSettingsUseCases.getDisabledGameIds();

  return c.json(PublicGameAvailabilityResponseSchema.parse({ disabledGameIds }), 200);
});
