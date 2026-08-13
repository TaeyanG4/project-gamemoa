// pnpm discord:commands:register
//
// Registers the OwOGG Discord Application Commands (global scope) via Discord's REST API.
// Safe to rerun: PUT replaces the entire global command set deterministically from
// apps/api/src/infrastructure/discord/commands.ts (the single source of truth also used by
// the Interactions route handler, so registered commands and handled commands never drift).
//
// Requires (read from process.env, never logged):
//   DISCORD_APPLICATION_ID  — Discord Application ID (same value as DISCORD_CLIENT_ID)
//   DISCORD_BOT_TOKEN       — Bot token from the Developer Portal's "Bot" tab
//
// Global command registration can take up to ~1 hour to propagate to all guilds.

import { DISCORD_COMMANDS } from "../apps/api/src/infrastructure/discord/commands.js";

async function registerDiscordCommands() {
  const applicationId = process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!applicationId) {
    console.error("❌ DISCORD_APPLICATION_ID (or DISCORD_CLIENT_ID) is not set.");
    process.exit(1);
  }
  if (!botToken) {
    console.error("❌ DISCORD_BOT_TOKEN is not set.");
    process.exit(1);
  }

  console.log(`🔍 Registering ${DISCORD_COMMANDS.length} OwOGG Discord command(s)...`);
  console.log(`   Application ID: ${applicationId}`);
  console.log(`   Commands: ${DISCORD_COMMANDS.map((c) => `/${c.name}`).join(", ")}`);

  const res = await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(DISCORD_COMMANDS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`❌ Command registration failed: HTTP ${res.status}`);
    console.error(text.slice(0, 2000));
    process.exit(1);
  }

  const registered = (await res.json()) as { name: string; id: string }[];
  console.log("✅ Registered commands:");
  for (const cmd of registered) {
    console.log(`   /${cmd.name} (id: ${cmd.id})`);
  }
  console.log("⏳ Global commands can take up to ~1 hour to propagate to all servers/DMs.");
}

void registerDiscordCommands();
