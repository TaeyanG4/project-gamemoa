import type { CreatorProviderAdapter, CreatorChannelInfo } from "@gamemoa/core";

export class TwitchCreatorProvider implements CreatorProviderAdapter {
  public platform = "TWITCH" as const;

  constructor(
    private clientId?: string,
    private clientSecret?: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  getAuthorizeUrl(state: string, redirectUri: string): string {
    if (!this.clientId) throw new Error("TWITCH_CLIENT_ID not configured");
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "user:read:email",
      state,
    });
    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
  }

  async verifyOwnershipCode(code: string, redirectUri: string): Promise<CreatorChannelInfo> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("Twitch OAuth credentials not configured");
    }

    const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Twitch token exchange failed: ${tokenRes.status} ${errText}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error("No access token returned from Twitch");
    }

    const userRes = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": this.clientId,
      },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      throw new Error(`Twitch Helix API call failed: ${userRes.status} ${errText}`);
    }

    const userData = (await userRes.json()) as {
      data?: Array<{
        id: string;
        login: string;
        display_name: string;
        profile_image_url?: string;
        created_at?: string;
      }>;
    };

    const users = userData.data || [];
    const user = users[0];
    if (!user || !user.id) {
      throw new Error("No Twitch user profile found");
    }

    const canonicalId = user.id;

    const result: CreatorChannelInfo = {
      platform: "TWITCH",
      platformUserId: canonicalId,
      channelName: user.display_name,
      channelHandle: `@${user.login}`,
      channelUrl: `https://www.twitch.tv/${user.login}`,
      avatarUrl: user.profile_image_url || null,
    };

    if (user.created_at) {
      result.channelCreatedAt = user.created_at;
    }

    return result;
  }
}
