import type { CreatorProviderAdapter, CreatorChannelInfo } from "@gamemoa/core";

export class ChzzkCreatorProvider implements CreatorProviderAdapter {
  public platform = "CHZZK" as const;

  constructor(
    private clientId?: string,
    private clientSecret?: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  getAuthorizeUrl(state: string, redirectUri: string): string {
    if (!this.clientId) throw new Error("CHZZK_CLIENT_ID not configured");
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });
    return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
  }

  async verifyOwnershipCode(code: string, redirectUri: string): Promise<CreatorChannelInfo> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("CHZZK OAuth credentials not configured");
    }

    const tokenRes = await fetch("https://nid.naver.com/oauth2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        state: "chzzk",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`CHZZK token exchange failed: ${tokenRes.status} ${errText}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error("No access token returned from CHZZK");
    }

    const channelRes = await fetch("https://openapi.chzzk.naver.com/open/v1/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!channelRes.ok) {
      const errText = await channelRes.text();
      throw new Error(`CHZZK API call failed: ${channelRes.status} ${errText}`);
    }

    const channelData = (await channelRes.json()) as {
      content?: {
        channelId?: string;
        channelName?: string;
        channelImageUrl?: string;
        followerCount?: number;
      };
    };

    const content = channelData.content;
    if (!content || !content.channelId) {
      throw new Error("No CHZZK channel profile found for this account");
    }

    const channelId = content.channelId;

    return {
      platform: "CHZZK",
      platformUserId: channelId,
      channelName: content.channelName || "CHZZK Channel",
      channelHandle: null,
      channelUrl: `https://chzzk.naver.com/${channelId}`,
      avatarUrl: content.channelImageUrl || null,
      audienceCount: content.followerCount || 0,
    };
  }
}
