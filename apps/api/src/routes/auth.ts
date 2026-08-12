import { Hono } from "hono";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createContainer } from "../container.js";
import type { D1Database } from "@cloudflare/workers-types";
import { verifyGoogleToken } from "../infrastructure/oauth/google.js";
import { buildDiscordAuthorizeUrl, exchangeDiscordCode } from "../infrastructure/oauth/discord.js";
import {
  ConnectedProvidersResponseSchema,
  LinkProviderRequestSchema,
  LinkProviderResponseSchema,
  UnlinkProviderResponseSchema,
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
    FRONTEND_URL?: string;
    COMMIT_SHA?: string;
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
  const redirectUri =
    c.env.DISCORD_REDIRECT_URI || `${new URL(c.req.url).origin}/api/auth/discord/callback`;

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

// GET /api/auth/discord/callback
authRouter.get("/discord/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const cookieState = getCookie(c, "discord_oauth_state");

  if (!code || !state || !cookieState || cookieState !== state) {
    deleteCookie(c, "discord_oauth_state", { path: "/" });
    return c.text("Invalid state or missing code", 400);
  }

  deleteCookie(c, "discord_oauth_state", { path: "/" });

  const clientId = c.env.DISCORD_CLIENT_ID;
  const clientSecret = c.env.DISCORD_CLIENT_SECRET;
  const redirectUri =
    c.env.DISCORD_REDIRECT_URI || `${new URL(c.req.url).origin}/api/auth/discord/callback`;
  const frontendUrl = c.env.FRONTEND_URL || `${new URL(c.req.url).origin}`;

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
      return accountError(
        c,
        "ACCOUNT_ALREADY_LINKED",
        "이 Google 계정은 이미 다른 GAMEMOA 계정으로 사용 중입니다.",
        409,
        { conflictUserId: result.conflictUserId },
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

  const redirectUri =
    c.env.DISCORD_REDIRECT_URI || `${new URL(c.req.url).origin}/api/auth/link/discord/callback`;

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

// GET /api/auth/link/discord/callback — Discord OAuth LINK callback
authRouter.get("/link/discord/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const cookieState = getCookie(c, "discord_link_state");
  const frontendUrl = c.env.FRONTEND_URL || `${new URL(c.req.url).origin}`;

  let linkIntent: { state: string; userId: number } | null = null;
  try {
    if (cookieState) {
      const parsed = JSON.parse(cookieState) as { state?: string; userId?: number };
      if (typeof parsed.state === "string" && typeof parsed.userId === "number") {
        linkIntent = { state: parsed.state, userId: parsed.userId };
      }
    }
  } catch {
    linkIntent = null;
  }
  deleteCookie(c, "discord_link_state", { path: "/" });

  if (!code || !state || !linkIntent || linkIntent.state !== state) {
    return c.redirect(`${frontendUrl}/profile?link_status=error`);
  }

  // Re-validate the current authenticated session belongs to the same user
  const auth = await requireAuth(c);
  if (!auth || auth.userId !== linkIntent.userId) {
    return c.redirect(`${frontendUrl}/profile?link_status=error`);
  }

  const clientId = c.env.DISCORD_CLIENT_ID;
  const clientSecret = c.env.DISCORD_CLIENT_SECRET;
  const redirectUri =
    c.env.DISCORD_REDIRECT_URI || `${new URL(c.req.url).origin}/api/auth/link/discord/callback`;

  if (!clientId || !clientSecret) {
    return c.redirect(`${frontendUrl}/profile?link_status=error`);
  }

  const exchangeResult = await exchangeDiscordCode({
    code,
    clientId,
    clientSecret,
    redirectUri,
  });

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
      return c.redirect(`${frontendUrl}/profile?link_status=conflict&provider=discord`);
    }
    return c.redirect(`${frontendUrl}/profile?link_status=already&provider=discord`);
  }

  return c.redirect(`${frontendUrl}/profile?link_status=success&provider=discord`);
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
