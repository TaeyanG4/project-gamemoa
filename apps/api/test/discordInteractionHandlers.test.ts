import test from "node:test";
import assert from "node:assert/strict";
import { handleOwoggCommand } from "../src/infrastructure/discord/interactionHandlers.js";
import type { AppContainer } from "../src/container.js";
import { DISCORD_INTERACTION_TYPE } from "../src/infrastructure/discord/types.js";
import type { DiscordInteraction } from "../src/infrastructure/discord/types.js";
import type { OAuthAccount, User } from "@owogg/core";

const FRONTEND_URL = "https://owogg.com";
const API_BASE_URL = "https://api.owogg.com";

function fakeContainer(overrides: {
  findOAuthAccount?: (provider: string, id: string) => Promise<OAuthAccount | null>;
  findByOAuth?: (provider: string, id: string) => Promise<User | null>;
  createLinkChallenge?: () => Promise<{ token: string; expiresAt: string }>;
  getProgressionSummary?: () => Promise<{
    summary: {
      level: number;
      totalXp: number;
      currentLevelProgressXp: number;
      currentLevelSpanXp: number;
      progressPercent: number;
    };
    eligibleCompletions: number;
  }>;
  getGlobalXpRank?: () => Promise<number | null>;
  getGuildByGuildId?: () => Promise<{
    guild_id: string;
    name: string;
    slug: string;
    icon_url: string | null;
    registration_status: string;
  } | null>;
  createPlayContextFromInteraction?: () => Promise<{
    token: string;
    expiresAt: string;
    guildName: string;
    slug: string;
  }>;
  getUserGuildRankSummary?: () => Promise<{
    totalXp: number;
    rank: number | null;
    nickname?: string;
  }>;
  getGuildLeaderboard?: () => Promise<{
    entries: { rank: number; nickname: string; xp: number }[];
    total: number;
  }>;
  getGuildSummary?: () => Promise<{ totalXp: number; weeklyXp: number; participantCount: number }>;
  getAchievementSummary?: () => Promise<{
    unlockedCodes: string[];
    totalAchievements: number;
    recentlyUnlocked: { achievementCode: string; unlockedAt: string }[];
  }>;
}): AppContainer {
  return {
    userRepo: {
      findOAuthAccount: overrides.findOAuthAccount ?? (async () => null),
      findByOAuth: overrides.findByOAuth ?? (async () => null),
    },
    discordLinkUseCases: {
      createLinkChallenge:
        overrides.createLinkChallenge ??
        (async () => ({
          token: "raw-token-123",
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
        })),
    },
    progressionUseCases: {
      getProgressionSummary:
        overrides.getProgressionSummary ??
        (async () => ({
          summary: {
            level: 3,
            totalXp: 450,
            currentLevelProgressXp: 50,
            currentLevelSpanXp: 200,
            progressPercent: 25,
          },
          eligibleCompletions: 12,
        })),
      getGlobalXpRank: overrides.getGlobalXpRank ?? (async () => null),
    },
    discordGuildDirectoryUseCases: {
      getGuildByGuildId:
        overrides.getGuildByGuildId ??
        (async () => ({
          guild_id: "g1",
          name: "Test Guild",
          slug: "test-guild",
          icon_url: "https://cdn.discordapp.com/icons/g1/abc.png",
          registration_status: "ACTIVE",
        })),
    },
    discordGuildXpUseCases: {
      createPlayContextFromInteraction:
        overrides.createPlayContextFromInteraction ??
        (async () => ({
          token: "play-token-1",
          expiresAt: new Date(Date.now() + 900_000).toISOString(),
          guildName: "Test Guild",
          slug: "test-guild",
        })),
      getUserGuildRankSummary:
        overrides.getUserGuildRankSummary ?? (async () => ({ totalXp: 0, rank: null })),
      getGuildLeaderboard:
        overrides.getGuildLeaderboard ?? (async () => ({ entries: [], total: 0 })),
      getGuildSummary:
        overrides.getGuildSummary ??
        (async () => ({ totalXp: 0, weeklyXp: 0, participantCount: 0 })),
    },
    achievementUseCases: {
      getSummary:
        overrides.getAchievementSummary ??
        (async () => ({ unlockedCodes: [], totalAchievements: 7, recentlyUnlocked: [] })),
    },
    // Unused by these handlers, but required by AppContainer's shape.
  } as unknown as AppContainer;
}

function gamesInteraction(): DiscordInteraction {
  return {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name: "owogg", options: [{ name: "games", type: 1 }] },
    member: { user: { id: "111", username: "tester" } },
  };
}

function linkInteraction(discordId = "999", username = "newbie"): DiscordInteraction {
  return {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name: "owogg", options: [{ name: "link", type: 1 }] },
    member: { user: { id: discordId, username } },
  };
}

function profileInteraction(discordId = "222"): DiscordInteraction {
  return {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name: "owogg", options: [{ name: "profile", type: 1 }] },
    member: { user: { id: discordId, username: "someone" } },
  };
}

function helpInteraction(): DiscordInteraction {
  return {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name: "owogg", options: [{ name: "help", type: 1 }] },
    member: { user: { id: "444", username: "curious" } },
  };
}

function achievementsInteraction(discordId = "555"): DiscordInteraction {
  return {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name: "owogg", options: [{ name: "achievements", type: 1 }] },
    member: { user: { id: discordId, username: "achiever" } },
  };
}

function guildInteraction(
  subcommand: "play" | "rank" | "leaderboard" | "server",
  guildId: string | null = "guild-1",
  subOptions: { name: string; type: number; value: string }[] = [],
): DiscordInteraction {
  return {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name: "owogg", options: [{ name: subcommand, type: 1, options: subOptions }] },
    member: { user: { id: "333", username: "player" } },
    ...(guildId ? { guild_id: guildId } : {}),
  };
}

test("/owogg games lists published games with website links as an embed, publicly visible", async () => {
  const response = await handleOwoggCommand(
    fakeContainer({}),
    gamesInteraction(),
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.equal(response.type, 4);
  assert.equal(response.data?.flags, undefined); // not ephemeral — fine to share in-channel
  const embed = response.data?.embeds?.[0];
  assert.ok(embed, "expected an embed response");
  assert.match(embed?.description ?? "", new RegExp(`${FRONTEND_URL}/games/`));
});

test("/owogg link returns an ephemeral embed with a link URL for a not-yet-linked Discord user", async () => {
  const response = await handleOwoggCommand(
    fakeContainer({}),
    linkInteraction(),
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.equal(response.data?.flags, 64);
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.description ?? "", /\/discord\/link\?token=raw-token-123/);
});

test("/owogg link tells an already-linked Discord user it's already linked, without issuing a new token", async () => {
  let challengeCalls = 0;
  const container = fakeContainer({
    findOAuthAccount: async () => ({
      id: 1,
      user_id: 5,
      provider: "discord",
      provider_user_id: "999",
      provider_email: null,
      created_at: "2026-01-01T00:00:00.000Z",
    }),
    createLinkChallenge: async () => {
      challengeCalls++;
      return { token: "should-not-be-used", expiresAt: new Date().toISOString() };
    },
  });

  const response = await handleOwoggCommand(
    container,
    linkInteraction(),
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.equal(challengeCalls, 0, "must not mint a link token for an already-linked account");
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.description ?? "", /이미.*연동/);
});

test("/owogg profile prompts an unlinked Discord user to link first", async () => {
  const response = await handleOwoggCommand(
    fakeContainer({}),
    profileInteraction(),
    FRONTEND_URL,
    API_BASE_URL,
  );
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.description ?? "", /owogg link/);
});

test("/owogg profile shows nickname/level/XP for a linked Discord user", async () => {
  const container = fakeContainer({
    findByOAuth: async () => ({
      id: 7,
      nickname: "Taeyang",
      email: null,
      avatar_url: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      providers: ["discord"],
    }),
    getProgressionSummary: async () => ({
      summary: {
        level: 5,
        totalXp: 1650,
        currentLevelProgressXp: 150,
        currentLevelSpanXp: 500,
        progressPercent: 30,
      },
      eligibleCompletions: 30,
    }),
  });

  const response = await handleOwoggCommand(
    container,
    profileInteraction(),
    FRONTEND_URL,
    API_BASE_URL,
  );
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.title ?? "", /Taeyang/);
  const fieldsText = (embed?.fields ?? []).map((f) => `${f.name}:${f.value}`).join(" ");
  assert.match(fieldsText, /5/);
  assert.match(fieldsText, /▰/); // progress bar rendered
  assert.match(fieldsText, /1,650/);
});

test("unknown subcommand returns a safe ephemeral embed fallback", async () => {
  const interaction: DiscordInteraction = {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name: "owogg", options: [{ name: "totally-made-up", type: 1 }] },
    member: { user: { id: "1", username: "x" } },
  };
  const response = await handleOwoggCommand(
    fakeContainer({}),
    interaction,
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.equal(response.data?.flags, 64);
  assert.ok(response.data?.embeds?.[0], "expected an embed response");
});

test("/owogg play requires a guild channel", async () => {
  const response = await handleOwoggCommand(
    fakeContainer({}),
    guildInteraction("play", null),
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.equal(response.data?.flags, 64);
  assert.match(response.data?.embeds?.[0]?.description ?? "", /길드\) 채널/);
});

test("/owogg play returns an ephemeral embed with the play link on success", async () => {
  const response = await handleOwoggCommand(
    fakeContainer({}),
    guildInteraction("play"),
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.equal(response.data?.flags, 64);
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.title ?? "", /Test Guild/);
  const fieldsText = (embed?.fields ?? []).map((f) => f.value).join(" ");
  assert.match(fieldsText, /play_token=play-token-1/);
});

const linkedOAuthAccount: OAuthAccount = {
  id: 1,
  user_id: 5,
  provider: "discord",
  provider_user_id: "333",
  provider_email: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

test("/owogg rank shows an encouragement embed when the user has no server XP yet", async () => {
  const response = await handleOwoggCommand(
    fakeContainer({ findOAuthAccount: async () => linkedOAuthAccount }),
    guildInteraction("rank"),
    FRONTEND_URL,
    API_BASE_URL,
  );
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.description ?? "", /아직 이 서버에 기여한 XP/);
});

test("/owogg rank shows nickname/XP/rank fields with the guild icon as thumbnail", async () => {
  const container = fakeContainer({
    findOAuthAccount: async () => linkedOAuthAccount,
    getUserGuildRankSummary: async () => ({ totalXp: 250, rank: 3, nickname: "RankedPlayer" }),
  });
  const response = await handleOwoggCommand(
    container,
    guildInteraction("rank"),
    FRONTEND_URL,
    API_BASE_URL,
  );
  const embed = response.data?.embeds?.[0];
  assert.equal(embed?.thumbnail?.url, "https://cdn.discordapp.com/icons/g1/abc.png");
  const fieldsText = (embed?.fields ?? []).map((f) => `${f.name}:${f.value}`).join(" ");
  assert.match(fieldsText, /RankedPlayer/);
  assert.match(fieldsText, /250/);
  assert.match(fieldsText, /#3/);
});

test("/owogg leaderboard is a public (non-ephemeral) embed listing ranked entries", async () => {
  const container = fakeContainer({
    getGuildLeaderboard: async () => ({
      entries: [
        { rank: 1, nickname: "Top", xp: 999 },
        { rank: 2, nickname: "Second", xp: 500 },
      ],
      total: 2,
    }),
  });
  const response = await handleOwoggCommand(
    container,
    guildInteraction("leaderboard"),
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.equal(response.data?.flags, undefined);
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.description ?? "", /Top/);
  assert.match(embed?.description ?? "", /Second/);
});

test("/owogg server shows a public embed with XP/participant fields", async () => {
  const container = fakeContainer({
    getGuildSummary: async () => ({ totalXp: 1200, weeklyXp: 80, participantCount: 15 }),
  });
  const response = await handleOwoggCommand(
    container,
    guildInteraction("server"),
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.equal(response.data?.flags, undefined);
  const embed = response.data?.embeds?.[0];
  assert.equal(embed?.url, `${FRONTEND_URL}/discord/servers/test-guild`);
  const fieldsText = (embed?.fields ?? []).map((f) => `${f.name}:${f.value}`).join(" ");
  assert.match(fieldsText, /1,200/);
  assert.match(fieldsText, /80/);
  assert.match(fieldsText, /15명/);
});

test("/owogg leaderboard escapes markdown in nicknames so a crafted nickname can't render a masked phishing link in the public embed", async () => {
  const container = fakeContainer({
    getGuildLeaderboard: async () => ({
      entries: [{ rank: 1, nickname: "[Free Nitro](https://evil.example)", xp: 100 }],
      total: 1,
    }),
  });
  const response = await handleOwoggCommand(
    container,
    guildInteraction("leaderboard"),
    FRONTEND_URL,
    API_BASE_URL,
  );
  const description = response.data?.embeds?.[0]?.description ?? "";
  // The brackets must be backslash-escaped so Discord's markdown parser renders them as
  // literal text instead of parsing `[label](url)` into a clickable masked link.
  assert.match(description, /\\\[Free Nitro\\\]\(https:\/\/evil\.example\)/);
});

test("/owogg server and /owogg rank escape markdown in the Discord guild name", async () => {
  const container = fakeContainer({
    getGuildByGuildId: async () => ({
      guild_id: "g1",
      name: "**[Click me](https://evil.example)**",
      slug: "test-guild",
      icon_url: null,
      registration_status: "ACTIVE",
    }),
  });
  const response = await handleOwoggCommand(
    container,
    guildInteraction("server"),
    FRONTEND_URL,
    API_BASE_URL,
  );
  const title = response.data?.embeds?.[0]?.title ?? "";
  assert.match(title, /\\\[Click me\\\]\(https:\/\/evil\.example\)/);
});

test("guild-scoped commands reject an unregistered/inactive server", async () => {
  const container = fakeContainer({ getGuildByGuildId: async () => null });
  const response = await handleOwoggCommand(
    container,
    guildInteraction("server"),
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.equal(response.data?.flags, 64);
  assert.match(response.data?.embeds?.[0]?.description ?? "", /등록되지 않았거나/);
});

test("/owogg help lists every registered subcommand, publicly visible", async () => {
  const response = await handleOwoggCommand(
    fakeContainer({}),
    helpInteraction(),
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.equal(response.data?.flags, undefined);
  const description = response.data?.embeds?.[0]?.description ?? "";
  for (const name of [
    "help",
    "link",
    "profile",
    "games",
    "play",
    "rank",
    "leaderboard",
    "server",
    "achievements",
  ]) {
    assert.match(description, new RegExp(`/owogg ${name}`));
  }
});

test("/owogg achievements prompts an unlinked Discord user to link first", async () => {
  const response = await handleOwoggCommand(
    fakeContainer({}),
    achievementsInteraction(),
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.equal(response.data?.flags, 64);
  assert.match(response.data?.embeds?.[0]?.description ?? "", /owogg link/);
});

test("/owogg achievements shows unlocked (✅) vs locked (⬜) achievements with a progress footer", async () => {
  const container = fakeContainer({
    findByOAuth: async () => ({
      id: 9,
      nickname: "Achiever",
      email: null,
      avatar_url: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      providers: ["discord"],
    }),
    getAchievementSummary: async () => ({
      unlockedCodes: ["FIRST_PLAY"],
      totalAchievements: 7,
      recentlyUnlocked: [{ achievementCode: "FIRST_PLAY", unlockedAt: "2026-01-02T00:00:00.000Z" }],
    }),
  });
  const response = await handleOwoggCommand(
    container,
    achievementsInteraction(),
    FRONTEND_URL,
    API_BASE_URL,
  );
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.title ?? "", /Achiever/);
  assert.equal(embed?.url, `${FRONTEND_URL}/users/9`);
  assert.match(embed?.description ?? "", /✅.*첫 게임 완료/);
  assert.match(embed?.description ?? "", /⬜/); // at least one still-locked achievement listed
  assert.match(embed?.footer?.text ?? "", /1 \/ 7/);
});

test("/owogg rank and /owogg leaderboard default to all-time when no period option is given", async () => {
  const container = fakeContainer({
    findOAuthAccount: async () => linkedOAuthAccount,
    getUserGuildRankSummary: async () => ({ totalXp: 100, rank: 1, nickname: "Steady" }),
  });
  const response = await handleOwoggCommand(
    container,
    guildInteraction("rank"),
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.match(response.data?.embeds?.[0]?.title ?? "", /전체 기간/);
});

test("/owogg rank shows weekly XP when period:weekly is passed", async () => {
  const container = fakeContainer({
    findOAuthAccount: async () => linkedOAuthAccount,
    getUserGuildRankSummary: async () => ({ totalXp: 40, rank: 2, nickname: "ThisWeek" }),
  });
  const response = await handleOwoggCommand(
    container,
    guildInteraction("rank", "guild-1", [{ name: "period", type: 3, value: "weekly" }]),
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.match(response.data?.embeds?.[0]?.title ?? "", /이번 주/);
});

test("/owogg leaderboard shows weekly XP when period:weekly is passed", async () => {
  const container = fakeContainer({
    getGuildLeaderboard: async () => ({
      entries: [{ rank: 1, nickname: "WeeklyTop", xp: 77 }],
      total: 1,
    }),
  });
  const response = await handleOwoggCommand(
    container,
    guildInteraction("leaderboard", "guild-1", [{ name: "period", type: 3, value: "weekly" }]),
    FRONTEND_URL,
    API_BASE_URL,
  );
  assert.match(response.data?.embeds?.[0]?.title ?? "", /이번 주/);
});
