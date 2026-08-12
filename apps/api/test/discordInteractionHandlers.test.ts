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

test("/gamemoa games lists published games with website links, publicly visible", async () => {
  const response = await handleGamemoaCommand(fakeContainer({}), gamesInteraction(), FRONTEND_URL);
  assert.equal(response.type, 4);
  assert.equal(response.data?.flags, undefined); // not ephemeral — fine to share in-channel
  assert.match(response.data?.content ?? "", new RegExp(`${FRONTEND_URL}/games/`));
});

test("/gamemoa link returns an ephemeral link URL for a not-yet-linked Discord user", async () => {
  const response = await handleGamemoaCommand(fakeContainer({}), linkInteraction(), FRONTEND_URL);
  assert.equal(response.data?.flags, 64);
  assert.match(response.data?.content ?? "", /\/discord\/link\?token=raw-token-123/);
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
  assert.match(response.data?.content ?? "", /이미.*연동/);
});

test("/gamemoa profile prompts an unlinked Discord user to link first", async () => {
  const response = await handleGamemoaCommand(
    fakeContainer({}),
    profileInteraction(),
    FRONTEND_URL,
  );
  assert.match(response.data?.content ?? "", /gamemoa link/);
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
  assert.match(response.data?.content ?? "", /Taeyang/);
  assert.match(response.data?.content ?? "", /레벨 5/);
  assert.match(response.data?.content ?? "", /1,650/);
});

test("unknown subcommand returns a safe ephemeral fallback", async () => {
  const interaction: DiscordInteraction = {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name: "gamemoa", options: [{ name: "totally-made-up", type: 1 }] },
    member: { user: { id: "1", username: "x" } },
  };
  const response = await handleGamemoaCommand(fakeContainer({}), interaction, FRONTEND_URL);
  assert.equal(response.data?.flags, 64);
});
