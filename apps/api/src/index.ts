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
import { creatorsRouter } from "./routes/creators.js";
import { adminRouter } from "./routes/admin.js";
import { adminAuthRouter } from "./routes/adminAuth.js";
import { adminAccountsRouter } from "./routes/adminAccounts.js";
import { adminCreatorsRouter } from "./routes/adminCreators.js";
import { createContainer } from "./container.js";
import { getCreatorProviderAdapters } from "./infrastructure/creators/index.js";
import { FEATURED_POLICY } from "@owogg/core";
import type { ApiEnv } from "./routes/auth.js";

const app = new Hono<ApiEnv>();

// Middleware
function redactLogMessage(message: string): string {
  return message.replace(
    /([?&](?:token|register_token|play_token|challenge|code|state)=)[^&\s]*/gi,
    "$1[redacted]",
  );
}

app.use(
  "*",
  logger((message) => console.log(redactLogMessage(message))),
);

const DEFAULT_FRONTEND_URL = "https://owogg.com";
// Kept temporarily so anyone still holding the pre-cutover workers.dev URL open in a tab
// isn't immediately locked out. Safe to remove once traffic has fully moved to owogg.com.
const LEGACY_FRONTEND_URL = "https://gamemoa-web.gamemoa.workers.dev";

function isAllowedOrigin(origin: string | undefined, frontendUrl?: string): boolean {
  if (!origin) return true;
  const allowed = frontendUrl || DEFAULT_FRONTEND_URL;
  if (origin === allowed || origin === DEFAULT_FRONTEND_URL || origin === LEGACY_FRONTEND_URL) {
    return true;
  }
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return true;
  return false;
}

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowedFrontend = c.env?.FRONTEND_URL || DEFAULT_FRONTEND_URL;
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
    const allowedFrontend = c.env?.FRONTEND_URL || DEFAULT_FRONTEND_URL;

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
    service: "owogg-hono-api",
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
app.route("/api/creators", creatorsRouter);
app.route("/api/admin", adminRouter);
app.route("/api/admin", adminAuthRouter);
app.route("/api/admin", adminAccountsRouter);
app.route("/api/admin/creators", adminCreatorsRouter);

// 404 Handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// Error Handler
app.onError((err, c) => {
  console.error("Unhandled Hono Error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

/**
 * Phase E2A/E2B: Featured Creator 취득 심사(6시간)와 기존 Featured 재검증(14일) 스케줄러.
 * - 취득 심사와 재검증 잡을 서로 다른 repository query로 바운디드 처리.
 * - 단일 잡/프로바이더 실패가 배치 전체를 막지 않음 (잡 단위 FAILED_RETRYABLE 처리).
 * - 사용자 OAuth 토큰은 저장하지 않으며, 공식 app-level/공개 API만 사용합니다.
 */
async function scheduledHandler(
  _controller: ScheduledController,
  env: ApiEnv["Bindings"],
  ctx: ExecutionContext,
): Promise<void> {
  const adapters = getCreatorProviderAdapters(env);
  const { creatorUseCases, adminAuthUseCases } = createContainer(env.DB);

  const task = (async () => {
    const now = new Date();
    await creatorUseCases.ensureFeaturedRevalidationJobs({
      now,
      batchSize: FEATURED_POLICY.DEFAULT_BATCH_SIZE,
    });
    const acquisition = await creatorUseCases.runDueFeaturedReviews({
      adapters,
      now,
      batchSize: FEATURED_POLICY.DEFAULT_BATCH_SIZE,
    });
    const revalidation = await creatorUseCases.runDueFeaturedRevalidations({
      adapters,
      now,
      batchSize: FEATURED_POLICY.DEFAULT_BATCH_SIZE,
    });
    console.log(
      `[creator-review] scheduled run done: acquisitionProcessed=${acquisition.processed} acquisitionFeatured=${acquisition.featured} acquisitionNotEligible=${acquisition.notEligible} acquisitionManualReview=${acquisition.manualReview} acquisitionFailed=${acquisition.failed} revalidationProcessed=${revalidation.processed} retained=${revalidation.retained} revoked=${revalidation.revoked} revalidationManualReview=${revalidation.manualReview} revalidationFailed=${revalidation.failed}`,
    );
  })().catch((err) => {
    console.error("[creator-review] scheduled run crashed:", err);
  });

  // Bounded, opportunistic cleanup of expired admin step-up challenges/sessions/login-attempt
  // rows — reuses this existing 6-hour Cron instead of a new background service.
  const adminCleanupTask = adminAuthUseCases
    .cleanupExpired(new Date())
    .catch((err) => console.error("[admin-auth] cleanup crashed:", err));

  ctx.waitUntil(Promise.all([task, adminCleanupTask]));
}

export { app };

export default {
  fetch: app.fetch,
  scheduled: scheduledHandler,
};
