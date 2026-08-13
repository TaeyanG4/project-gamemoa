import { z } from "zod";

// ---------------------------------------------------------------------------
// /gamemoa link — Discord account-linking challenge (website side)
// ---------------------------------------------------------------------------

export const DiscordLinkPreviewResponseSchema = z.object({
  discordUsername: z.string(),
  expiresAt: z.string(),
});
export type DiscordLinkPreviewResponse = z.infer<typeof DiscordLinkPreviewResponseSchema>;

export const ConfirmDiscordLinkRequestSchema = z.object({
  token: z.string().min(1),
});
export type ConfirmDiscordLinkRequest = z.infer<typeof ConfirmDiscordLinkRequestSchema>;

export const ConfirmDiscordLinkResponseSchema = z.object({
  linked: z.literal(true),
  alreadyLinked: z.boolean(),
});
export type ConfirmDiscordLinkResponse = z.infer<typeof ConfirmDiscordLinkResponseSchema>;

// ---------------------------------------------------------------------------
// Discord bot readiness (non-secret), mirrors AuthProvidersResponseSchema
// ---------------------------------------------------------------------------

export const DiscordBotStatusResponseSchema = z.object({
  configured: z.boolean(),
  installUrl: z.string().url().nullable().optional(),
});
export type DiscordBotStatusResponse = z.infer<typeof DiscordBotStatusResponseSchema>;
