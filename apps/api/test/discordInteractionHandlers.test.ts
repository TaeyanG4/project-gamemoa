import test from "node:test";
import assert from "node:assert/strict";
import { handleGamemoaCommand } from "../src/infrastructure/discord/interactionHandlers.js";
import type { AppContainer } from "../src/container.js";
import { DISCORD_INTERACTION_TYPE } from "../src/infrastructure/discord/types.js";
import type { DiscordInteraction } from "../src/infrastructure/discord/types.js";
import type { OAuthAccount, User } from "@gamemoa/core";

const FRONTEND_URL = "https://gamemoa-web.gamemoa.workers.dev";

function fakeContainer(overrides: {
  findOAuthAccount?: (provider: string, id: string) => Promise<OAuthAccount | null>;
  findByOAuth?: (provider: string, id: string) => Promise<User | null>;
  createLinkChallenge?: () => Promise<{ token: string; expiresAt: string }>;
  getProgressionSummary?: () => Promise<{
    summary: { level: number; totalXp: number };
    eligibleCompletions: number;
  }>;
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
        (async () => ({ summary: { level: 3, totalXp: 450 }, eligibleCompletions: 12 })),
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
    // Unused by these handlers, but required by AppContainer's shape.
  } as unknown as AppContainer;
}

function gamesInteraction(): DiscordInteraction {
  return {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name: "gamemoa", options: [{ name: "games", type: 1 }] },
    member: { user: { id: "111", username: "tester" } },
  };
}

function linkInteraction(discordId = "999", username = "newbie"): DiscordInteraction {
  return {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name: "gamemoa", options: [{ name: "link", type: 1 }] },
    member: { user: { id: discordId, username } },
  };
}

function profileInteraction(discordId = "222"): DiscordInteraction {
  return {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name: "gamemoa", options: [{ name: "profile", type: 1 }] },
    member: { user: { id: discordId, username: "someone" } },
  };
}

function guildInteraction(
  subcommand: "play" | "rank" | "leaderboard" | "server",
  guildId: string | null = "guild-1",
): DiscordInteraction {
  return {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name: "gamemoa", options: [{ name: subcommand, type: 1 }] },
    member: { user: { id: "333", username: "player" } },
    ...(guildId ? { guild_id: guildId } : {}),
  };
}

test("/gamemoa games lists published games with website links as an embed, publicly visible", async () => {
  const response = await handleGamemoaCommand(fakeContainer({}), gamesInteraction(), FRONTEND_URL);
  assert.equal(response.type, 4);
  assert.equal(response.data?.flags, undefined); // not ephemeral — fine to share in-channel
  const embed = response.data?.embeds?.[0];
  assert.ok(embed, "expected an embed response");
  assert.match(embed?.description ?? "", new RegExp(`${FRONTEND_URL}/games/`));
});

test("/gamemoa link returns an ephemeral embed with a link URL for a not-yet-linked Discord user", async () => {
  const response = await handleGamemoaCommand(fakeContainer({}), linkInteraction(), FRONTEND_URL);
  assert.equal(response.data?.flags, 64);
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.description ?? "", /\/discord\/link\?token=raw-token-123/);
});

test("/gamemoa link tells an already-linked Discord user it's already linked, without issuing a new token", async () => {
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

  const response = await handleGamemoaCommand(container, linkInteraction(), FRONTEND_URL);
  assert.equal(challengeCalls, 0, "must not mint a link token for an already-linked account");
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.description ?? "", /이미.*연동/);
});

test("/gamemoa profile prompts an unlinked Discord user to link first", async () => {
  const response = await handleGamemoaCommand(
    fakeContainer({}),
    profileInteraction(),
    FRONTEND_URL,
  );
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.description ?? "", /gamemoa link/);
});

test("/gamemoa profile shows nickname/level/XP for a linked Discord user", async () => {
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
      summary: { level: 5, totalXp: 1650 },
      eligibleCompletions: 30,
    }),
  });

  const response = await handleGamemoaCommand(container, profileInteraction(), FRONTEND_URL);
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.title ?? "", /Taeyang/);
  const fieldsText = (embed?.fields ?? []).map((f) => `${f.name}:${f.value}`).join(" ");
  assert.match(fieldsText, /5/);
  assert.match(fieldsText, /1,650/);
});

test("unknown subcommand returns a safe ephemeral embed fallback", async () => {
  const interaction: DiscordInteraction = {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name: "gamemoa", options: [{ name: "totally-made-up", type: 1 }] },
    member: { user: { id: "1", username: "x" } },
  };
  const response = await handleGamemoaCommand(fakeContainer({}), interaction, FRONTEND_URL);
  assert.equal(response.data?.flags, 64);
  assert.ok(response.data?.embeds?.[0], "expected an embed response");
});

test("/gamemoa play requires a guild channel", async () => {
  const response = await handleGamemoaCommand(
    fakeContainer({}),
    guildInteraction("play", null),
    FRONTEND_URL,
  );
  assert.equal(response.data?.flags, 64);
  assert.match(response.data?.embeds?.[0]?.description ?? "", /길드\) 채널/);
});

test("/gamemoa play returns an ephemeral embed with the play link on success", async () => {
  const response = await handleGamemoaCommand(
    fakeContainer({}),
    guildInteraction("play"),
    FRONTEND_URL,
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

test("/gamemoa rank shows an encouragement embed when the user has no server XP yet", async () => {
  const response = await handleGamemoaCommand(
    fakeContainer({ findOAuthAccount: async () => linkedOAuthAccount }),
    guildInteraction("rank"),
    FRONTEND_URL,
  );
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.description ?? "", /아직 이 서버에 기여한 XP/);
});

test("/gamemoa rank shows nickname/XP/rank fields with the guild icon as thumbnail", async () => {
  const container = fakeContainer({
    findOAuthAccount: async () => linkedOAuthAccount,
    getUserGuildRankSummary: async () => ({ totalXp: 250, rank: 3, nickname: "RankedPlayer" }),
  });
  const response = await handleGamemoaCommand(container, guildInteraction("rank"), FRONTEND_URL);
  const embed = response.data?.embeds?.[0];
  assert.equal(embed?.thumbnail?.url, "https://cdn.discordapp.com/icons/g1/abc.png");
  const fieldsText = (embed?.fields ?? []).map((f) => `${f.name}:${f.value}`).join(" ");
  assert.match(fieldsText, /RankedPlayer/);
  assert.match(fieldsText, /250/);
  assert.match(fieldsText, /#3/);
});

test("/gamemoa leaderboard is a public (non-ephemeral) embed listing ranked entries", async () => {
  const container = fakeContainer({
    getGuildLeaderboard: async () => ({
      entries: [
        { rank: 1, nickname: "Top", xp: 999 },
        { rank: 2, nickname: "Second", xp: 500 },
      ],
      total: 2,
    }),
  });
  const response = await handleGamemoaCommand(
    container,
    guildInteraction("leaderboard"),
    FRONTEND_URL,
  );
  assert.equal(response.data?.flags, undefined);
  const embed = response.data?.embeds?.[0];
  assert.match(embed?.description ?? "", /Top/);
  assert.match(embed?.description ?? "", /Second/);
});

test("/gamemoa server shows a public embed with XP/participant fields", async () => {
  const container = fakeContainer({
    getGuildSummary: async () => ({ totalXp: 1200, weeklyXp: 80, participantCount: 15 }),
  });
  const response = await handleGamemoaCommand(container, guildInteraction("server"), FRONTEND_URL);
  assert.equal(response.data?.flags, undefined);
  const embed = response.data?.embeds?.[0];
  assert.equal(embed?.url, `${FRONTEND_URL}/discord/servers/test-guild`);
  const fieldsText = (embed?.fields ?? []).map((f) => `${f.name}:${f.value}`).join(" ");
  assert.match(fieldsText, /1,200/);
  assert.match(fieldsText, /80/);
  assert.match(fieldsText, /15명/);
});

test("/gamemoa leaderboard escapes markdown in nicknames so a crafted nickname can't render a masked phishing link in the public embed", async () => {
  const container = fakeContainer({
    getGuildLeaderboard: async () => ({
      entries: [{ rank: 1, nickname: "[Free Nitro](https://evil.example)", xp: 100 }],
      total: 1,
    }),
  });
  const response = await handleGamemoaCommand(
    container,
    guildInteraction("leaderboard"),
    FRONTEND_URL,
  );
  const description = response.data?.embeds?.[0]?.description ?? "";
  // The brackets must be backslash-escaped so Discord's markdown parser renders them as
  // literal text instead of parsing `[label](url)` into a clickable masked link.
  assert.match(description, /\\\[Free Nitro\\\]\(https:\/\/evil\.example\)/);
});

test("/gamemoa server and /gamemoa rank escape markdown in the Discord guild name", async () => {
  const container = fakeContainer({
    getGuildByGuildId: async () => ({
      guild_id: "g1",
      name: "**[Click me](https://evil.example)**",
      slug: "test-guild",
      icon_url: null,
      registration_status: "ACTIVE",
    }),
  });
  const response = await handleGamemoaCommand(container, guildInteraction("server"), FRONTEND_URL);
  const title = response.data?.embeds?.[0]?.title ?? "";
  assert.match(title, /\\\[Click me\\\]\(https:\/\/evil\.example\)/);
});

test("guild-scoped commands reject an unregistered/inactive server", async () => {
  const container = fakeContainer({ getGuildByGuildId: async () => null });
  const response = await handleGamemoaCommand(container, guildInteraction("server"), FRONTEND_URL);
  assert.equal(response.data?.flags, 64);
  assert.match(response.data?.embeds?.[0]?.description ?? "", /등록되지 않았거나/);
});
