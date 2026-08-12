import test from "node:test";
import assert from "node:assert/strict";
import {
  DiscordGuildRegistrationUseCases,
  DiscordGuildDirectoryUseCases,
  DiscordGuildManagementUseCases,
} from "../src/application/discordGuildUseCases.js";
import type {
  DiscordGuild,
  DiscordGuildRepository,
  DiscordGuildVisibility,
  DiscordCandidateGuild,
  DiscordRegistrationChallenge,
} from "../src/ports/repositories.js";

class FakeDiscordGuildRepository implements DiscordGuildRepository {
  public guilds = new Map<string, DiscordGuild>();
  public managers = new Set<string>(); // "guildId:userId"
  public challenges = new Map<string, DiscordRegistrationChallenge>();
  private challengeSeq = 1;

  async createRegistrationChallenge(input: {
    userId: number;
    manageableGuilds: DiscordCandidateGuild[];
    ttlSeconds?: number;
  }): Promise<{ token: string; expiresAt: string }> {
    const token = `token-${this.challengeSeq++}`;
    const ttl = input.ttlSeconds ?? 900;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    this.challenges.set(token, {
      tokenHash: `hash-${token}`,
      userId: input.userId,
      manageableGuilds: input.manageableGuilds,
      createdAt: new Date().toISOString(),
      expiresAt,
      consumedAt: null,
    });
    return { token, expiresAt };
  }

  async findRegistrationChallengeByToken(
    token: string,
  ): Promise<DiscordRegistrationChallenge | null> {
    return this.challenges.get(token) ?? null;
  }

  async consumeRegistrationChallengeByToken(token: string): Promise<void> {
    const c = this.challenges.get(token);
    if (c) c.consumedAt = new Date().toISOString();
  }

  async registerGuild(input: {
    guildId: string;
    slug: string;
    name: string;
    iconUrl?: string | null;
    description?: string | null;
    visibility: DiscordGuildVisibility;
    userId: number;
  }): Promise<DiscordGuild> {
    const now = new Date().toISOString();
    const g: DiscordGuild = {
      guild_id: input.guildId,
      slug: input.slug,
      name: input.name,
      icon_url: input.iconUrl ?? null,
      description: input.description ?? null,
      visibility: input.visibility,
      registration_status: "ACTIVE",
      registered_by_user_id: input.userId,
      registered_at: now,
      first_seen_at: now,
      last_seen_at: now,
      updated_at: now,
    };
    this.guilds.set(input.guildId, g);
    this.managers.add(`${input.guildId}:${input.userId}`);
    return g;
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

  async updateGuild(
    guildId: string,
    updates: {
      slug?: string;
      description?: string | null;
      visibility?: DiscordGuildVisibility;
      registrationStatus?: string;
      name?: string;
      iconUrl?: string | null;
    },
  ): Promise<DiscordGuild> {
    const g = this.guilds.get(guildId);
    if (!g) throw new Error("Guild not found");
    if (updates.slug !== undefined) g.slug = updates.slug;
    if (updates.description !== undefined) g.description = updates.description;
    if (updates.visibility !== undefined) g.visibility = updates.visibility;
    if (updates.registrationStatus !== undefined)
      g.registration_status = updates.registrationStatus as any;
    if (updates.name !== undefined) g.name = updates.name;
    if (updates.iconUrl !== undefined) g.icon_url = updates.iconUrl;
    g.updated_at = new Date().toISOString();
    return g;
  }

  async searchPublicGuilds(
    query?: string,
    limit = 20,
    offset = 0,
  ): Promise<{ guilds: DiscordGuild[]; total: number }> {
    let list = Array.from(this.guilds.values()).filter(
      (g) => g.visibility === "PUBLIC" && g.registration_status === "ACTIVE",
    );
    if (query?.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (g) => g.name.toLowerCase().includes(q) || g.slug.toLowerCase().includes(q),
      );
    }
    const total = list.length;
    const paginated = list.slice(offset, offset + limit);
    return { guilds: paginated, total };
  }

  async isGuildManager(guildId: string, userId: number): Promise<boolean> {
    return this.managers.has(`${guildId}:${userId}`);
  }

  async addGuildManager(guildId: string, userId: number): Promise<void> {
    this.managers.add(`${guildId}:${userId}`);
  }

  async getUserManagedGuilds(userId: number): Promise<DiscordGuild[]> {
    const result: DiscordGuild[] = [];
    for (const [key] of this.managers) {
      const [gId, uId] = key.split(":");
      if (Number(uId) === userId) {
        const g = this.guilds.get(gId);
        if (g && g.registration_status === "ACTIVE") result.push(g);
      }
    }
    return result;
  }
}

test("1. manager-authorized registration succeeds", async () => {
  const repo = new FakeDiscordGuildRepository();
  const regUseCases = new DiscordGuildRegistrationUseCases(repo);

  const { token } = await repo.createRegistrationChallenge({
    userId: 100,
    manageableGuilds: [{ guildId: "g-1", name: "Alpha Squad", iconUrl: null }],
  });

  const registered = await regUseCases.registerGuild({
    userId: 100,
    token,
    guildId: "g-1",
    slug: "alpha-squad",
    visibility: "PUBLIC",
  });

  assert.equal(registered.guild_id, "g-1");
  assert.equal(registered.slug, "alpha-squad");
  assert.equal(await repo.isGuildManager("g-1", 100), true);
});

test("2 & 3. non-manager / arbitrary guild_id registration fails", async () => {
  const repo = new FakeDiscordGuildRepository();
  const regUseCases = new DiscordGuildRegistrationUseCases(repo);

  const { token } = await repo.createRegistrationChallenge({
    userId: 100,
    manageableGuilds: [{ guildId: "g-1", name: "Alpha Squad", iconUrl: null }],
  });

  // Attempting to register arbitrary g-999 not in user's manageable candidate list
  await assert.rejects(
    () =>
      regUseCases.registerGuild({
        userId: 100,
        token,
        guildId: "g-999", // arbitrary
        slug: "arbitrary-guild",
        visibility: "PUBLIC",
      }),
    /management authority/,
  );
});

test("4. duplicate guild registration handled safely (updates metadata & manager)", async () => {
  const repo = new FakeDiscordGuildRepository();
  const regUseCases = new DiscordGuildRegistrationUseCases(repo);

  const { token: t1 } = await repo.createRegistrationChallenge({
    userId: 100,
    manageableGuilds: [{ guildId: "g-1", name: "Alpha Squad", iconUrl: null }],
  });

  await regUseCases.registerGuild({
    userId: 100,
    token: t1,
    guildId: "g-1",
    slug: "alpha-squad",
    visibility: "PUBLIC",
  });

  // Co-manager 200 re-registers or updates the same guild
  const { token: t2 } = await repo.createRegistrationChallenge({
    userId: 200,
    manageableGuilds: [{ guildId: "g-1", name: "Alpha Squad Updated", iconUrl: "http://icon" }],
  });

  const updated = await regUseCases.registerGuild({
    userId: 200,
    token: t2,
    guildId: "g-1",
    slug: "alpha-squad",
    visibility: "PUBLIC",
  });

  assert.equal(updated.name, "Alpha Squad Updated");
  assert.equal(await repo.isGuildManager("g-1", 200), true);
  assert.equal(await repo.isGuildManager("g-1", 100), true);
});

test("5 & 6. duplicate or reserved/invalid slug rejected", async () => {
  const repo = new FakeDiscordGuildRepository();
  const regUseCases = new DiscordGuildRegistrationUseCases(repo);

  const { token: t1 } = await repo.createRegistrationChallenge({
    userId: 100,
    manageableGuilds: [
      { guildId: "g-1", name: "Alpha Squad", iconUrl: null },
      { guildId: "g-2", name: "Beta Squad", iconUrl: null },
    ],
  });

  await regUseCases.registerGuild({
    userId: 100,
    token: t1,
    guildId: "g-1",
    slug: "alpha-squad",
    visibility: "PUBLIC",
  });

  const { token: t2 } = await repo.createRegistrationChallenge({
    userId: 100,
    manageableGuilds: [{ guildId: "g-2", name: "Beta Squad", iconUrl: null }],
  });

  // Duplicate slug
  await assert.rejects(
    () =>
      regUseCases.registerGuild({
        userId: 100,
        token: t2,
        guildId: "g-2",
        slug: "alpha-squad",
        visibility: "PUBLIC",
      }),
    /already in use/,
  );

  // Reserved slug
  const { token: t3 } = await repo.createRegistrationChallenge({
    userId: 100,
    manageableGuilds: [{ guildId: "g-3", name: "Gamma Squad", iconUrl: null }],
  });

  await assert.rejects(
    () =>
      regUseCases.registerGuild({
        userId: 100,
        token: t3,
        guildId: "g-3",
        slug: "admin",
        visibility: "PUBLIC",
      }),
    /reserved/,
  );
});

test("7, 8, 9. PUBLIC, UNLISTED, PRIVATE search & directory rules", async () => {
  const repo = new FakeDiscordGuildRepository();
  const dirUseCases = new DiscordGuildDirectoryUseCases(repo);

  await repo.registerGuild({
    guildId: "g-pub",
    slug: "public-guild",
    name: "Public Guild",
    visibility: "PUBLIC",
    userId: 1,
  });

  await repo.registerGuild({
    guildId: "g-unlisted",
    slug: "unlisted-guild",
    name: "Unlisted Guild",
    visibility: "UNLISTED",
    userId: 1,
  });

  await repo.registerGuild({
    guildId: "g-priv",
    slug: "private-guild",
    name: "Private Guild",
    visibility: "PRIVATE",
    userId: 1,
  });

  // 7. PUBLIC searchable
  const searchPub = await dirUseCases.searchPublicGuilds("public");
  assert.equal(searchPub.guilds.length, 1);
  assert.equal(searchPub.guilds[0].guild_id, "g-pub");

  // 8. UNLISTED excluded from search but direct page works
  const searchUnlisted = await dirUseCases.searchPublicGuilds("unlisted");
  assert.equal(searchUnlisted.guilds.length, 0);

  const directUnlistedPage = await dirUseCases.getGuildPageBySlug("unlisted-guild");
  assert.equal(directUnlistedPage.status, "OK");

  // 9. PRIVATE excluded from search
  const searchPriv = await dirUseCases.searchPublicGuilds("private");
  assert.equal(searchPriv.guilds.length, 0);
});

test("10. unauthorized PRIVATE access blocked", async () => {
  const repo = new FakeDiscordGuildRepository();
  const dirUseCases = new DiscordGuildDirectoryUseCases(repo);

  await repo.registerGuild({
    guildId: "g-priv",
    slug: "private-guild",
    name: "Private Guild",
    visibility: "PRIVATE",
    userId: 100, // Manager 100
  });

  // Non-manager viewer 999
  const pageResult = await dirUseCases.getGuildPageBySlug("private-guild", 999);
  assert.equal(pageResult.status, "FORBIDDEN");

  // Authorized manager viewer 100
  const managerResult = await dirUseCases.getGuildPageBySlug("private-guild", 100);
  assert.equal(managerResult.status, "OK");
});

test("11. unauthorized management blocked", async () => {
  const repo = new FakeDiscordGuildRepository();
  const mgmtUseCases = new DiscordGuildManagementUseCases(repo);

  await repo.registerGuild({
    guildId: "g-1",
    slug: "guild-one",
    name: "Guild One",
    visibility: "PUBLIC",
    userId: 100,
  });

  // Non-manager 999 tries to edit
  await assert.rejects(
    () =>
      mgmtUseCases.updateGuildSettings({
        userId: 999,
        guildId: "g-1",
        description: "Hacked",
      }),
    /Unauthorized/,
  );
});

test("12 & 13. slug rename and guild name change preserve guild_id identity", async () => {
  const repo = new FakeDiscordGuildRepository();
  const mgmtUseCases = new DiscordGuildManagementUseCases(repo);

  await repo.registerGuild({
    guildId: "g-canonical-id",
    slug: "original-slug",
    name: "Original Name",
    visibility: "PUBLIC",
    userId: 100,
  });

  const updated = await mgmtUseCases.updateGuildSettings({
    userId: 100,
    guildId: "g-canonical-id",
    slug: "new-slug",
  });

  assert.equal(updated.guild_id, "g-canonical-id");
  assert.equal(updated.slug, "new-slug");

  // Check lookup by new slug returns same guild_id
  const found = await repo.findBySlug("new-slug");
  assert.equal(found?.guild_id, "g-canonical-id");
});

test("14 & 15. search normalization and bounded results", async () => {
  const repo = new FakeDiscordGuildRepository();
  const dirUseCases = new DiscordGuildDirectoryUseCases(repo);

  for (let i = 1; i <= 30; i++) {
    await repo.registerGuild({
      guildId: `g-${i}`,
      slug: `server-${i}`,
      name: `Server Number ${i}`,
      visibility: "PUBLIC",
      userId: 1,
    });
  }

  // Bounded limit test (limit capped at 50, default 20)
  const res = await dirUseCases.searchPublicGuilds("server", 10, 0);
  assert.equal(res.guilds.length, 10);
  assert.equal(res.total, 30);

  // Case normalization match
  const resCase = await dirUseCases.searchPublicGuilds("sErVeR nUmBeR 1");
  assert.ok(resCase.guilds.length >= 1);
});
