import { Hono } from "hono";
import type { ApiEnv } from "./auth.js";
import { createContainer } from "../container.js";
import { verifyDiscordSignature } from "../infrastructure/discord/signature.js";
import { GAMEMOA_COMMAND_NAME } from "../infrastructure/discord/commands.js";
import { handleGamemoaCommand } from "../infrastructure/discord/interactionHandlers.js";
import {
  DISCORD_INTERACTION_TYPE,
  DISCORD_RESPONSE_TYPE,
  type DiscordInteraction,
} from "../infrastructure/discord/types.js";

export const discordRouter = new Hono<ApiEnv>();

// GET /api/discord/status — non-secret readiness check, mirrors /api/auth/providers.
discordRouter.get("/status", (c) => {
  return c.json({ configured: Boolean(c.env?.DISCORD_PUBLIC_KEY) });
});

// POST /api/discord/interactions — called directly by Discord's servers, not by our own
// frontend. It intentionally sits outside the normal browser session/CSRF flow; Ed25519
// signature verification (checked BEFORE the payload is trusted for anything, including
// PING) is the only trust boundary here.
discordRouter.post("/interactions", async (c) => {
  const publicKey = c.env?.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    // Optional integration not configured yet — never crash, never trust an unverifiable request.
    return c.json({ error: "Discord interactions not configured" }, 500);
  }

  const signature = c.req.header("X-Signature-Ed25519");
  const timestamp = c.req.header("X-Signature-Timestamp");
  const rawBody = await c.req.text();

  const validSignature = await verifyDiscordSignature({
    publicKeyHex: publicKey,
    signatureHex: signature,
    timestamp,
    rawBody,
  });

  if (!validSignature) {
    return c.json({ error: "Invalid request signature" }, 401);
  }

  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(rawBody) as DiscordInteraction;
  } catch {
    return c.json({ error: "Invalid payload" }, 400);
  }

  if (interaction.type === DISCORD_INTERACTION_TYPE.PING) {
    return c.json({ type: DISCORD_RESPONSE_TYPE.PONG });
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND &&
    interaction.data?.name === GAMEMOA_COMMAND_NAME
  ) {
    if (!c.env?.DB) {
      return c.json({
        type: DISCORD_RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "일시적으로 서비스를 이용할 수 없습니다.", flags: 64 },
      });
    }

    const container = createContainer(c.env.DB);
    const frontendUrl = c.env.FRONTEND_URL || "https://gamemoa-web.gamemoa.workers.dev";
    const response = await handleGamemoaCommand(container, interaction, frontendUrl);
    return c.json(response);
  }

  // Unhandled interaction type/command — respond safely rather than leaving Discord hanging.
  return c.json({
    type: DISCORD_RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: "지원하지 않는 상호작용입니다.", flags: 64 },
  });
});
