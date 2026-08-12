import type { Context } from "hono";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import {
  ImportGuestPersonalizationRequestSchema,
  PersonalizationStateSchema,
} from "@gamemoa/contracts";
import type { ApiEnv } from "./auth.js";
import { createContainer, evaluateAchievementsForUser } from "../container.js";

export const personalizationRouter = new Hono<ApiEnv>();

async function getAuthUser(c: Context<ApiEnv>) {
  const sessionId = getCookie(c, "gamemoa_session");
  if (!sessionId) return null;

  if (!c.env?.DB) return null;

  try {
    const { sessionRepo } = createContainer(c.env.DB);
    const result = await sessionRepo.findSession(sessionId);
    return result ? result.user : null;
  } catch {
    return null;
  }
}

// GET /api/personalization
personalizationRouter.get("/", async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: "Unauthenticated" }, 401);
  }

  if (!c.env?.DB) {
    return c.json({ error: "Database unavailable" }, 500);
  }

  const { personalizationUseCases } = createContainer(c.env.DB);
  const state = await personalizationUseCases.getPersonalizationState(user.id);
  const validated = PersonalizationStateSchema.parse(state);
  return c.json(validated, 200);
});

// POST /api/personalization/favorites/:gameId
personalizationRouter.post("/favorites/:gameId", async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: "Unauthenticated" }, 401);
  }

  if (!c.env?.DB) {
    return c.json({ error: "Database unavailable" }, 500);
  }

  const gameId = c.req.param("gameId");
  const container = createContainer(c.env.DB);

  try {
    await container.personalizationUseCases.addFavorite(user.id, gameId);
    try {
      await evaluateAchievementsForUser(container, user.id);
    } catch (achievementErr) {
      // Achievement bookkeeping must never fail the Favorite action itself.
      console.error("Achievement Evaluation Error:", achievementErr);
    }
    return c.json({ success: true }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid game";
    return c.json({ error: message }, 400);
  }
});

// DELETE /api/personalization/favorites/:gameId
personalizationRouter.delete("/favorites/:gameId", async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: "Unauthenticated" }, 401);
  }

  if (!c.env?.DB) {
    return c.json({ error: "Database unavailable" }, 500);
  }

  const gameId = c.req.param("gameId");
  const { personalizationUseCases } = createContainer(c.env.DB);
  await personalizationUseCases.removeFavorite(user.id, gameId);
  return c.json({ success: true }, 200);
});

// POST /api/personalization/recent/:gameId
personalizationRouter.post("/recent/:gameId", async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: "Unauthenticated" }, 401);
  }

  if (!c.env?.DB) {
    return c.json({ error: "Database unavailable" }, 500);
  }

  const gameId = c.req.param("gameId");
  const { personalizationUseCases } = createContainer(c.env.DB);

  try {
    await personalizationUseCases.recordRecentPlay(user.id, gameId);
    return c.json({ success: true }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid game";
    return c.json({ error: message }, 400);
  }
});

// POST /api/personalization/import
personalizationRouter.post("/import", async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: "Unauthenticated" }, 401);
  }

  if (!c.env?.DB) {
    return c.json({ error: "Database unavailable" }, 500);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = ImportGuestPersonalizationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid import payload" }, 400);
  }

  const { personalizationUseCases } = createContainer(c.env.DB);
  const updatedState = await personalizationUseCases.importGuestData(
    user.id,
    parsed.data.guestRecentPlays,
  );

  const validated = PersonalizationStateSchema.parse(updatedState);
  return c.json(validated, 200);
});
