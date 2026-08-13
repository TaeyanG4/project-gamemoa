import {
  DiscordLinkPreviewResponseSchema,
  ConfirmDiscordLinkResponseSchema,
  type DiscordLinkPreviewResponse,
  type ConfirmDiscordLinkResponse,
  DiscordBotStatusResponseSchema,
  type DiscordBotStatusResponse,
} from "@owogg/contracts";
import { apiFetch } from "../../lib/api";

export async function fetchDiscordLinkPreviewApi(
  token: string,
): Promise<DiscordLinkPreviewResponse> {
  return await apiFetch(
    `/api/discord/link/preview?token=${encodeURIComponent(token)}`,
    DiscordLinkPreviewResponseSchema,
  );
}

export async function confirmDiscordLinkApi(token: string): Promise<ConfirmDiscordLinkResponse> {
  return await apiFetch("/api/discord/link/confirm", ConfirmDiscordLinkResponseSchema, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function fetchDiscordBotStatusApi(): Promise<DiscordBotStatusResponse> {
  return await apiFetch("/api/discord/status", DiscordBotStatusResponseSchema);
}
