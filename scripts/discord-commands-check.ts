// pnpm discord:commands:check
//
// Deterministic drift check between the local DISCORD_COMMANDS single source of truth
// (apps/api/src/infrastructure/discord/commands.ts) and whatever is actually registered on
// Discord (global scope by default, or a single guild with --guild <id> / DISCORD_TEST_GUILD_ID).
// Exits non-zero with a useful diagnostic on drift. Never logs the Bot Token.
//
// Requires (read from process.env, never logged):
//   DISCORD_APPLICATION_ID  — Discord Application ID (same value as DISCORD_CLIENT_ID)
//   DISCORD_BOT_TOKEN       — Bot token from the Developer Portal's "Bot" tab
//   DISCORD_TEST_GUILD_ID   — only if checking a specific guild instead of global commands

import { DISCORD_COMMANDS } from "../apps/api/src/infrastructure/discord/commands.js";
import {
  diffDiscordCommands,
  type CommandLike,
} from "../apps/api/src/infrastructure/discord/commandDrift.js";

async function checkDiscordCommands() {
  const applicationId = process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildArgIndex = process.argv.indexOf("--guild");
  const guildId =
    (guildArgIndex >= 0 ? process.argv[guildArgIndex + 1] : undefined) ||
    process.env.DISCORD_TEST_GUILD_ID;

  if (!applicationId) {
    console.error("❌ DISCORD_APPLICATION_ID (or DISCORD_CLIENT_ID) is not set.");
    process.exit(1);
  }
  if (!botToken) {
    console.error("❌ DISCORD_BOT_TOKEN is not set.");
    process.exit(1);
  }

  const scope = guildId ? `guild ${guildId}` : "global";
  const endpoint = guildId
    ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${applicationId}/commands`;

  console.log(`🔍 Checking Discord command drift (${scope})...`);

  const res = await fetch(endpoint, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`❌ Failed to fetch registered commands: HTTP ${res.status}`);
    console.error(text.slice(0, 2000)); // Discord error bodies never include the token
    process.exit(1);
  }

  const remote = (await res.json()) as CommandLike[];
  const result = diffDiscordCommands(DISCORD_COMMANDS as unknown as CommandLike[], remote);

  if (result.inSync) {
    console.log(`✅ Discord commands (${scope}) match the local source of truth exactly.`);
    return;
  }

  console.error(`❌ Discord command drift detected (${scope}):`);
  if (result.missing.length > 0) {
    console.error(
      `   Missing on Discord (present locally, not registered): ${result.missing.join(", ")}`,
    );
  }
  if (result.extra.length > 0) {
    console.error(
      `   Extra on Discord (registered, not in local SSoT): ${result.extra.join(", ")}`,
    );
  }
  for (const m of result.mismatched) {
    console.error(`   Mismatched "/${m.name}": ${m.reason}`);
  }
  console.error(
    guildId
      ? "   Fix: pnpm discord:commands:register:guild"
      : "   Fix: pnpm discord:commands:register",
  );
  process.exit(1);
}

void checkDiscordCommands();
