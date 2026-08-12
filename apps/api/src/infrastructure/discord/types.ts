// Minimal local types for the subset of the Discord Interactions payload this app reads.
// Intentionally not a full port of discord-api-types — keeps this dependency-free.

export interface DiscordInteractionUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
}

export interface DiscordInteractionMember {
  user: DiscordInteractionUser;
}

export interface DiscordInteractionOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: DiscordInteractionOption[];
}

export interface DiscordInteractionData {
  name: string;
  options?: DiscordInteractionOption[];
}

export interface DiscordInteraction {
  type: number;
  data?: DiscordInteractionData;
  member?: DiscordInteractionMember;
  user?: DiscordInteractionUser;
  guild_id?: string;
}

export interface DiscordInteractionResponseData {
  content?: string;
  /** Bitfield; 64 = EPHEMERAL (only the invoking user sees the response). */
  flags?: number;
}

export interface DiscordInteractionResponse {
  type: number;
  data?: DiscordInteractionResponseData;
}

export const DISCORD_INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
} as const;

export const DISCORD_RESPONSE_TYPE = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
} as const;

export const DISCORD_MESSAGE_FLAG_EPHEMERAL = 64;
