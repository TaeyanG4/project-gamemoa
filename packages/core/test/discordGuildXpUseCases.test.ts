import test from "node:test";
import assert from "node:assert/strict";
import {
  DiscordGuildXpUseCases,
  ProgressionUseCases,
  type DiscordGuildRepository,
  type UserRepository,
  type ProgressionRepository,
  type DiscordGuild,
  type DiscordPlayContext,
  type DiscordGuildXpEvent,
  type User,
  type OAuthAccount,
  type RecordCompletionOutcome,
  type UserProgress,
  type XpLeaderboardEntry,
} from "../src/index.js";

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

class MockDiscordGuildRepo implements DiscordGuildRepository {
  public guilds: Map<string, DiscordGuild> = new Map();
  public playContexts: Map<string, DiscordPlayContext> = new Map();
  public guildXpEvents: DiscordGuildXpEvent[] = [];
  public managers: Map<string, Set<number>> = new Map();
  private nextXpEventId = 1;

  async createPlayContext(input: {
    guildId: string;
    discordUserId: string;
    userId: number;
    gameId?: string | null;
    ttlSeconds?: number;
  }): Promise<{ token: string; expiresAt: string }> {
    const token = "mock_raw_play_token_" + Math.random().toString(36).substring(2);
    const tokenHash = await hashToken(token);
    const ttl = input.ttlSeconds ?? 900;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const ctx: DiscordPlayContext = {
      tokenHash,
      guildId: input.guildId,
      discordUserId: input.discordUserId,
      userId: input.userId,
      gameId: input.gameId ?? null,
      createdAt: new Date().toISOString(),
      expiresAt,
      consumedAt: null,
    };
    this.playContexts.set(tokenHash, ctx);
    return { token, expiresAt };
  }

  async findPlayContextByToken(token: string): Promise<DiscordPlayContext | null> {
    const tokenHash = await hashToken(token);
    return this.playContexts.get(tokenHash) ?? null;
  }

  async consumePlayContextByToken(token: string): Promise<void> {
    const tokenHash = await hashToken(token);
    const ctx = this.playContexts.get(tokenHash);
    if (ctx) {
      ctx.consumedAt = new Date().toISOString();
    }
  }

  async attributeGuildXp(input: {
    guildId: string;
    userId: number;
    sourceXpEventId: number;
    amount: number;
  }): Promise<DiscordGuildXpEvent | null> {
    const existing = this.guildXpEvents.find((e) => e.sourceXpEventId === input.sourceXpEventId);
    if (existing) {
      return existing;
    }

    const evt: DiscordGuildXpEvent = {
      id: this.nextXpEventId++,
      guildId: input.guildId,
      userId: input.userId,
      sourceXpEventId: input.sourceXpEventId,
      amount: input.amount,
      createdAt: new Date().toISOString(),
    };
    this.guildXpEvents.push(evt);
    return evt;
  }

  async getGuildUserXp(guildId: string, userId: number): Promise<number> {
    return this.guildXpEvents
      .filter((e) => e.guildId === guildId && e.userId === userId)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  async getGuildTotalXp(guildId: string): Promise<number> {
    return this.guildXpEvents
      .filter((e) => e.guildId === guildId)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  async findByGuildId(guildId: string): Promise<DiscordGuild | null> {
    return this.guilds.get(guildId) ?? null;
  }

  async findBySlug(slug: string): Promise<DiscordGuild | null> {
    for (const g of this.guilds.values()) {
      if (g.slug === slug) return g;
    }
    return null;
  }

  async createRegistrationChallenge(): Promise<{ token: string; expiresAt: string }> {
    throw new Error("Not implemented in mock");
  }
  async findRegistrationChallengeByToken(): Promise<null> {
    return null;
  }
  async consumeRegistrationChallengeByToken(): Promise<void> {}
  async registerGuild(input: any): Promise<DiscordGuild> {
    const g: DiscordGuild = {
      guild_id: input.guildId,
      slug: input.slug,
      name: input.name,
      icon_url: input.iconUrl ?? null,
      description: input.description ?? null,
      visibility: input.visibility,
      registration_status: "ACTIVE",
      registered_by_user_id: input.userId,
      registered_at: new Date().toISOString(),
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.guilds.set(input.guildId, g);
    return g;
  }
  async updateGuild(): Promise<DiscordGuild> {
    throw new Error("Not implemented in mock");
  }
  async searchPublicGuilds(): Promise<{ guilds: DiscordGuild[]; total: number }> {
    return { guilds: Array.from(this.guilds.values()), total: this.guilds.size };
  }
  async isGuildManager(guildId: string, userId: number): Promise<boolean> {
    return this.managers.get(guildId)?.has(userId) ?? false;
  }
  async addGuildManager(guildId: string, userId: number): Promise<void> {
    if (!this.managers.has(guildId)) this.managers.set(guildId, new Set());
    this.managers.get(guildId)!.add(userId);
  }
  async getUserManagedGuilds(): Promise<DiscordGuild[]> {
    return [];
  }
}

class MockUserRepo implements UserRepository {
  public users: Map<number, User> = new Map();
  public oauthAccounts: OAuthAccount[] = [];

  async findOAuthAccount(provider: string, providerUserId: string): Promise<OAuthAccount | null> {
    return (
      this.oauthAccounts.find(
        (a) => a.provider === provider && a.provider_user_id === providerUserId,
      ) ?? null
    );
  }

  async findByOAuth(provider: string, providerUserId: string): Promise<User | null> {
    const acc = await this.findOAuthAccount(provider, providerUserId);
    if (!acc) return null;
    return this.users.get(acc.user_id) ?? null;
  }

  async findById(id: number): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async createUser(data: { nickname: string; avatarUrl?: string | null }): Promise<User> {
    const user: User = {
      id: this.users.size + 1,
      nickname: data.nickname,
      avatar_url: data.avatarUrl ?? null,
      country: null,
      nickname_updated_at: null,
      country_updated_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async linkOAuthAccount(input: {
    userId: number;
    provider: string;
    providerUserId: string;
  }): Promise<void> {
    this.oauthAccounts.push({
      user_id: input.userId,
      provider: input.provider,
      provider_user_id: input.providerUserId,
      created_at: new Date().toISOString(),
    });
  }

  async getOAuthAccounts(): Promise<OAuthAccount[]> {
    return this.oauthAccounts;
  }
  async unlinkOAuthAccount(): Promise<void> {}
  async updateNickname(): Promise<User> {
    throw new Error("Not implemented");
  }
  async updateCountry(): Promise<User> {
    throw new Error("Not implemented");
  }
}

class MockProgressionRepo implements ProgressionRepository {
  public xpEvents: {
    id: number;
    userId: number;
    amount: number;
    sourceId: string;
    gameId: string;
  }[] = [];
  public userProgress: Map<number, { totalXp: number; completions: number }> = new Map();
  private nextEventId = 100;

  async recordGameCompletion(input: {
    userId: number;
    gameId: string;
    sourceType: string;
    sourceId: string;
    xpPerCompletion: number;
    dailyCapPerGame: number;
  }): Promise<RecordCompletionOutcome> {
    const existing = this.xpEvents.find((e) => e.sourceId === input.sourceId);
    if (existing) {
      const cur = this.userProgress.get(input.userId) ?? { totalXp: 0, completions: 0 };
      return {
        duplicate: true,
        xpAwarded: 0,
        totalXp: cur.totalXp,
        eligibleCompletions: cur.completions,
        xpEventId: existing.id,
      };
    }

    const todayCount = this.xpEvents.filter(
      (e) => e.userId === input.userId && e.gameId === input.gameId && e.amount > 0,
    ).length;

    const underCap = todayCount < input.dailyCapPerGame;
    const amount = underCap ? input.xpPerCompletion : 0;
    const id = this.nextEventId++;

    this.xpEvents.push({
      id,
      userId: input.userId,
      amount,
      sourceId: input.sourceId,
      gameId: input.gameId,
    });

    const cur = this.userProgress.get(input.userId) ?? { totalXp: 0, completions: 0 };
    const newTotal = cur.totalXp + amount;
    const newCompletions = cur.completions + 1;
    this.userProgress.set(input.userId, { totalXp: newTotal, completions: newCompletions });

    return {
      duplicate: false,
      xpAwarded: amount,
      totalXp: newTotal,
      eligibleCompletions: newCompletions,
      xpEventId: id,
    };
  }

  async getUserProgress(userId: number): Promise<UserProgress | null> {
    const p = this.userProgress.get(userId);
    if (!p) return null;
    return {
      user_id: userId,
      total_xp: p.totalXp,
      eligible_completions: p.completions,
      updated_at: new Date().toISOString(),
    };
  }

  async getXpLeaderboard(): Promise<XpLeaderboardEntry[]> {
    return [];
  }
  async getGlobalXpRank(): Promise<number | null> {
    return 1;
  }
}

// ---------------------------------------------------------------------------
// TEST SUITES
// ---------------------------------------------------------------------------

test("Phase H1 Invariants & Play Context Tests", async (t) => {
  let guildRepo: MockDiscordGuildRepo;
  let userRepo: MockUserRepo;
  let progressionRepo: MockProgressionRepo;
  let guildXpUseCases: DiscordGuildXpUseCases;
  let progressionUseCases: ProgressionUseCases;

  t.beforeEach(async () => {
    guildRepo = new MockDiscordGuildRepo();
    userRepo = new MockUserRepo();
    progressionRepo = new MockProgressionRepo();

    guildXpUseCases = new DiscordGuildXpUseCases(guildRepo, userRepo);
    progressionUseCases = new ProgressionUseCases(progressionRepo);

    // Setup active Guild A & Guild B
    await guildRepo.registerGuild({
      guildId: "guild_A",
      slug: "guild-a",
      name: "Guild Alpha",
      visibility: "PUBLIC",
      userId: 1,
    });
    await guildRepo.registerGuild({
      guildId: "guild_B",
      slug: "guild-b",
      name: "Guild Beta",
      visibility: "PUBLIC",
      userId: 1,
    });

    // Create GAMEMOA user 1 linked to discord_user_1
    const user1 = await userRepo.createUser({ nickname: "PlayerOne" });
    await userRepo.linkOAuthAccount({
      userId: user1.id,
      provider: "discord",
      providerUserId: "discord_user_1",
    });

    // Give user 1 high global XP (e.g. 25,000)
    progressionRepo.userProgress.set(user1.id, { totalXp: 25000, completions: 2500 });
  });

  await t.test("1. User with 25,000 global XP joining Guild A has Guild A XP = 0", async () => {
    const guildAXp = await guildXpUseCases.getGuildUserXp("guild_A", 1);
    const guildATotal = await guildXpUseCases.getGuildTotalXp("guild_A");
    assert.equal(guildAXp, 0);
    assert.equal(guildATotal, 0);
  });

  await t.test(
    "2 & 3. Valid Guild A context + accepted +10 global XP => global +10, Guild A +10, Guild B remains 0",
    async () => {
      // Issue play context for Guild A
      const ctx = await guildXpUseCases.createPlayContextFromInteraction({
        guildId: "guild_A",
        discordUserId: "discord_user_1",
        gameId: "reaction-time",
      });

      // Complete game
      const completion = await progressionUseCases.recordAcceptedGameCompletion({
        userId: 1,
        gameId: "reaction-time",
        sourceId: "score_101",
      });

      assert.equal(completion.xpAwarded, 10);
      assert.ok(completion.xpEventId);

      // Attribute to Guild A
      const attr = await guildXpUseCases.attributeCompletionToGuild({
        userId: 1,
        gameId: "reaction-time",
        sourceXpEventId: completion.xpEventId!,
        xpAmount: completion.xpAwarded,
        playToken: ctx.token,
      });

      assert.equal(attr.attributed, true);
      assert.equal(attr.guildId, "guild_A");
      assert.equal(attr.amount, 10);

      // Check XP totals
      const guildAXp = await guildXpUseCases.getGuildUserXp("guild_A", 1);
      const guildBXp = await guildXpUseCases.getGuildUserXp("guild_B", 1);
      assert.equal(guildAXp, 10);
      assert.equal(guildBXp, 0);
    },
  );

  await t.test("4. Same source replay => no duplicate global or guild XP", async () => {
    const ctx = await guildXpUseCases.createPlayContextFromInteraction({
      guildId: "guild_A",
      discordUserId: "discord_user_1",
    });

    const completion1 = await progressionUseCases.recordAcceptedGameCompletion({
      userId: 1,
      gameId: "aim-test",
      sourceId: "score_102",
    });
    assert.equal(completion1.duplicate, false);
    assert.equal(completion1.xpAwarded, 10);

    const attr1 = await guildXpUseCases.attributeCompletionToGuild({
      userId: 1,
      gameId: "aim-test",
      sourceXpEventId: completion1.xpEventId!,
      xpAmount: completion1.xpAwarded,
      playToken: ctx.token,
    });
    assert.equal(attr1.attributed, true);

    // Replay same score_102
    const completion2 = await progressionUseCases.recordAcceptedGameCompletion({
      userId: 1,
      gameId: "aim-test",
      sourceId: "score_102",
    });
    assert.equal(completion2.duplicate, true);
    assert.equal(completion2.xpAwarded, 0);

    const guildAXp = await guildXpUseCases.getGuildUserXp("guild_A", 1);
    assert.equal(guildAXp, 10);
  });

  await t.test(
    "5. Same source with second guild context => cannot credit second guild",
    async () => {
      const ctxA = await guildXpUseCases.createPlayContextFromInteraction({
        guildId: "guild_A",
        discordUserId: "discord_user_1",
      });
      const ctxB = await guildXpUseCases.createPlayContextFromInteraction({
        guildId: "guild_B",
        discordUserId: "discord_user_1",
      });

      const completion = await progressionUseCases.recordAcceptedGameCompletion({
        userId: 1,
        gameId: "memory-test",
        sourceId: "score_103",
      });

      // First credit to Guild A succeeds
      const attrA = await guildXpUseCases.attributeCompletionToGuild({
        userId: 1,
        gameId: "memory-test",
        sourceXpEventId: completion.xpEventId!,
        xpAmount: completion.xpAwarded,
        playToken: ctxA.token,
      });
      assert.equal(attrA.attributed, true);

      // Attempt second credit to Guild B with same source_xp_event_id fails (unique constraint)
      const attrB = await guildXpUseCases.attributeCompletionToGuild({
        userId: 1,
        gameId: "memory-test",
        sourceXpEventId: completion.xpEventId!,
        xpAmount: completion.xpAwarded,
        playToken: ctxB.token,
      });
      // Already credited once, attribute returns existing or ignored
      const guildBXp = await guildXpUseCases.getGuildUserXp("guild_B", 1);
      assert.equal(guildBXp, 0);
    },
  );

  await t.test("6. Forged guild_id impossible / ignored (server controls context)", async () => {
    const ctx = await guildXpUseCases.createPlayContextFromInteraction({
      guildId: "guild_A",
      discordUserId: "discord_user_1",
    });

    const completion = await progressionUseCases.recordAcceptedGameCompletion({
      userId: 1,
      gameId: "typing-test",
      sourceId: "score_104",
    });

    const attr = await guildXpUseCases.attributeCompletionToGuild({
      userId: 1,
      gameId: "typing-test",
      sourceXpEventId: completion.xpEventId!,
      xpAmount: completion.xpAwarded,
      playToken: ctx.token,
    });

    // Attributed strictly to guild_A bound in server-side context
    assert.equal(attr.guildId, "guild_A");
  });

  await t.test("7. Expired play context => no guild credit", async () => {
    // Create token with 0 second TTL
    const playCtx = await guildRepo.createPlayContext({
      guildId: "guild_A",
      discordUserId: "discord_user_1",
      userId: 1,
      ttlSeconds: -10, // already expired
    });

    const completion = await progressionUseCases.recordAcceptedGameCompletion({
      userId: 1,
      gameId: "aim-test",
      sourceId: "score_105",
    });

    const attr = await guildXpUseCases.attributeCompletionToGuild({
      userId: 1,
      gameId: "aim-test",
      sourceXpEventId: completion.xpEventId!,
      xpAmount: completion.xpAwarded,
      playToken: playCtx.token,
    });

    assert.equal(attr.attributed, false);
    assert.equal(attr.reason, "EXPIRED_TOKEN");
    const guildAXp = await guildXpUseCases.getGuildUserXp("guild_A", 1);
    assert.equal(guildAXp, 0);
  });

  await t.test("8. Wrong user context => rejected", async () => {
    const ctx = await guildXpUseCases.createPlayContextFromInteraction({
      guildId: "guild_A",
      discordUserId: "discord_user_1",
    });

    const completion = await progressionUseCases.recordAcceptedGameCompletion({
      userId: 2, // Different user
      gameId: "aim-test",
      sourceId: "score_106",
    });

    const attr = await guildXpUseCases.attributeCompletionToGuild({
      userId: 2, // Submitting as user 2 with user 1's token
      gameId: "aim-test",
      sourceXpEventId: completion.xpEventId!,
      xpAmount: completion.xpAwarded,
      playToken: ctx.token,
    });

    assert.equal(attr.attributed, false);
    assert.equal(attr.reason, "USER_MISMATCH");
  });

  await t.test("9. Wrong game context => rejected if game-bound", async () => {
    const ctx = await guildXpUseCases.createPlayContextFromInteraction({
      guildId: "guild_A",
      discordUserId: "discord_user_1",
      gameId: "aim-test",
    });

    const completion = await progressionUseCases.recordAcceptedGameCompletion({
      userId: 1,
      gameId: "reaction-time", // Playing different game
      sourceId: "score_107",
    });

    const attr = await guildXpUseCases.attributeCompletionToGuild({
      userId: 1,
      gameId: "reaction-time",
      sourceXpEventId: completion.xpEventId!,
      xpAmount: completion.xpAwarded,
      playToken: ctx.token,
    });

    assert.equal(attr.attributed, false);
    assert.equal(attr.reason, "GAME_MISMATCH");
  });

  await t.test("10. Unregistered/disabled guild => /gamemoa play denied", async () => {
    await assert.rejects(
      async () => {
        await guildXpUseCases.createPlayContextFromInteraction({
          guildId: "unregistered_guild_999",
          discordUserId: "discord_user_1",
        });
      },
      (err: Error) => err.message.includes("등록되지 않았거나"),
    );
  });

  await t.test("11. Global daily XP cap returns 0 => guild total does not increase", async () => {
    const ctx = await guildXpUseCases.createPlayContextFromInteraction({
      guildId: "guild_A",
      discordUserId: "discord_user_1",
    });

    // Simulate 10 completions for reaction-time already recorded today
    for (let i = 0; i < 10; i++) {
      await progressionRepo.recordGameCompletion({
        userId: 1,
        gameId: "reaction-time",
        sourceType: "score",
        sourceId: `preload_${i}`,
        xpPerCompletion: 10,
        dailyCapPerGame: 10,
      });
    }

    // 11th completion reaches daily cap (0 XP awarded)
    const completion11 = await progressionUseCases.recordAcceptedGameCompletion({
      userId: 1,
      gameId: "reaction-time",
      sourceId: "score_111",
    });

    assert.equal(completion11.capped, true);
    assert.equal(completion11.xpAwarded, 0);

    const attr = await guildXpUseCases.attributeCompletionToGuild({
      userId: 1,
      gameId: "reaction-time",
      sourceXpEventId: completion11.xpEventId!,
      xpAmount: completion11.xpAwarded, // 0
      playToken: ctx.token,
    });

    assert.equal(attr.attributed, true);
    assert.equal(attr.amount, 0);

    const guildAXp = await guildXpUseCases.getGuildUserXp("guild_A", 1);
    assert.equal(guildAXp, 0);
  });

  await t.test("12. Raw play token is never stored in database (hash only)", async () => {
    const ctx = await guildXpUseCases.createPlayContextFromInteraction({
      guildId: "guild_A",
      discordUserId: "discord_user_1",
    });

    const rawToken = ctx.token;
    let rawFoundInDb = false;

    for (const savedCtx of guildRepo.playContexts.values()) {
      if (savedCtx.tokenHash === rawToken) {
        rawFoundInDb = true;
      }
    }

    assert.equal(rawFoundInDb, false);
  });
});
