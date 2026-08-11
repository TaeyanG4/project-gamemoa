export const OAUTH_CONFIG = {
  google: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    scope: "openid profile email",
  },
  discord: {
    authorizationUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    userInfoUrl: "https://discord.com/api/users/@me",
    scope: "identify email",
  },
};

export function getRedirectUri(provider: "google" | "discord"): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  return `${origin}/api/auth/callback/${provider}`;
}

export function getGoogleOAuthUrl(clientId: string): string {
  const redirectUri = getRedirectUri("google");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: OAUTH_CONFIG.google.scope,
    prompt: "select_account",
  });
  return `${OAUTH_CONFIG.google.authorizationUrl}?${params.toString()}`;
}

export function getDiscordOAuthUrl(clientId: string): string {
  const redirectUri = getRedirectUri("discord");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: OAUTH_CONFIG.discord.scope,
    prompt: "consent",
  });
  return `${OAUTH_CONFIG.discord.authorizationUrl}?${params.toString()}`;
}
