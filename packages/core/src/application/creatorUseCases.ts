import { GAME_MANIFEST_MAP } from "../registry/gameRegistry.generated.js";
import { levelForTotalXp } from "../domain/progression.js";
import type {
  CreatorRepository,
  CreatorRankEntry,
  CreatorPlatformType,
  CreatorProfile,
  CreatorPlatformAccount,
} from "../ports/repositories.js";
import type { CreatorChannelInfo } from "../ports/creatorProvider.js";

export class CreatorUseCases {
  constructor(private creatorRepo: CreatorRepository) {}

  async getCreatorRankings(options: {
    mode: "score" | "xp";
    gameId?: string;
    platform?: CreatorPlatformType;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: CreatorRankEntry[]; total: number }> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const offset = Math.max(options.offset ?? 0, 0);

    const selectedGameId = options.gameId && options.gameId !== "all" ? options.gameId : undefined;
    const manifest = selectedGameId ? GAME_MANIFEST_MAP[selectedGameId] : undefined;
    const direction = manifest?.scoreConfig?.direction ?? "desc";

    const queryOpts: {
      mode: "score" | "xp";
      gameId?: string;
      direction?: "asc" | "desc";
      platform?: CreatorPlatformType;
      limit?: number;
      offset?: number;
    } = {
      mode: options.mode,
      direction,
      limit,
      offset,
    };
    if (selectedGameId !== undefined) queryOpts.gameId = selectedGameId;
    if (options.platform !== undefined) queryOpts.platform = options.platform;

    const res = await this.creatorRepo.getCreatorRankings(queryOpts);

    const entries: CreatorRankEntry[] = res.entries.map((entry) => {
      if (options.mode === "score" && entry.gameId && entry.score !== undefined) {
        const gManifest = GAME_MANIFEST_MAP[entry.gameId];
        const formattedScore = gManifest?.scoreConfig
          ? `${entry.score.toLocaleString()} ${gManifest.scoreConfig.unit}`
          : String(entry.score);
        return {
          ...entry,
          formattedScore,
          gameTitle: gManifest ? gManifest.title : entry.gameId,
        };
      } else if (options.mode === "xp" && entry.totalXp !== undefined) {
        const level = levelForTotalXp(entry.totalXp);
        return {
          ...entry,
          level,
        };
      }
      return entry;
    });

    return { entries, total: res.total };
  }

  async getCreatorProfileByUserId(
    userId: number,
  ): Promise<(CreatorProfile & { platformAccounts: CreatorPlatformAccount[] }) | null> {
    return this.creatorRepo.findProfileByUserId(userId);
  }

  async verifyChannelOwnership(
    userId: number,
    channelInfo: CreatorChannelInfo,
  ): Promise<
    | {
        ok: true;
        profile: CreatorProfile;
        platformAccount: CreatorPlatformAccount;
      }
    | {
        ok: false;
        code: string;
        message: string;
      }
  > {
    // 1. Single-owner invariant: Check if another GAMEMOA user has ALREADY verified this identical platform + platformUserId channel
    const existingPlatformAcc = await this.creatorRepo.findPlatformAccount(
      channelInfo.platform,
      channelInfo.platformUserId,
    );

    if (existingPlatformAcc && existingPlatformAcc.verificationStatus === "VERIFIED") {
      const existingProfile = await this.creatorRepo.findProfileById(existingPlatformAcc.creatorId);
      if (existingProfile && existingProfile.userId !== userId) {
        return {
          ok: false,
          code: "CHANNEL_ALREADY_VERIFIED",
          message: "이 채널은 이미 다른 GAMEMOA 크리에이터 계정에 연동되어 있습니다.",
        };
      }
    }

    // 2. Ensure Creator profile exists / is updated for this user (status: 'VERIFIED')
    const profile = await this.creatorRepo.upsertProfile({
      userId,
      status: "VERIFIED",
    });

    // 3. Upsert platform account for this creator with canonical ID
    const platformAccount = await this.creatorRepo.upsertPlatformAccount({
      creatorId: profile.id,
      platform: channelInfo.platform,
      platformUserId: channelInfo.platformUserId,
      channelName: channelInfo.channelName,
      channelHandle: channelInfo.channelHandle,
      channelUrl: channelInfo.channelUrl,
      avatarUrl: channelInfo.avatarUrl,
      verificationStatus: "VERIFIED",
      audienceCount: channelInfo.audienceCount ?? 0,
      channelCreatedAt: channelInfo.channelCreatedAt ?? null,
    });

    return {
      ok: true,
      profile,
      platformAccount,
    };
  }
}
