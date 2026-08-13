import { Hono } from "hono";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import {
  AdminGoogleStepUpRequestSchema,
  AdminLoginRequestSchema,
  AdminMeResponseSchema,
} from "@gamemoa/contracts";
import { ADMIN_AUTH_POLICY, isAdminGoogleSub } from "@gamemoa/core";
import { createContainer } from "../container.js";
import { isAdminUserId, isTrustedAdminOrigin } from "../auth/admin.js";
import { verifyAdminPassword, safeStringEqual } from "../auth/adminPassword.js";
import { verifyGoogleToken } from "../infrastructure/oauth/google.js";
import { isLocalhost, type ApiEnv } from "./auth.js";

export const adminAuthRouter = new Hono<ApiEnv>();

const ADMIN_STEP_UP_COOKIE = "gamemoa_admin_stepup";
const ADMIN_SESSION_COOKIE = "gamemoa_admin_session";
const STEP_UP_MAX_AGE_SECONDS = Math.floor(ADMIN_AUTH_POLICY.STEP_UP_CHALLENGE_TTL_MS / 1000);
const ADMIN_SESSION_MAX_AGE_SECONDS = Math.floor(ADMIN_AUTH_POLICY.ADMIN_SESSION_TTL_MS / 1000);

adminAuthRouter.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (["POST", "PUT", "PATCH", "DELETE"].includes(c.req.method.toUpperCase())) {
    if (!isTrustedAdminOrigin(c.req.header("Origin"), c.env.FRONTEND_URL)) {
      return c.json(
        { error: { code: "FORBIDDEN", message: "요청 출처를 확인할 수 없습니다." } },
        403,
      );
    }
  }
  await next();
});

interface EligibleAdmin {
  userId: number;
  rawSessionToken: string;
}

/** Root-eligibility check only (session valid + ADMIN_USER_IDS) — used by the step-up/login
 * endpoints themselves, which exist precisely to grant the elevated layer these guard. */
async function requireEligible(c: Context<ApiEnv>): Promise<Response | EligibleAdmin> {
  const rawSessionToken = getCookie(c, "gamemoa_session");
  if (!rawSessionToken) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }
  const { sessionRepo } = createContainer(c.env.DB);
  const sessionResult = await sessionRepo.findSession(rawSessionToken);
  if (!sessionResult) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }
  const userId = sessionResult.user.id;
  if (!isAdminUserId(userId, c.env.ADMIN_USER_IDS)) {
    return c.json({ error: { code: "FORBIDDEN", message: "관리자 권한이 필요합니다." } }, 403);
  }
  return { userId, rawSessionToken };
}

function isResponse(value: Response | EligibleAdmin): value is Response {
  return value instanceof Response;
}

function setAdminCookie(
  c: Context<ApiEnv>,
  name: string,
  value: string,
  maxAgeSeconds: number,
): void {
  const secure = !isLocalhost(c.req.url);
  setCookie(c, name, value, {
    httpOnly: true,
    secure,
    // SameSite=Strict is not viable here: the web app and API worker are on different
    // subdomains (cross-site), and Strict would stop the browser from ever sending this cookie
    // on the credentialed cross-origin requests the admin UI makes. None (with Secure) is the
    // closest compatible equivalent in production; Lax is used for local http development.
    sameSite: secure ? "None" : "Lax",
    maxAge: maxAgeSeconds,
    path: "/",
  });
}

// GET /api/admin/me — safe state only; never returns ADMIN_USER_IDS/ADMIN_GOOGLE_SUBS/
// ADMIN_LOGIN_USERNAME/password hash/internal challenge hashes.
adminAuthRouter.get("/me", async (c) => {
  const rawSessionToken = getCookie(c, "gamemoa_session");
  if (!rawSessionToken) {
    return c.json(
      AdminMeResponseSchema.parse({
        authenticated: false,
        eligible: false,
        adminAuthenticated: false,
        stepUpRequired: false,
      }),
    );
  }

  const container = createContainer(c.env.DB);
  const sessionResult = await container.sessionRepo.findSession(rawSessionToken);
  if (!sessionResult) {
    return c.json(
      AdminMeResponseSchema.parse({
        authenticated: false,
        eligible: false,
        adminAuthenticated: false,
        stepUpRequired: false,
      }),
    );
  }

  const eligible = isAdminUserId(sessionResult.user.id, c.env.ADMIN_USER_IDS);
  let adminAuthenticated = false;
  if (eligible) {
    const adminSession = await container.adminAuthUseCases.validateAdminSession({
      rawToken: getCookie(c, ADMIN_SESSION_COOKIE),
      rawSessionToken,
    });
    adminAuthenticated = Boolean(adminSession);
  }

  return c.json(
    AdminMeResponseSchema.parse({
      authenticated: true,
      eligible,
      adminAuthenticated,
      stepUpRequired: eligible && !adminAuthenticated,
    }),
  );
});

// POST /api/admin/auth/google — fresh Google step-up. Never treats "Google already linked" (a
// normal login) as fresh proof; requires a brand-new ID token from this exact request.
adminAuthRouter.post("/auth/google", async (c) => {
  const eligible = await requireEligible(c);
  if (isResponse(eligible)) return eligible;

  const rawBody = await c.req.json().catch(() => ({}));
  const parsed = AdminGoogleStepUpRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json(
      { error: { code: "INVALID_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      400,
    );
  }

  const verified = await verifyGoogleToken(parsed.data.credential, c.env.GOOGLE_CLIENT_ID);
  const deny = () =>
    c.json({ error: { code: "STEP_UP_FAILED", message: "Google 본인 확인에 실패했습니다." } }, 403);

  if (!verified.valid || !verified.profile) return deny();

  const { sub, iat } = verified.profile;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (iat <= 0 || nowSeconds - iat > ADMIN_AUTH_POLICY.GOOGLE_TOKEN_MAX_AGE_SECONDS) {
    return deny(); // stale/cached token — must be a fresh sign-in right now
  }

  if (!isAdminGoogleSub(sub, c.env.ADMIN_GOOGLE_SUBS)) return deny();

  // The Google sub must be linked (via GAMEMOA's own OAuth linking) to THIS GAMEMOA account —
  // never authorized by email match.
  const { userRepo, adminAuthUseCases } = createContainer(c.env.DB);
  const linkedAccount = await userRepo.findOAuthAccount("google", sub);
  if (!linkedAccount || linkedAccount.user_id !== eligible.userId) return deny();

  const { rawToken } = await adminAuthUseCases.beginStepUp({
    userId: eligible.userId,
    googleSub: sub,
    rawSessionToken: eligible.rawSessionToken,
  });

  setAdminCookie(c, ADMIN_STEP_UP_COOKIE, rawToken, STEP_UP_MAX_AGE_SECONDS);
  return c.json({ stepUpVerified: true });
});

// POST /api/admin/auth/login — second factor (admin username/password), only after a valid,
// unconsumed step-up challenge for this exact session.
adminAuthRouter.post("/auth/login", async (c) => {
  const eligible = await requireEligible(c);
  if (isResponse(eligible)) return eligible;

  const { adminAuthUseCases } = createContainer(c.env.DB);

  const rateLimit = await adminAuthUseCases.checkRateLimit(eligible.userId);
  if (rateLimit.locked) {
    c.header("Retry-After", String(rateLimit.retryAfterSeconds));
    return c.json({ error: { code: "RATE_LIMITED", message: "잠시 후 다시 시도해주세요." } }, 429);
  }

  const rawBody = await c.req.json().catch(() => ({}));
  const parsed = AdminLoginRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json(
      { error: { code: "INVALID_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      400,
    );
  }

  const stepUp = await adminAuthUseCases.consumeStepUp({
    rawToken: getCookie(c, ADMIN_STEP_UP_COOKIE),
    rawSessionToken: eligible.rawSessionToken,
    expectedUserId: eligible.userId,
  });
  if (!stepUp) {
    return c.json(
      { error: { code: "STEP_UP_REQUIRED", message: "Google 본인 확인을 먼저 완료해주세요." } },
      403,
    );
  }

  const usernameOk = safeStringEqual(parsed.data.username, c.env.ADMIN_LOGIN_USERNAME ?? "");
  const passwordOk = await verifyAdminPassword(parsed.data.password, c.env.ADMIN_PASSWORD_PBKDF2);
  const credentialsOk =
    Boolean(c.env.ADMIN_LOGIN_USERNAME) &&
    Boolean(c.env.ADMIN_PASSWORD_PBKDF2) &&
    usernameOk &&
    passwordOk;

  if (!credentialsOk) {
    await adminAuthUseCases.recordAttempt(eligible.userId, false);
    // Generic message — never reveals whether username or password was the wrong factor.
    return c.json(
      { error: { code: "INVALID_CREDENTIALS", message: "자격 증명이 올바르지 않습니다." } },
      401,
    );
  }

  await adminAuthUseCases.recordAttempt(eligible.userId, true);
  const { rawToken } = await adminAuthUseCases.issueAdminSession({
    userId: eligible.userId,
    rawSessionToken: eligible.rawSessionToken,
  });

  setAdminCookie(c, ADMIN_SESSION_COOKIE, rawToken, ADMIN_SESSION_MAX_AGE_SECONDS);
  deleteCookie(c, ADMIN_STEP_UP_COOKIE, { path: "/" });

  return c.json({ adminAuthenticated: true });
});

// POST /api/admin/auth/logout
adminAuthRouter.post("/auth/logout", async (c) => {
  const rawAdminSessionToken = getCookie(c, ADMIN_SESSION_COOKIE);
  if (rawAdminSessionToken) {
    const { adminAuthUseCases } = createContainer(c.env.DB);
    await adminAuthUseCases.logout(rawAdminSessionToken);
  }
  deleteCookie(c, ADMIN_SESSION_COOKIE, { path: "/" });
  return c.json({ success: true });
});
