import { GAME_MANIFEST_MAP } from "@gamemoa/core";
import type { AppContainer } from "../../container.js";
import { DISCORD_SUBCOMMANDS } from "./commands.js";
import {
  DISCORD_MESSAGE_FLAG_EPHEMERAL,
  DISCORD_RESPONSE_TYPE,
  type DiscordInteraction,
  type DiscordInteractionResponse,
  type DiscordInteractionUser,
} from "./types.js";

function ephemeral(content: string): DiscordInteractionResponse {
  return {
    type: DISCORD_RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: DISCORD_MESSAGE_FLAG_EPHEMERAL },
  };
}

function publicMessage(content: string): DiscordInteractionResponse {
  return { type: DISCORD_RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE, data: { content } };
}

/** Dispatches a verified `/gamemoa <subcommand>` interaction to its handler. */
export async function handleGamemoaCommand(
  container: AppContainer,
  interaction: DiscordInteraction,
  frontendUrl: string,
): Promise<DiscordInteractionResponse> {
  const subcommand = interaction.data?.options?.[0]?.name;
  // In-guild interactions carry the user under `member.user`; DM/user-installed
  // interactions carry it directly under `user`.
  const discordUser = interaction.member?.user ?? interaction.user;

  if (!discordUser) {
    return ephemeral("Discord 사용자 정보를 확인할 수 없습니다.");
  }

  switch (subcommand) {
    case DISCORD_SUBCOMMANDS.GAMES:
      return handleGamesCommand(frontendUrl);
    case DISCORD_SUBCOMMANDS.LINK:
      return handleLinkCommand(container, discordUser, frontendUrl);
    case DISCORD_SUBCOMMANDS.PROFILE:
      return handleProfileCommand(container, discordUser);
    default:
      return ephemeral("알 수 없는 명령어입니다.");
  }
}

function handleGamesCommand(frontendUrl: string): DiscordInteractionResponse {
  const published = Object.values(GAME_MANIFEST_MAP).filter((m) => m.status === "published");
  if (published.length === 0) {
    return publicMessage("현재 플레이 가능한 게임이 없습니다.");
  }
  const lines = published.map((g) => `• **${g.title}** — ${frontendUrl}/games/${g.slug}`);
  return publicMessage(`🎮 GAMEMOA 게임 목록\n${lines.join("\n")}`);
}

async function handleLinkCommand(
  container: AppContainer,
  discordUser: DiscordInteractionUser,
  frontendUrl: string,
): Promise<DiscordInteractionResponse> {
  const existing = await container.userRepo.findOAuthAccount("discord", discordUser.id);
  if (existing) {
    return ephemeral("이 Discord 계정은 이미 GAMEMOA 계정과 연동되어 있습니다.");
  }

  const displayName = discordUser.global_name || discordUser.username;
  const { token, expiresAt } = await container.discordLinkUseCases.createLinkChallenge(
    discordUser.id,
    displayName,
  );

  const expiresInMinutes = Math.max(
    1,
    Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000),
  );
  const linkUrl = `${frontendUrl}/discord/link?token=${encodeURIComponent(token)}`;

  return ephemeral(
    `GAMEMOA 계정과 연동하려면 아래 링크를 열고 로그인해주세요.\n${linkUrl}\n\n` +
      `이 링크는 ${expiresInMinutes}분 후 만료되며, 1회만 사용할 수 있습니다.`,
  );
}

async function handleProfileCommand(
  container: AppContainer,
  discordUser: DiscordInteractionUser,
): Promise<DiscordInteractionResponse> {
  const user = await container.userRepo.findByOAuth("discord", discordUser.id);
  if (!user) {
    return ephemeral(
      "이 Discord 계정은 아직 GAMEMOA 계정과 연동되지 않았습니다. `/gamemoa link`로 먼저 연동해주세요.",
    );
  }

  const { summary } = await container.progressionUseCases.getProgressionSummary(user.id);
  return ephemeral(
    `**${user.nickname}**\n레벨 ${summary.level} · 총 ${summary.totalXp.toLocaleString()} XP`,
  );
}
