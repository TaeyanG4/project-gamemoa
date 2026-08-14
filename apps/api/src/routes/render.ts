import { Hono } from "hono";
import { renderRankCardPng } from "../infrastructure/render/rankCard.js";
import type { ApiEnv } from "./auth.js";

export const renderRouter = new Hono<ApiEnv>();

function clampInt(value: string | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

// GET /api/render/rank-card — renders a PNG rank/profile card for Discord embed `image` fields.
// Public, no auth: every value it renders (nickname, level, XP, rank) is already shown
// unauthenticated elsewhere (public profile page, /owogg leaderboard, /owogg rank/profile's own
// text fields) — this endpoint is a pure renderer, not a new data-exposure surface. The caller
// (interactionHandlers.ts) already resolved and validated this data server-side; query params
// here are display values only, clamped/truncated defensively rather than trusted as identifiers.
renderRouter.get("/rank-card", async (c) => {
  const nickname = (c.req.query("nickname") ?? "Player").slice(0, 40);
  const subtitle = (c.req.query("subtitle") ?? "OwOGG").slice(0, 40);
  const level = clampInt(c.req.query("level"), 1, 9999, 1);
  const totalXp = clampInt(c.req.query("totalXp"), 0, 999_999_999, 0);
  const progressPercent = clampInt(c.req.query("progressPercent"), 0, 100, 0);
  const rawRank = c.req.query("rank");
  const rank = rawRank !== undefined ? clampInt(rawRank, 1, 999_999, 1) : undefined;

  try {
    const png = await renderRankCardPng({
      nickname,
      subtitle,
      level,
      totalXp,
      progressPercent,
      rank,
    });

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // Discord (and any other embed consumer) can cache this — the same query params always
        // render the same image, and the bot mints a fresh URL each time the underlying data
        // actually changes rather than relying on cache invalidation.
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error("Rank card render failed:", err);
    return c.json({ error: "Failed to render card" }, 500);
  }
});
