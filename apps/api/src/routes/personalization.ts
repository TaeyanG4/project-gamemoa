import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import {
  ImportGuestPersonalizationRequestSchema,
  PersonalizationStateSchema,
} from "@gamemoa/contracts";
import type { AppContainer } from "../container.js";

type Env = {
  Bindings: {
    DB: any;
  };
  Variables: {
    container?: AppContainer;
  };
};

export const personalizationRouter = new Hono<Env>();

async function getAuthUser(c: any) {
  const container = c.get("container");
  if (!container) return null;

  const sessionId = getCookie(c, "gamemoa_session");
  if (!sessionId) return null;

  const result = await container.sessionRepo.findSession(sessionId);
  return result ? result.user : null;
}

// GET /api/personalization
personalizationRouter.get("/", async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: "Unauthenticated" }, 401);
  }

  const container = c.get("container")!;
  const state = await container.personalizationUseCases.getPersonalizationState(user.id);
  const validated = PersonalizationStateSchema.parse(state);
  return c.json(validated, 200);
});

// POST /api/personalization/favorites/:gameId
personalizationRouter.post("/favorites/:gameId", async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: "Unauthenticated" }, 401);
  }

  const gameId = c.req.param("gameId");
  const container = c.get("container")!;

  try {
    await container.personalizationUseCases.addFavorite(user.id, gameId);
    return c.json({ success: true }, 200);
  } catch (err: any) {
    return c.json({ error: err.message || "Invalid game" }, 400);
  }
});

// DELETE /api/personalization/favorites/:gameId
personalizationRouter.delete("/favorites/:gameId", async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: "Unauthenticated" }, 401);
  }

  const gameId = c.req.param("gameId");
  const container = c.get("container")!;
  await container.personalizationUseCases.removeFavorite(user.id, gameId);
  return c.json({ success: true }, 200);
});

// POST /api/personalization/recent/:gameId
personalizationRouter.post("/recent/:gameId", async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: "Unauthenticated" }, 401);
  }

  const gameId = c.req.param("gameId");
  const container = c.get("container")!;

  try {
    await container.personalizationUseCases.recordRecentPlay(user.id, gameId);
    return c.json({ success: true }, 200);
  } catch (err: any) {
    return c.json({ error: err.message || "Invalid game" }, 400);
  }
});

// POST /api/personalization/import
personalizationRouter.post("/import", async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: "Unauthenticated" }, 401);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = ImportGuestPersonalizationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid import payload" }, 400);
  }

  const container = c.get("container")!;
  const updatedState = await container.personalizationUseCases.importGuestData(
    user.id,
    parsed.data.guestFavorites,
    parsed.data.guestRecentPlays,
  );

  const validated = PersonalizationStateSchema.parse(updatedState);
  return c.json(validated, 200);
});
