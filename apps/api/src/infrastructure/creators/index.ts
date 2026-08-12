import type { CreatorProviderAdapter, CreatorPlatformType } from "@gamemoa/core";
import { YouTubeCreatorProvider } from "./youtube.js";
import { TwitchCreatorProvider } from "./twitch.js";
import { ChzzkCreatorProvider } from "./chzzk.js";
import { SoopCreatorProvider } from "./soop.js";
import { MockCreatorProvider } from "./mockProvider.js";

export { YouTubeCreatorProvider } from "./youtube.js";
export { TwitchCreatorProvider } from "./twitch.js";
export { ChzzkCreatorProvider } from "./chzzk.js";
export { SoopCreatorProvider } from "./soop.js";
export { MockCreatorProvider } from "./mockProvider.js";

export function getCreatorProviderAdapters(env: {
  YOUTUBE_CLIENT_ID?: string;
  YOUTUBE_CLIENT_SECRET?: string;
  YOUTUBE_API_KEY?: string;
  TWITCH_CLIENT_ID?: string;
  TWITCH_CLIENT_SECRET?: string;
  CHZZK_CLIENT_ID?: string;
  CHZZK_CLIENT_SECRET?: string;
  SOOP_CLIENT_ID?: string;
  SOOP_CLIENT_SECRET?: string;
  USE_MOCK_CREATOR_PROVIDERS?: string;
}): Record<CreatorPlatformType, CreatorProviderAdapter> {
  const useMock = env.USE_MOCK_CREATOR_PROVIDERS === "true";

  if (useMock) {
    return {
      YOUTUBE: new MockCreatorProvider("YOUTUBE", true),
      TWITCH: new MockCreatorProvider("TWITCH", true),
      CHZZK: new MockCreatorProvider("CHZZK", true),
      SOOP: new MockCreatorProvider("SOOP", true),
    };
  }

  return {
    YOUTUBE: new YouTubeCreatorProvider(
      env.YOUTUBE_CLIENT_ID,
      env.YOUTUBE_CLIENT_SECRET,
      env.YOUTUBE_API_KEY,
    ),
    TWITCH: new TwitchCreatorProvider(env.TWITCH_CLIENT_ID, env.TWITCH_CLIENT_SECRET),
    CHZZK: new ChzzkCreatorProvider(env.CHZZK_CLIENT_ID, env.CHZZK_CLIENT_SECRET),
    SOOP: new SoopCreatorProvider(env.SOOP_CLIENT_ID, env.SOOP_CLIENT_SECRET),
  };
}
