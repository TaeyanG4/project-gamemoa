import type { CreatorPlatformType } from "./repositories.js";

export interface CreatorChannelInfo {
  platform: CreatorPlatformType;
  platformUserId: string; // Canonical Identity: YouTube UC..., Twitch ID, CHZZK 32-char Hash, SOOP User ID
  channelName: string;
  channelHandle: string | null;
  channelUrl: string;
  avatarUrl: string | null;
  audienceCount?: number;
  channelCreatedAt?: string;
}

export interface CreatorProviderAdapter {
  platform: CreatorPlatformType;
  isConfigured(): boolean;
  getAuthorizeUrl(state: string, redirectUri: string): string;
  verifyOwnershipCode(code: string, redirectUri: string): Promise<CreatorChannelInfo>;
}
