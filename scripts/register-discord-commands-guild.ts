// pnpm discord:commands:register:guild
//
// Registers the OwOGG Discord Application Commands to a SINGLE guild via Discord's REST API
// (instant propagation, unlike the ~1 hour global rollout) — development/test guild use only.
// Production command availability is always driven by the global registration
// (`pnpm discord:commands:register`); this script exists so operators can iterate on command
// definitions against a real test guild without waiting on global propagation.
//
// Safe to rerun: PUT replaces the entire guild command set deterministically from
// apps/api/src/infrastructure/discord/commands.ts (the same single source of truth used for
// global registration and the Interactions route handler).
//
// Requires (read from process.env, never logged):
//   DISCORD_APPLICATION_ID  — Discord Application ID (same value as DISCORD_CLIENT_ID)
//   DISCORD_BOT_TOKEN       — Bot token from the Developer Portal's "Bot" tab
//   DISCORD_TEST_GUILD_ID   — the development/test guild ID to register commands into

import { DISCORD_COMMANDS } from "../apps/api/src/infrastructure/discord/commands.js";

async function registerGuildDiscordCommands() {
  const applicationId = process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_TEST_GUILD_ID;

  if (!applicationId) {
    console.error("❌ DISCORD_APPLICATION_ID (or DISCORD_CLIENT_ID) is not set.");
    process.exit(1);
  }
  if (!botToken) {
    console.error("❌ DISCORD_BOT_TOKEN is not set.");
    process.exit(1);
  }
  if (!guildId) {
    console.error(
      "❌ DISCORD_TEST_GUILD_ID is not set — this script only targets a single test guild.",
    );
    process.exit(1);
  }

  console.log(
    `🔍 Registering ${DISCORD_COMMANDS.length} OwOGG Discord command(s) to guild ${guildId}...`,
  );
  console.log(`   Application ID: ${applicationId}`);
  console.log(`   Commands: ${DISCORD_COMMANDS.map((c) => `/${c.name}`).join(", ")}`);

  const res = await fetch(
    `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(DISCORD_COMMANDS),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`❌ Guild command registration failed: HTTP ${res.status}`);
    console.error(text.slice(0, 2000));
    process.exit(1);
  }

  const registered = (await res.json()) as { name: string; id: string }[];
  console.log("✅ Registered guild commands (available immediately in this guild):");
  for (const cmd of registered) {
    console.log(`   /${cmd.name} (id: ${cmd.id})`);
  }
}

void registerGuildDiscordCommands();
