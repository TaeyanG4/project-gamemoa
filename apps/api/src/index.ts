import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRouter } from "./routes/auth.js";
import { scoresRouter } from "./routes/scores.js";
import type { ApiEnv } from "./routes/auth.js";

const app = new Hono<ApiEnv>();

// Middleware
app.use("*", logger());

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowedFrontend = c.env?.FRONTEND_URL || "https://gamemoa-web.gamemoa.workers.dev";
      if (!origin) return allowedFrontend;
      if (origin === allowedFrontend || origin === "https://gamemoa-web.gamemoa.workers.dev") return origin;
      if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return origin;
      }
      return allowedFrontend;
    },

    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check
app.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "gamemoa-hono-api",
    runtime: "Cloudflare Workers",
  });
});

app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

// Route modules
app.route("/api/auth", authRouter);
app.route("/api/scores", scoresRouter);

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
