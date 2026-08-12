import type { CreatorProviderAdapter, CreatorChannelInfo } from "@gamemoa/core";

export class SoopCreatorProvider implements CreatorProviderAdapter {
  public platform = "SOOP" as const;

  constructor(
    private clientId?: string,
    private clientSecret?: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  getAuthorizeUrl(state: string, redirectUri: string): string {
    if (!this.clientId) throw new Error("SOOP_CLIENT_ID not configured");
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });
    return `https://openapi.sooplive.co.kr/auth/authorize?${params.toString()}`;
  }

  async verifyOwnershipCode(code: string, redirectUri: string): Promise<CreatorChannelInfo> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("SOOP OAuth credentials not configured");
    }

    const tokenRes = await fetch("https://openapi.sooplive.co.kr/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`SOOP token exchange failed: ${tokenRes.status} ${errText}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error("No access token returned from SOOP");
    }

    const userRes = await fetch("https://openapi.sooplive.co.kr/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      throw new Error(`SOOP API call failed: ${userRes.status} ${errText}`);
    }

    const userData = (await userRes.json()) as {
      user_id?: string;
      user_nick?: string;
      profile_image?: string;
      fan_count?: number;
    };

    if (!userData.user_id) {
      throw new Error("No SOOP channel profile found for this account");
    }

    const userId = userData.user_id;

    return {
      platform: "SOOP",
      platformUserId: userId,
      channelName: userData.user_nick || userId,
      channelHandle: `@${userId}`,
      channelUrl: `https://www.sooplive.co.kr/${userId}`,
      avatarUrl: userData.profile_image || null,
      audienceCount: userData.fan_count || 0,
    };
  }
}
