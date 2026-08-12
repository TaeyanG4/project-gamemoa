export interface DiscordUserProfile {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
}

export function buildDiscordAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const discordUrl = new URL("https://discord.com/api/oauth2/authorize");
  discordUrl.searchParams.set("client_id", params.clientId);
  discordUrl.searchParams.set("redirect_uri", params.redirectUri);
  discordUrl.searchParams.set("response_type", "code");
  discordUrl.searchParams.set("scope", "identify email");
  discordUrl.searchParams.set("state", params.state);
  return discordUrl.toString();
}

export async function exchangeDiscordCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ valid: boolean; profile?: DiscordUserProfile; reason?: string }> {
  try {
    const tokenParams = new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
    });

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      return { valid: false, reason: "Failed to exchange code for token" };
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return { valid: false, reason: "Invalid token response from Discord" };
    }

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return { valid: false, reason: "Failed to fetch Discord user info" };
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

    return {
      valid: true,
      profile: {
        id: userInfo.id,
        username: userInfo.username,
        email: userInfo.email ?? null,
        avatarUrl,
      },
    };
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : "Discord auth exchange failed",
    };
  }
}
