import test from "node:test";
import assert from "node:assert/strict";
import {
  CreatorUseCases,
  type CreatorRepository,
  type CreatorProfile,
  type CreatorPlatformAccount,
  type CreatorRankEntry,
  type CreatorPlatformType,
  type CreatorStatusType,
  type FeaturedStatusType,
  type CreatorChannelInfo,
} from "../src/index.js";

class MemoryCreatorRepo implements CreatorRepository {
  public profiles = new Map<number, CreatorProfile>();
  public platformAccounts: CreatorPlatformAccount[] = [];
  private nextProfileId = 1;
  private nextAccId = 1;

  async findProfileByUserId(
    userId: number,
  ): Promise<(CreatorProfile & { platformAccounts: CreatorPlatformAccount[] }) | null> {
    const prof = Array.from(this.profiles.values()).find((p) => p.userId === userId);
    if (!prof) return null;
    const accs = this.platformAccounts.filter((a) => a.creatorId === prof.id);
    return { ...prof, platformAccounts: accs };
  }

  async findProfileById(
    creatorId: number,
  ): Promise<(CreatorProfile & { platformAccounts: CreatorPlatformAccount[] }) | null> {
    const prof = this.profiles.get(creatorId);
    if (!prof) return null;
    const accs = this.platformAccounts.filter((a) => a.creatorId === creatorId);
    return { ...prof, platformAccounts: accs };
  }

  async findPlatformAccount(
    platform: CreatorPlatformType,
    platformUserId: string,
  ): Promise<CreatorPlatformAccount | null> {
    return (
      this.platformAccounts.find(
        (a) => a.platform === platform && a.platformUserId === platformUserId,
      ) || null
    );
  }

  async findPlatformAccountById(platformAccountId: number): Promise<CreatorPlatformAccount | null> {
    return this.platformAccounts.find((a) => a.id === platformAccountId) || null;
  }

  async updatePlatformAccountMetrics(
    platformAccountId: number,
    input: { audienceCount: number | null; channelCreatedAt: string | null; syncedAt: string },
  ): Promise<CreatorPlatformAccount> {
    const idx = this.platformAccounts.findIndex((a) => a.id === platformAccountId);
    if (idx < 0) throw new Error("platform account not found");
    this.platformAccounts[idx] = {
      ...this.platformAccounts[idx],
      audienceCount: input.audienceCount ?? 0,
      channelCreatedAt: input.channelCreatedAt ?? null,
      metricsSyncedAt: input.syncedAt,
      updatedAt: input.syncedAt,
    };
    return this.platformAccounts[idx];
  }

  async upsertProfile(input: {
    userId: number;
    status: CreatorStatusType;
    featuredStatus?: FeaturedStatusType;
    featuredReason?: string | null;
  }): Promise<CreatorProfile> {
    const now = new Date().toISOString();
    const existing = await this.findProfileByUserId(input.userId);
    if (existing) {
      const updated: CreatorProfile = {
        ...existing,
        status: input.status,
        featuredStatus: input.featuredStatus ?? existing.featuredStatus,
        updatedAt: now,
      };
      this.profiles.set(existing.id, updated);
      return updated;
    }

    const created: CreatorProfile = {
      id: this.nextProfileId++,
      userId: input.userId,
      status: input.status,
      featuredStatus: input.featuredStatus ?? "NONE",
      featuredReason: input.featuredReason ?? null,
      featuredSince: null,
      createdAt: now,
      updatedAt: now,
    };
    this.profiles.set(created.id, created);
    return created;
  }

  async addPlatformAccount(input: {
    creatorId: number;
    platform: CreatorPlatformType;
    platformUserId: string;
    channelName: string;
    channelHandle?: string | null;
    channelUrl: string;
    avatarUrl?: string | null;
    verificationStatus?: string;
  }): Promise<CreatorPlatformAccount> {
    return this.upsertPlatformAccount(input);
  }

  async upsertPlatformAccount(input: {
    creatorId: number;
    platform: CreatorPlatformType;
    platformUserId: string;
    channelName: string;
    channelHandle?: string | null;
    channelUrl: string;
    avatarUrl?: string | null;
    verificationStatus?: string;
    audienceCount?: number;
    channelCreatedAt?: string | null;
  }): Promise<CreatorPlatformAccount> {
    const now = new Date().toISOString();
    const existingIdx = this.platformAccounts.findIndex(
      (a) => a.platform === input.platform && a.platformUserId === input.platformUserId,
    );

    if (existingIdx >= 0) {
      const updated: CreatorPlatformAccount = {
        ...this.platformAccounts[existingIdx],
        creatorId: input.creatorId,
        channelName: input.channelName,
        channelHandle: input.channelHandle ?? null,
        channelUrl: input.channelUrl,
        avatarUrl: input.avatarUrl ?? null,
        verificationStatus: input.verificationStatus ?? "VERIFIED",
        audienceCount: input.audienceCount ?? 0,
        channelCreatedAt: input.channelCreatedAt ?? null,
        metricsSyncedAt: now,
        updatedAt: now,
      };
      this.platformAccounts[existingIdx] = updated;
      return updated;
    }

    const created: CreatorPlatformAccount = {
      id: this.nextAccId++,
      creatorId: input.creatorId,
      platform: input.platform,
      platformUserId: input.platformUserId,
      channelName: input.channelName,
      channelHandle: input.channelHandle ?? null,
      channelUrl: input.channelUrl,
      avatarUrl: input.avatarUrl ?? null,
      verificationStatus: input.verificationStatus ?? "VERIFIED",
      verifiedAt: now,
      audienceCount: input.audienceCount ?? 0,
      channelCreatedAt: input.channelCreatedAt ?? null,
      metricsSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.platformAccounts.push(created);
    return created;
  }

  async getCreatorRankings(): Promise<{ entries: CreatorRankEntry[]; total: number }> {
    return { entries: [], total: 0 };
  }
}

test("verifyChannelOwnership — successfully verifies new channel for user", async () => {
  const repo = new MemoryCreatorRepo();
  const useCases = new CreatorUseCases(repo);

  const info: CreatorChannelInfo = {
    platform: "YOUTUBE",
    platformUserId: "UC1234567890",
    channelName: "Test Gaming",
    channelHandle: "@testgaming",
    channelUrl: "https://youtube.com/@testgaming",
    avatarUrl: "https://avatar.png",
    audienceCount: 25000,
  };

  const res = await useCases.verifyChannelOwnership(101, info);

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.profile.userId, 101);
    assert.equal(res.profile.status, "VERIFIED");
    assert.equal(res.platformAccount.platform, "YOUTUBE");
    assert.equal(res.platformAccount.platformUserId, "UC1234567890");
    assert.equal(res.platformAccount.audienceCount, 25000);
  }
});

test("verifyChannelOwnership — rejects duplicate channel verification across different users", async () => {
  const repo = new MemoryCreatorRepo();
  const useCases = new CreatorUseCases(repo);

  const info: CreatorChannelInfo = {
    platform: "CHZZK",
    platformUserId: "0123456789abcdef0123456789abcdef",
    channelName: "Popular Streamer",
    channelHandle: null,
    channelUrl: "https://chzzk.naver.com/0123456789abcdef0123456789abcdef",
    avatarUrl: null,
  };

  // User 1 verifies channel
  const res1 = await useCases.verifyChannelOwnership(1, info);
  assert.equal(res1.ok, true);

  // User 2 attempts to verify identical CHZZK channel
  const res2 = await useCases.verifyChannelOwnership(2, info);
  assert.equal(res2.ok, false);
  if (!res2.ok) {
    assert.equal(res2.code, "CHANNEL_ALREADY_VERIFIED");
    assert.match(res2.message, /이미 다른 GAMEMOA 크리에이터/);
  }
});

test("verifyChannelOwnership — allows same user to re-verify or update their own channel", async () => {
  const repo = new MemoryCreatorRepo();
  const useCases = new CreatorUseCases(repo);

  const info1: CreatorChannelInfo = {
    platform: "SOOP",
    platformUserId: "soop_pro_gamer",
    channelName: "Old Nickname",
    channelHandle: "@soop_pro_gamer",
    channelUrl: "https://sooplive.co.kr/soop_pro_gamer",
    avatarUrl: null,
  };

  await useCases.verifyChannelOwnership(5, info1);

  const info2: CreatorChannelInfo = {
    ...info1,
    channelName: "New Nickname (Updated)",
  };

  const res2 = await useCases.verifyChannelOwnership(5, info2);
  assert.equal(res2.ok, true);
  if (res2.ok) {
    assert.equal(res2.platformAccount.channelName, "New Nickname (Updated)");
  }
});
