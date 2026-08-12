import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRouter } from "./routes/auth.js";
import { scoresRouter } from "./routes/scores.js";
import { personalizationRouter } from "./routes/personalization.js";
import { progressionRouter } from "./routes/progression.js";
import { profileRouter } from "./routes/profile.js";
import { discordRouter } from "./routes/discordInteractions.js";
import { discordLinkRouter } from "./routes/discordLink.js";
import { discordGuildsRouter } from "./routes/discordGuilds.js";
import type { ApiEnv } from "./routes/auth.js";

const app = new Hono<ApiEnv>();

// Middleware
app.use("*", logger());

function isAllowedOrigin(origin: string | undefined, frontendUrl?: string): boolean {
  if (!origin) return true;
  const allowed = frontendUrl || "https://gamemoa-web.gamemoa.workers.dev";
  if (origin === allowed || origin === "https://gamemoa-web.gamemoa.workers.dev") return true;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return true;
  return false;
}

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowedFrontend = c.env?.FRONTEND_URL || "https://gamemoa-web.gamemoa.workers.dev";
      if (!origin) return allowedFrontend;
      if (isAllowedOrigin(origin, allowedFrontend)) return origin;
      return allowedFrontend;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// CSRF / Origin Guard for state-changing HTTP requests
app.use("*", async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const origin = c.req.header("Origin");
    const allowedFrontend = c.env?.FRONTEND_URL || "https://gamemoa-web.gamemoa.workers.dev";

    if (origin && !isAllowedOrigin(origin, allowedFrontend)) {
      return c.json({ error: "Forbidden: Origin verification failed" }, 403);
    }
  }
  await next();
});

// Health check
app.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "gamemoa-hono-api",
    runtime: "Cloudflare Workers",
  });
});

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    commit:
      c.env?.COMMIT_SHA ||
      (globalThis as unknown as { process?: { env?: { COMMIT_SHA?: string } } }).process?.env
        ?.COMMIT_SHA ||
      "dev",
  });
});

// Route modules
app.route("/api/auth", authRouter);
app.route("/api/scores", scoresRouter);
app.route("/api/personalization", personalizationRouter);
app.route("/api/progression", progressionRouter);
app.route("/api/profile", profileRouter);
app.route("/api/discord", discordRouter);
app.route("/api/discord", discordLinkRouter);
app.route("/api/discord/guilds", discordGuildsRouter);

// 404 Handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// Error Handler
app.onError((err, c) => {
  console.error("Unhandled Hono Error:", err);
  return c.json({ error: err.message || "Internal Server Error" }, 500);
});

export default app;
