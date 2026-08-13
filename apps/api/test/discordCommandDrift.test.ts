import test from "node:test";
import assert from "node:assert/strict";
import {
  diffDiscordCommands,
  type CommandLike,
} from "../src/infrastructure/discord/commandDrift.js";
import { DISCORD_COMMANDS } from "../src/infrastructure/discord/commands.js";

test("diffDiscordCommands: identical local and remote command sets are in sync", () => {
  const remote = DISCORD_COMMANDS as unknown as CommandLike[];
  const result = diffDiscordCommands(DISCORD_COMMANDS as unknown as CommandLike[], remote);
  assert.equal(result.inSync, true);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.extra, []);
  assert.deepEqual(result.mismatched, []);
});

test("diffDiscordCommands: ignores Discord-generated fields (id/application_id/version/guild_id)", () => {
  const local: CommandLike[] = [{ name: "gamemoa", description: "d", options: [] }];
  const remote = [
    {
      id: "123456789",
      application_id: "987654321",
      version: "111",
      guild_id: undefined,
      default_member_permissions: null,
      dm_permission: true,
      name: "gamemoa",
      description: "d",
      options: [],
    },
  ] as unknown as CommandLike[];

  const result = diffDiscordCommands(local, remote);
  assert.equal(result.inSync, true);
});

test("diffDiscordCommands: a command missing from Discord is reported", () => {
  const local: CommandLike[] = [{ name: "gamemoa", description: "d" }];
  const result = diffDiscordCommands(local, []);
  assert.equal(result.inSync, false);
  assert.deepEqual(result.missing, ["gamemoa"]);
});

test("diffDiscordCommands: an unexpected extra command registered on Discord is reported", () => {
  const local: CommandLike[] = [{ name: "gamemoa", description: "d" }];
  const remote: CommandLike[] = [
    { name: "gamemoa", description: "d" },
    { name: "leftover-old-command", description: "stale" },
  ];
  const result = diffDiscordCommands(local, remote);
  assert.equal(result.inSync, false);
  assert.deepEqual(result.extra, ["leftover-old-command"]);
});

test("diffDiscordCommands: description drift is detected", () => {
  const local: CommandLike[] = [{ name: "gamemoa", description: "새 설명" }];
  const remote: CommandLike[] = [{ name: "gamemoa", description: "예전 설명" }];
  const result = diffDiscordCommands(local, remote);
  assert.equal(result.inSync, false);
  assert.equal(result.mismatched.length, 1);
  assert.equal(result.mismatched[0]?.name, "gamemoa");
});

test("diffDiscordCommands: subcommand/option drift is detected (added subcommand)", () => {
  const local: CommandLike[] = [
    {
      name: "gamemoa",
      description: "d",
      options: [
        { type: 1, name: "games", description: "games" },
        { type: 1, name: "play", description: "play" },
      ],
    },
  ];
  const remote: CommandLike[] = [
    {
      name: "gamemoa",
      description: "d",
      options: [{ type: 1, name: "games", description: "games" }],
    },
  ];
  const result = diffDiscordCommands(local, remote);
  assert.equal(result.inSync, false);
  assert.match(result.mismatched[0]?.reason ?? "", /options/);
});

test("diffDiscordCommands: option/subcommand order does not cause false drift", () => {
  const local: CommandLike[] = [
    {
      name: "gamemoa",
      description: "d",
      options: [
        { type: 1, name: "play", description: "play" },
        { type: 1, name: "games", description: "games" },
      ],
    },
  ];
  const remote: CommandLike[] = [
    {
      name: "gamemoa",
      description: "d",
      options: [
        { type: 1, name: "games", description: "games" },
        { type: 1, name: "play", description: "play" },
      ],
    },
  ];
  const result = diffDiscordCommands(local, remote);
  assert.equal(result.inSync, true);
});

test("diffDiscordCommands: choice value drift is detected", () => {
  const local: CommandLike[] = [
    {
      name: "gamemoa",
      description: "d",
      options: [
        {
          type: 1,
          name: "play",
          description: "play",
          options: [
            {
              type: 3,
              name: "game",
              description: "game",
              choices: [{ name: "Reaction Time", value: "reaction-time" }],
            },
          ],
        },
      ],
    },
  ];
  const remote: CommandLike[] = [
    {
      name: "gamemoa",
      description: "d",
      options: [
        {
          type: 1,
          name: "play",
          description: "play",
          options: [
            {
              type: 3,
              name: "game",
              description: "game",
              choices: [{ name: "Reaction Time", value: "reaction-time-old-slug" }],
            },
          ],
        },
      ],
    },
  ];
  const result = diffDiscordCommands(local, remote);
  assert.equal(result.inSync, false);
});
