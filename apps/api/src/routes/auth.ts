import { Hono } from "hono";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createContainer } from "../container.js";
import type { D1Database } from "@cloudflare/workers-types";
import { verifyGoogleToken } from "../infrastructure/oauth/google.js";
import {
  buildDiscordAuthorizeUrl,
  exchangeDiscordCode,
  fetchUserManageableGuilds,
} from "../infrastructure/oauth/discord.js";
import {
  ConnectedProvidersResponseSchema,
  LinkProviderRequestSchema,
  LinkProviderResponseSchema,
  UnlinkProviderResponseSchema,
  MergePreviewPairSchema,
  CreateMergeChallengeResponseSchema,
  ConfirmAccountMergeRequestSchema,
  ConfirmAccountMergeResponseSchema,
} from "@gamemoa/contracts";
import type { SocialProvider } from "@gamemoa/contracts";

const KNOWN_PROVIDERS: SocialProvider[] = ["google", "discord"];

function isKnownProvider(value: string): value is SocialProvider {
  return (KNOWN_PROVIDERS as string[]).includes(value);
}

function accountError(
  c: Context<ApiEnv>,
  code: string,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 500,
  extra?: Record<string, unknown>,
) {
  return c.json({ error: { code, message }, ...(extra ?? {}) }, status);
}

async function requireAuth(
  c: Context<ApiEnv>,
): Promise<{ userId: number; user: { id: number; nickname: string } } | null> {
  const sessionId = getCookie(c, "gamemoa_session");
  if (!sessionId) return null;
  const { sessionRepo } = createContainer(c.env.DB);
  const result = await sessionRepo.findSession(sessionId);
  if (!result) return null;
  return { userId: result.user.id, user: { id: result.user.id, nickname: result.user.nickname } };
}

export type ApiEnv = {
  Bindings: {
    DB: D1Database;
    GOOGLE_CLIENT_ID?: string;
    DISCORD_CLIENT_ID?: string;
    DISCORD_CLIENT_SECRET?: string;
    DISCORD_REDIRECT_URI?: string;
    /** Discord application's public key (non-secret), used to verify Interaction signatures. */
    DISCORD_PUBLIC_KEY?: string;
    FRONTEND_URL?: string;
    COMMIT_SHA?: string;
    /** 쉼표로 구분한 명시적 GAMEMOA 사용자 ID. 미설정 시 관리자 권한 없음. */
    ADMIN_USER_IDS?: string;
    YOUTUBE_CLIENT_ID?: string;
    YOUTUBE_CLIENT_SECRET?: string;
    /** YouTube Data API key (public data) — 6시간 자동 재심사용 공식 지표 조회. */
    YOUTUBE_API_KEY?: string;
    YOUTUBE_REDIRECT_URI?: string;
    TWITCH_CLIENT_ID?: string;
    TWITCH_CLIENT_SECRET?: string;
    TWITCH_REDIRECT_URI?: string;
    CHZZK_CLIENT_ID?: string;
    CHZZK_CLIENT_SECRET?: string;
    CHZZK_REDIRECT_URI?: string;
    SOOP_CLIENT_ID?: string;
    SOOP_CLIENT_SECRET?: string;
    SOOP_REDIRECT_URI?: string;
    USE_MOCK_CREATOR_PROVIDERS?: string;
  };
};

export const authRouter = new Hono<ApiEnv>();

// Helper to check if request is localhost
function isLocalhost(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

// Discord only has ONE redirect_uri registered in its Developer Portal (DISCORD_REDIRECT_URI,
// pointing at /api/auth/discord/callback). Both the LOGIN flow and the LINK flow must send
// this exact same redirect_uri to the authorize endpoint AND the token exchange, or Discord
// rejects the request with "잘못된 OAuth2 redirect_uri" before the user ever sees a prompt.
// LOGIN vs LINK intent is distinguished by which state cookie is present, not by the path.
export function getDiscordRedirectUri(c: Context<ApiEnv>): string {
  return c.env.DISCORD_REDIRECT_URI || `${new URL(c.req.url).origin}/api/auth/discord/callback`;
}

// GET /api/auth/providers (non-secret readiness check)
authRouter.get("/providers", (c) => {
  const googleConfigured = Boolean(c.env?.GOOGLE_CLIENT_ID);
  const discordConfigured = Boolean(
    c.env?.DISCORD_CLIENT_ID &&
    c.env?.DISCORD_CLIENT_SECRET &&
    c.env?.DISCORD_REDIRECT_URI &&
    c.env?.FRONTEND_URL,
  );

  return c.json({
    google: {
      configured: googleConfigured,
      ...(googleConfigured ? { clientId: c.env.GOOGLE_CLIENT_ID } : {}),
    },
    discord: {
      configured: discordConfigured,
    },
  });
});

// POST /api/auth/google
authRouter.post("/google", async (c) => {
  try {
    const body = (await c.req.json<{ credential?: string }>().catch(() => ({}))) as {
      credential?: string;
    };
    const credential = body.credential;

    if (!credential) {
      return c.json({ error: "Credential is required" }, 400);
    }

    const verifyResult = await verifyGoogleToken(credential, c.env.GOOGLE_CLIENT_ID);
    if (!verifyResult.valid || !verifyResult.profile) {
      return c.json({ error: verifyResult.reason || "Invalid Google token" }, 401);
    }

    const { userRepo, sessionRepo } = createContainer(c.env.DB);
    const profile = verifyResult.profile;

    const user = await userRepo.findOrCreateUser({
      provider: "google",
      providerUserId: profile.sub,
      email: profile.email,
      nickname: profile.name,
      avatarUrl: profile.picture,
    });

    const session = await sessionRepo.createSession(user.id);
    const secure = !isLocalhost(c.req.url);

    setCookie(c, "gamemoa_session", session.id, {
      httpOnly: true,
      secure,
      sameSite: secure ? "None" : "Lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return c.json({
      authenticated: true,
      user,
    });
  } catch (err) {
    console.error("Google Auth Error:", err);
    return c.json({ error: "Internal server error during Google login" }, 500);
  }
});

// GET /api/auth/discord
authRouter.get("/discord", async (c) => {
  const clientId = c.env.DISCORD_CLIENT_ID;
  const redirectUri = getDiscordRedirectUri(c);

  if (!clientId) {
    return c.text("DISCORD_CLIENT_ID is not configured", 500);
  }

  const state = crypto.randomUUID();

  setCookie(c, "discord_oauth_state", state, {
    httpOnly: true,
    secure: !isLocalhost(c.req.url),
    sameSite: "Lax",
    maxAge: 600,
    path: "/",
  });

  const discordUrl = buildDiscordAuthorizeUrl({
    clientId,
    redirectUri,
    state,
  });

  return c.redirect(discordUrl);
});

// GET /api/auth/discord/register-server — starts 1-time Discord OAuth for guild registration
authRouter.get("/discord/register-server", async (c) => {
  const auth = await requireAuth(c);
  const frontendUrl = c.env.FRONTEND_URL || `${new URL(c.req.url).origin}`;
  if (!auth) {
    return c.redirect(`${frontendUrl}/discord/servers?register_status=unauthorized`);
  }

  const clientId = c.env.DISCORD_CLIENT_ID;
  const redirectUri = getDiscordRedirectUri(c);

  if (!clientId) {
    return c.text("DISCORD_CLIENT_ID is not configured", 500);
  }

  const state = crypto.randomUUID();
  const payload = JSON.stringify({ state, userId: auth.userId });

  setCookie(c, "discord_register_server_state", payload, {
    httpOnly: true,
    secure: !isLocalhost(c.req.url),
    sameSite: "Lax",
    maxAge: 600,
    path: "/",
  });

  const discordUrl = buildDiscordAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    scope: "identify guilds",
  });

  return c.redirect(discordUrl);
});

// GET /api/auth/discord/callback — handles LOGIN, LINK, and SERVER_REGISTRATION flows, since
// all share the single redirect_uri registered with Discord.
authRouter.get("/discord/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const frontendUrl = c.env.FRONTEND_URL || `${new URL(c.req.url).origin}`;

  // Check for Server Registration intent
  const registerServerStateCookie = getCookie(c, "discord_register_server_state");
  if (registerServerStateCookie) {
    deleteCookie(c, "discord_register_server_state", { path: "/" });

    let registerIntent: { state: string; userId: number } | null = null;
    try {
      const parsed = JSON.parse(registerServerStateCookie) as { state?: string; userId?: number };
      if (typeof parsed.state === "string" && typeof parsed.userId === "number") {
        registerIntent = { state: parsed.state, userId: parsed.userId };
      }
    } catch {
      registerIntent = null;
    }

    if (!code || !state || !registerIntent || registerIntent.state !== state) {
      return c.redirect(`${frontendUrl}/discord/servers?register_status=error`);
    }

    const auth = await requireAuth(c);
    if (!auth || auth.userId !== registerIntent.userId) {
      return c.redirect(`${frontendUrl}/discord/servers?register_status=unauthorized`);
    }

    const clientId = c.env.DISCORD_CLIENT_ID;
    const clientSecret = c.env.DISCORD_CLIENT_SECRET;
    const redirectUri = getDiscordRedirectUri(c);

    if (!clientId || !clientSecret) {
      return c.redirect(`${frontendUrl}/discord/servers?register_status=error`);
    }

    const exchangeResult = await exchangeDiscordCode({ code, clientId, clientSecret, redirectUri });
    if (!exchangeResult.valid || !exchangeResult.accessToken) {
      return c.redirect(`${frontendUrl}/discord/servers?register_status=error`);
    }

    const guildsResult = await fetchUserManageableGuilds(exchangeResult.accessToken);
    if (!guildsResult.valid || !guildsResult.guilds || guildsResult.guilds.length === 0) {
      return c.redirect(`${frontendUrl}/discord/servers?register_status=no_guilds`);
    }

    const { discordGuildRepo } = createContainer(c.env.DB);
    const challenge = await discordGuildRepo.createRegistrationChallenge({
      userId: auth.userId,
      manageableGuilds: guildsResult.guilds,
      ttlSeconds: 900,
    });

    return c.redirect(
      `${frontendUrl}/discord/servers?register_token=${encodeURIComponent(challenge.token)}`,
    );
  }

  const linkStateCookie = getCookie(c, "discord_link_state");

  if (linkStateCookie) {
    deleteCookie(c, "discord_link_state", { path: "/" });

    let linkIntent: { state: string; userId: number } | null = null;
    try {
      const parsed = JSON.parse(linkStateCookie) as { state?: string; userId?: number };
      if (typeof parsed.state === "string" && typeof parsed.userId === "number") {
        linkIntent = { state: parsed.state, userId: parsed.userId };
      }
    } catch {
      linkIntent = null;
    }

    if (!code || !state || !linkIntent || linkIntent.state !== state) {
      return c.redirect(`${frontendUrl}/profile?link_status=error`);
    }

    // Re-validate the current authenticated session belongs to the same user that started the link.
    const auth = await requireAuth(c);
    if (!auth || auth.userId !== linkIntent.userId) {
      return c.redirect(`${frontendUrl}/profile?link_status=error`);
    }

    const clientId = c.env.DISCORD_CLIENT_ID;
    const clientSecret = c.env.DISCORD_CLIENT_SECRET;
    const redirectUri = getDiscordRedirectUri(c);

    if (!clientId || !clientSecret) {
      return c.redirect(`${frontendUrl}/profile?link_status=error`);
    }
    const exchangeResult = await exchangeDiscordCode({ code, clientId, clientSecret, redirectUri });
    if (!exchangeResult.valid || !exchangeResult.profile) {
      return c.redirect(`${frontendUrl}/profile?link_status=error`);
    }

    const profile = exchangeResult.profile;
    const { identityUseCases } = createContainer(c.env.DB);
    const result = await identityUseCases.linkProvider(
      auth.userId,
      "discord",
      profile.id,
      profile.email,
    );

    if (!result.ok) {
      if (result.code === "ACCOUNT_ALREADY_LINKED") {
        const { accountMergeUseCases } = createContainer(c.env.DB);
        const challenge = await accountMergeUseCases.startMergeChallenge(
          auth.userId,
          result.conflictUserId,
          "discord",
          profile.id,
        );
        return c.redirect(
          `${frontendUrl}/profile?link_status=conflict&provider=discord&challenge=${encodeURIComponent(challenge.challengeId)}`,
        );
      }
      return c.redirect(`${frontendUrl}/profile?link_status=already&provider=discord`);
    }

    return c.redirect(`${frontendUrl}/profile?link_status=success&provider=discord`);
  }

  // ---- Normal LOGIN callback ----
  const cookieState = getCookie(c, "discord_oauth_state");

  if (!code || !state || !cookieState || cookieState !== state) {
    deleteCookie(c, "discord_oauth_state", { path: "/" });
    return c.text("Invalid state or missing code", 400);
  }

  deleteCookie(c, "discord_oauth_state", { path: "/" });

  const clientId = c.env.DISCORD_CLIENT_ID;
  const clientSecret = c.env.DISCORD_CLIENT_SECRET;
  const redirectUri = getDiscordRedirectUri(c);

  if (!clientId || !clientSecret) {
    return c.text("Discord client secret not configured", 500);
  }

  const exchangeResult = await exchangeDiscordCode({
    code,
    clientId,
    clientSecret,
    redirectUri,
  });

  if (!exchangeResult.valid || !exchangeResult.profile) {
    return c.text(exchangeResult.reason || "Failed to exchange Discord code", 400);
  }

  const profile = exchangeResult.profile;
  const { userRepo, sessionRepo } = createContainer(c.env.DB);

  const user = await userRepo.findOrCreateUser({
    provider: "discord",
    providerUserId: profile.id,
    email: profile.email,
    nickname: profile.username,
    avatarUrl: profile.avatarUrl,
  });

  const session = await sessionRepo.createSession(user.id);
  const secure = !isLocalhost(c.req.url);

  setCookie(c, "gamemoa_session", session.id, {
    httpOnly: true,
    secure,
    sameSite: secure ? "None" : "Lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return c.redirect(frontendUrl);
});

// GET /api/auth/me
authRouter.get("/me", async (c) => {
  const sessionId = getCookie(c, "gamemoa_session");
  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  try {
    const { sessionRepo } = createContainer(c.env.DB);
    const result = await sessionRepo.findSession(sessionId);

    if (!result) {
      deleteCookie(c, "gamemoa_session", { path: "/" });
      return c.json({ authenticated: false }, 401);
    }

    return c.json({
      authenticated: true,
      user: result.user,
    });
  } catch (err) {
    console.error("/me Error:", err);
    return c.json({ authenticated: false }, 401);
  }
});

// POST /api/auth/logout
authRouter.post("/logout", async (c) => {
  const sessionId = getCookie(c, "gamemoa_session");
  if (sessionId) {
    try {
      const { sessionRepo } = createContainer(c.env.DB);
      await sessionRepo.deleteSession(sessionId);
    } catch {
      // Ignore DB error during logout
    }
  }

  deleteCookie(c, "gamemoa_session", { path: "/" });
  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// Account Identity: connected providers, linking and unlinking
// ---------------------------------------------------------------------------

// GET /api/auth/accounts — list the connected OAuth providers for the current user
authRouter.get("/accounts", async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Unauthenticated" } }, 401);
  }

  if (!c.env?.DB) {
    return c.json({ error: "Database unavailable" }, 500);
  }

  const { identityUseCases } = createContainer(c.env.DB);
  const providers = await identityUseCases.getConnectedProviders(auth.userId);
  const validated = ConnectedProvidersResponseSchema.parse({ providers });
  return c.json(validated, 200);
});

// POST /api/auth/link/google — attach a Google identity to the current account
authRouter.post("/link/google", async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Unauthenticated" } }, 401);
  }

  if (!c.env?.DB) {
    return c.json({ error: "Database unavailable" }, 500);
  }

  const body = (await c.req.json<{ credential?: string }>().catch(() => ({}))) as {
    credential?: string;
  };
  const parsed = LinkProviderRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Credential is required" }, 400);
  }

  const verifyResult = await verifyGoogleToken(parsed.data.credential, c.env.GOOGLE_CLIENT_ID);
  if (!verifyResult.valid || !verifyResult.profile) {
    return c.json({ error: verifyResult.reason || "Invalid Google token" }, 401);
  }

  const profile = verifyResult.profile;
  const { identityUseCases } = createContainer(c.env.DB);
  const result = await identityUseCases.linkProvider(
    auth.userId,
    "google",
    profile.sub,
    profile.email,
  );

  if (!result.ok) {
    if (result.code === "ACCOUNT_ALREADY_LINKED") {
      const { accountMergeUseCases } = createContainer(c.env.DB);
      const challenge = await accountMergeUseCases.startMergeChallenge(
        auth.userId,
        result.conflictUserId,
        "google",
        profile.sub,
      );
      const validated = CreateMergeChallengeResponseSchema.parse({
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        conflictUserId: result.conflictUserId,
        provider: "google",
      });
      return c.json(
        {
          error: {
            code: "ACCOUNT_ALREADY_LINKED",
            message:
              "이 Google 계정은 이미 다른 GAMEMOA 계정으로 사용 중입니다. 계정 통합을 진행할 수 있습니다.",
          },
          mergeChallenge: validated,
        },
        409,
      );
    }
    return accountError(
      c,
      "PROVIDER_ALREADY_LINKED",
      "이 계정에는 이미 Google 로그인이 연결되어 있습니다.",
      409,
    );
  }

  const validated = LinkProviderResponseSchema.parse({
    linked: true,
    provider: "google",
    alreadyLinked: result.alreadyLinked,
  });
  return c.json(validated, 200);
});

// GET /api/auth/link/discord — begin Discord OAuth LINK flow
authRouter.get("/link/discord", async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.text("Authentication required to link a provider", 401);
  }

  const clientId = c.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return c.text("DISCORD_CLIENT_ID is not configured", 500);
  }
  const redirectUri = getDiscordRedirectUri(c);

  const state = crypto.randomUUID();
  const statePayload = JSON.stringify({ state, userId: auth.userId });
  setCookie(c, "discord_link_state", statePayload, {
    httpOnly: true,
    secure: !isLocalhost(c.req.url),
    sameSite: "Lax",
    maxAge: 600,
    path: "/",
  });

  const discordUrl = buildDiscordAuthorizeUrl({ clientId, redirectUri, state });
  return c.redirect(discordUrl);
});

// DELETE /api/auth/link/:provider — detach a provider from the current account
authRouter.delete("/link/:provider", async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Unauthenticated" } }, 401);
  }

  if (!c.env?.DB) {
    return c.json({ error: "Database unavailable" }, 500);
  }

  const provider = c.req.param("provider");
  if (!isKnownProvider(provider)) {
    return c.json({ error: "Unknown provider" }, 400);
  }

  const { identityUseCases } = createContainer(c.env.DB);
  const result = await identityUseCases.unlinkProvider(auth.userId, provider);

  if (!result.ok) {
    return accountError(
      c,
      "LAST_AUTH_PROVIDER",
      "마지막 로그인 수단은 해제할 수 없습니다. 최소 한 개의 로그인 계정이 필요합니다.",
      400,
    );
  }

  const validated = UnlinkProviderResponseSchema.parse({
    unlinked: true,
    provider: result.provider,
  });
  return c.json(validated, 200);
});

// ---------------------------------------------------------------------------
// Account merge workflow (Primary Account Wins)
// ---------------------------------------------------------------------------

// POST /api/auth/merge/challenge — resolve an existing fresh merge challenge for a conflict
authRouter.post("/merge/challenge", async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Unauthenticated" } }, 401);
  }
  if (!c.env?.DB) {
    return c.json({ error: "Database unavailable" }, 500);
  }

  const body = (await c.req
    .json<{ conflictUserId?: number; provider?: string }>()
    .catch(() => ({}))) as { conflictUserId?: number; provider?: string };
  if (typeof body.conflictUserId !== "number" || typeof body.provider !== "string") {
    return c.json({ error: "conflictUserId and provider are required" }, 400);
  }
  if (!isKnownProvider(body.provider)) {
    return c.json({ error: "Unknown provider" }, 400);
  }

  const { accountMergeUseCases } = createContainer(c.env.DB);
  const existing = await accountMergeUseCases.findPendingMergeChallenge(
    auth.userId,
    body.conflictUserId,
  );
  if (!existing || new Date(existing.expiresAt) <= new Date()) {
    return c.json(
      {
        error: {
          code: "MERGE_CHALLENGE_EXPIRED",
          message:
            "유효한 계정 통합 세션이 없습니다. 로그인 수단 연결을 다시 시도해 새 인증을 진행해주세요.",
        },
      },
      404,
    );
  }

  const validated = CreateMergeChallengeResponseSchema.parse({
    challengeId: existing.id,
    expiresAt: existing.expiresAt,
    conflictUserId: body.conflictUserId,
    provider: body.provider,
  });
  return c.json(validated, 200);
});

// GET /api/auth/merge/preview?challenge=<id> — safe summaries of both candidate accounts
authRouter.get("/merge/preview", async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Unauthenticated" } }, 401);
  }
  if (!c.env?.DB) {
    return c.json({ error: "Database unavailable" }, 500);
  }

  const challengeId = c.req.query("challenge");
  if (!challengeId) {
    return c.json({ error: "challenge query parameter is required" }, 400);
  }

  const { accountMergeUseCases } = createContainer(c.env.DB);
  const challenge = await accountMergeUseCases.findMergeChallenge(challengeId);
  if (!challenge) {
    return c.json(
      { error: { code: "MERGE_CHALLENGE_EXPIRED", message: "유효하지 않은 통합 세션입니다." } },
      404,
    );
  }
  if (auth.userId !== challenge.userA && auth.userId !== challenge.userB) {
    return c.json(
      { error: { code: "MERGE_CHALLENGE_MISMATCH", message: "권한이 없습니다." } },
      403,
    );
  }

  const previews = await accountMergeUseCases.getMergePreviewPair(challengeId);
  if (!previews) {
    return c.json({ error: "Merge preview unavailable" }, 404);
  }

  const validated = MergePreviewPairSchema.parse({
    userA: previews.userA,
    userB: previews.userB,
  });
  return c.json(validated, 200);
});

// POST /api/auth/merge/confirm — perform the Primary-Wins merge atomically
authRouter.post("/merge/confirm", async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Unauthenticated" } }, 401);
  }
  if (!c.env?.DB) {
    return c.json({ error: "Database unavailable" }, 500);
  }

  const body = (await c.req
    .json<{ challengeId?: string; keepUserId?: number }>()
    .catch(() => ({}))) as { challengeId?: string; keepUserId?: number };
  const parsed = ConfirmAccountMergeRequestSchema.safeParse({
    challengeId: body.challengeId,
    keepUserId: body.keepUserId,
  });
  if (!parsed.success) {
    return c.json({ error: "challengeId and keepUserId are required" }, 400);
  }

  const { accountMergeUseCases } = createContainer(c.env.DB);
  const result = await accountMergeUseCases.confirmMerge(
    parsed.data.challengeId,
    parsed.data.keepUserId,
    auth.userId,
  );

  if (!result.ok) {
    const statusMap: Record<string, 400 | 403 | 404 | 409> = {
      MERGE_CHALLENGE_EXPIRED: 400,
      MERGE_CHALLENGE_CONSUMED: 400,
      MERGE_CHALLENGE_MISMATCH: 403,
      USER_NOT_FOUND: 404,
      MERGE_PROVIDER_CONFLICT: 409,
    };
    const messageMap: Record<string, string> = {
      MERGE_CHALLENGE_EXPIRED: "계정 통합 세션이 만료되었습니다. 다시 시도해주세요.",
      MERGE_CHALLENGE_CONSUMED: "이미 처리된 계정 통합 세션입니다.",
      MERGE_CHALLENGE_MISMATCH: "통합 대상 계정이 일치하지 않습니다.",
      USER_NOT_FOUND: "통합 대상 계정을 찾을 수 없습니다.",
      MERGE_PROVIDER_CONFLICT: "두 계정 모두 동일 로그인 수단을 사용 중이라 병합할 수 없습니다.",
    };
    const code = result.code;
    return accountError(
      c,
      code,
      messageMap[code] ?? "계정 통합에 실패했습니다.",
      statusMap[code] ?? 400,
    );
  }

  const validated = ConfirmAccountMergeResponseSchema.parse({
    merged: true,
    primaryId: result.primaryId,
    secondaryId: result.secondaryId,
  });
  return c.json(validated, 200);
});
