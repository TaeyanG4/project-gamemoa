import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DISCORD_SUBCOMMANDS,
  GAMEMOA_DISCORD_COMMAND,
} from "../src/infrastructure/discord/commands.js";

test("Discord command source lists every implemented GAMEMOA subcommand", () => {
  const names = Object.values(DISCORD_SUBCOMMANDS);
  const options = GAMEMOA_DISCORD_COMMAND.options.map((option) => option.name);
  assert.deepEqual(new Set(options), new Set(names));
  assert.equal(names.length, 7);
});

test("Discord Bot guide documents every registered subcommand", () => {
  const guide = readFileSync(
    fileURLToPath(new URL("../../../docs/DISCORD_BOT_GUIDE.md", import.meta.url)),
    "utf8",
  );
  for (const name of Object.values(DISCORD_SUBCOMMANDS)) {
    assert.match(guide, new RegExp(`/gamemoa ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }
});
