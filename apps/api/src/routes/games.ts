import { Hono } from "hono";
import {
  PublicGameAvailabilityResponseSchema,
  SandboxGamePublicDetailSchema,
  SandboxGamePublicListResponseSchema,
} from "@owogg/contracts";
import { createContainer } from "../container.js";
import { edgeCache } from "../middleware/edgeCache.js";
import { readB2Config } from "./devGames.js";
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

// GET /api/games/sandbox/:slug — public, no auth. The one piece of sandbox-game metadata a
// player-facing page needs (title/description/genre) before they hit PLAY, without exposing
// anything review/publish-internal. Reuses resolveLiveVersion — the exact same PUBLIC +
// live-version gate the actual bundle-serving routes use (apps/api/src/routes/gameServing.ts) —
// so this can never say "found" for a game a player couldn't actually then go play. Same
// can't-distinguish-unknown-from-private 404 shape as everywhere else in the sandbox game surface.
gamesRouter.get("/sandbox/:slug", edgeCache({ ttlSeconds: 60 }), async (c) => {
  if (!c.env?.DB) return c.text("Not Found", 404);

  const { sandboxGameUseCases } = createContainer(c.env.DB);
  const resolved = await sandboxGameUseCases.resolveLiveVersion(c.req.param("slug"));
  if (!resolved) return c.text("Not Found", 404);

  return c.json(
    SandboxGamePublicDetailSchema.parse({
      slug: resolved.game.slug,
      title: resolved.game.title,
      shortDescription: resolved.game.shortDescription,
      description: resolved.game.description,
      genre: resolved.game.genre,
      mode: resolved.game.mode,
      hasLogo: resolved.game.logoKey !== null,
    }),
    200,
  );
});

// GET /api/games/sandbox — every currently-PUBLIC sandbox game, for the main site catalog (see
// apps/web/app/features/catalog/sandboxGameAdapter.ts, which merges this into the built-in-game
// grid on /games and the home page). Same 60s edge cache as the single-game route above — this
// list changes only when an admin approves/publishes/unpublishes a game.
gamesRouter.get("/sandbox", edgeCache({ ttlSeconds: 60 }), async (c) => {
  if (!c.env?.DB) return c.json(SandboxGamePublicListResponseSchema.parse({ games: [] }), 200);

  const { sandboxGameUseCases } = createContainer(c.env.DB);
  const games = await sandboxGameUseCases.listPublic();

  return c.json(
    SandboxGamePublicListResponseSchema.parse({
      games: games.map((game) => ({
        slug: game.slug,
        title: game.title,
        shortDescription: game.shortDescription,
        description: game.description,
        genre: game.genre,
        mode: game.mode,
        hasLogo: game.logoKey !== null,
      })),
    }),
    200,
  );
});

// GET /api/games/sandbox/:slug/logo — public, no auth. The actual logo image bytes, served
// separately from the JSON detail route above so the web catalog can point a plain <img src>
// straight at this URL. Never returns a raw storage key to any client — see
// SandboxGameUseCases.resolvePublicLogo and SandboxGameRecordSchema's `hasLogo` transform.
// Long-lived cache: the logo is set once at registration and there is currently no route to
// change it afterward, so there is nothing to invalidate.
gamesRouter.get("/sandbox/:slug/logo", edgeCache({ ttlSeconds: 3600 }), async (c) => {
  if (!c.env?.DB) return c.text("Not Found", 404);

  const { sandboxGameUseCases } = createContainer(c.env.DB, readB2Config(c.env));
  const resolved = await sandboxGameUseCases.resolvePublicLogo(c.req.param("slug"));
  if (!resolved) return c.text("Not Found", 404);

  return new Response(resolved.bytes, {
    status: 200,
    headers: { "Content-Type": resolved.contentType, "Cache-Control": "public, max-age=3600" },
  });
});
