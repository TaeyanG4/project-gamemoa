import type { CreatorProviderAdapter, CreatorChannelInfo } from "@gamemoa/core";

export class YouTubeCreatorProvider implements CreatorProviderAdapter {
  public platform = "YOUTUBE" as const;

  constructor(
    private clientId?: string,
    private clientSecret?: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  getAuthorizeUrl(state: string, redirectUri: string): string {
    if (!this.clientId) throw new Error("YOUTUBE_CLIENT_ID not configured");
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/youtube.readonly",
      access_type: "online",
      state,
      prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async verifyOwnershipCode(code: string, redirectUri: string): Promise<CreatorChannelInfo> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("YouTube OAuth credentials not configured");
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`YouTube token exchange failed: ${tokenRes.status} ${errText}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error("No access token returned from YouTube");
    }

    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!channelRes.ok) {
      const errText = await channelRes.text();
      throw new Error(`YouTube channels API call failed: ${channelRes.status} ${errText}`);
    }

    const channelData = (await channelRes.json()) as {
      items?: Array<{
        id: string;
        snippet?: {
          title?: string;
          customUrl?: string;
          thumbnails?: { default?: { url?: string } };
          publishedAt?: string;
        };
        statistics?: {
          subscriberCount?: string;
        };
      }>;
    };

    const items = channelData.items || [];
    const item = items[0];
    if (!item || !item.id) {
      throw new Error("No YouTube channel found for this account");
    }

    const channelId = item.id;
    const title = item.snippet?.title || "YouTube Channel";
    const customUrl = item.snippet?.customUrl || null;
    const avatarUrl = item.snippet?.thumbnails?.default?.url || null;
    const subCount = item.statistics?.subscriberCount ? Number(item.statistics.subscriberCount) : 0;

    const result: CreatorChannelInfo = {
      platform: "YOUTUBE",
      platformUserId: channelId,
      channelName: title,
      channelHandle: customUrl,
      channelUrl: customUrl
        ? `https://www.youtube.com/${customUrl}`
        : `https://www.youtube.com/channel/${channelId}`,
      avatarUrl,
      audienceCount: subCount,
    };

    if (item.snippet?.publishedAt) {
      result.channelCreatedAt = item.snippet.publishedAt;
    }

    return result;
  }
}
