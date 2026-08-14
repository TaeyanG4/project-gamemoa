import { Hono } from "hono";
import { PublicGameAvailabilityResponseSchema } from "@owogg/contracts";
import { createContainer } from "../container.js";
import type { ApiEnv } from "./auth.js";

export const gamesRouter = new Hono<ApiEnv>();

// GET /api/games/availability — public, no auth. Just the set of game_ids an admin has
// explicitly disabled, so the web catalog/gameplay screen can filter/block without exposing who
// disabled a game or why (that detail is admin-only, see adminGames.ts).
gamesRouter.get("/availability", async (c) => {
  if (!c.env?.DB) {
    return c.json(PublicGameAvailabilityResponseSchema.parse({ disabledGameIds: [] }), 200);
  }

  const { gameSettingsUseCases } = createContainer(c.env.DB);
  const disabledGameIds = await gameSettingsUseCases.getDisabledGameIds();

  return c.json(PublicGameAvailabilityResponseSchema.parse({ disabledGameIds }), 200);
});
