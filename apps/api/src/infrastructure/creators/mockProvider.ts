import type {
  CreatorProviderAdapter,
  CreatorChannelInfo,
  CreatorPlatformType,
} from "@gamemoa/core";

export class MockCreatorProvider implements CreatorProviderAdapter {
  constructor(
    public platform: CreatorPlatformType,
    private configured = true,
    private mockResult?: CreatorChannelInfo,
    private mockError?: string,
  ) {}

  isConfigured(): boolean {
    return this.configured;
  }

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams();
    params.set("state", state);
    params.set("redirect_uri", redirectUri);
    params.set("platform", this.platform);
    return `https://mock.gamemoa.dev/auth/${this.platform}?${params.toString()}`;
  }

  async verifyOwnershipCode(code: string, _redirectUri: string): Promise<CreatorChannelInfo> {
    if (this.mockError) {
      throw new Error(this.mockError);
    }
    if (this.mockResult) {
      return this.mockResult;
    }
    if (code === "invalid_code") {
      throw new Error("Invalid authorization code");
    }

    return {
      platform: this.platform,
      platformUserId: `mock_${this.platform.toLowerCase()}_${code}`,
      channelName: `Mock ${this.platform} Channel (${code})`,
      channelHandle: `@mock_${code}`,
      channelUrl: `https://${this.platform.toLowerCase()}.com/mock_${code}`,
      avatarUrl: `https://mock.gamemoa.dev/avatars/${code}.png`,
      audienceCount: 15000,
      channelCreatedAt: "2023-01-01T00:00:00Z",
    };
  }
}
