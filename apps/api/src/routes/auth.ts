import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createContainer } from "../container.js";
import type { D1Database } from "@cloudflare/workers-types";
import { verifyGoogleToken } from "../infrastructure/oauth/google.js";
import { buildDiscordAuthorizeUrl, exchangeDiscordCode } from "../infrastructure/oauth/discord.js";

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
  return c.json({
    google: {
      configured: Boolean(c.env?.GOOGLE_CLIENT_ID),
    },
    discord: {
      configured: Boolean(c.env?.DISCORD_CLIENT_ID && c.env?.DISCORD_CLIENT_SECRET),
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
