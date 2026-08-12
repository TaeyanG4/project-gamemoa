import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { D1UserRepository, D1SessionRepository, type D1Database } from "@gamemoa/db";

export type ApiEnv = {
  Bindings: {
    DB: D1Database;
    GOOGLE_CLIENT_ID?: string;
    DISCORD_CLIENT_ID?: string;
    DISCORD_CLIENT_SECRET?: string;
    DISCORD_REDIRECT_URI?: string;
    FRONTEND_URL?: string;
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

// POST /api/auth/google
authRouter.post("/google", async (c) => {
  try {
    const body = (await c.req.json<{ credential?: string }>().catch(() => ({}))) as { credential?: string };
    const credential = body.credential;


    if (!credential) {
      return c.json({ error: "Credential is required" }, 400);
    }

    // Verify Google ID Token via Google's tokeninfo endpoint
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );

    if (!tokenInfoRes.ok) {
      return c.json({ error: "Invalid Google token" }, 401);
    }

    const payload = (await tokenInfoRes.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
      aud?: string;
    };

    if (!payload.sub) {
      return c.json({ error: "Invalid token payload" }, 401);
    }

    const expectedClientId = c.env.GOOGLE_CLIENT_ID;
    if (expectedClientId && payload.aud !== expectedClientId) {
      return c.json({ error: "Audience mismatch" }, 401);
    }

    const userRepo = new D1UserRepository(c.env.DB);
    const sessionRepo = new D1SessionRepository(c.env.DB);

    const user = await userRepo.findOrCreateUser({
      provider: "google",
      providerUserId: payload.sub,
      email: payload.email ?? null,
      nickname: payload.name || "Google User",
      avatarUrl: payload.picture ?? null,
    });

    const session = await sessionRepo.createSession(user.id);
    const secure = !isLocalhost(c.req.url);

    setCookie(c, "gamemoa_session", session.id, {
      httpOnly: true,
      secure,
      sameSite: "Lax",
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
  const redirectUri = c.env.DISCORD_REDIRECT_URI || `${new URL(c.req.url).origin}/api/auth/discord/callback`;

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

  const discordUrl = new URL("https://discord.com/api/oauth2/authorize");
  discordUrl.searchParams.set("client_id", clientId);
  discordUrl.searchParams.set("redirect_uri", redirectUri);
  discordUrl.searchParams.set("response_type", "code");
  discordUrl.searchParams.set("scope", "identify email");
  discordUrl.searchParams.set("state", state);

  return c.redirect(discordUrl.toString());
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
  const redirectUri = c.env.DISCORD_REDIRECT_URI || `${new URL(c.req.url).origin}/api/auth/discord/callback`;
  const frontendUrl = c.env.FRONTEND_URL || `${new URL(c.req.url).origin}`;

  if (!clientId || !clientSecret) {
    return c.text("Discord client secret not configured", 500);
  }

  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    return c.text("Failed to exchange code for token", 400);
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    return c.text("Invalid token response from Discord", 400);
  }

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    return c.text("Failed to fetch Discord user info", 400);
  }

  const userInfo = (await userRes.json()) as {
    id: string;
    username: string;
    email?: string;
    avatar?: string;
  };

  const avatarUrl = userInfo.avatar
    ? `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png`
    : null;

  const userRepo = new D1UserRepository(c.env.DB);
  const sessionRepo = new D1SessionRepository(c.env.DB);

  const user = await userRepo.findOrCreateUser({
    provider: "discord",
    providerUserId: userInfo.id,
    email: userInfo.email ?? null,
    nickname: userInfo.username,
    avatarUrl,
  });

  const session = await sessionRepo.createSession(user.id);
  const secure = !isLocalhost(c.req.url);

  setCookie(c, "gamemoa_session", session.id, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
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
    const sessionRepo = new D1SessionRepository(c.env.DB);
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
      const sessionRepo = new D1SessionRepository(c.env.DB);
      await sessionRepo.deleteSession(sessionId);
    } catch {
      // Ignore DB error during logout
    }
  }

  deleteCookie(c, "gamemoa_session", { path: "/" });
  return c.json({ success: true });
});
