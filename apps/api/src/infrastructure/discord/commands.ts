// Discord Application Command definitions for `/gamemoa`. This is the single source of
// truth for both command registration (scripts/register-discord-commands.ts) and the
// interaction router (routes/discordInteractions.ts), so they can never drift apart.

import { GAME_MANIFEST_MAP } from "@gamemoa/core";

export const GAMEMOA_COMMAND_NAME = "gamemoa";

export const DISCORD_SUBCOMMANDS = {
  LINK: "link",
  PROFILE: "profile",
  GAMES: "games",
  PLAY: "play",
} as const;

export type DiscordSubcommand = (typeof DISCORD_SUBCOMMANDS)[keyof typeof DISCORD_SUBCOMMANDS];

/** ApplicationCommandOptionType.SUB_COMMAND = 1, STRING = 3 */
const OPTION_TYPE_SUB_COMMAND = 1;
const OPTION_TYPE_STRING = 3;

const gameChoices = Object.values(GAME_MANIFEST_MAP).map((m) => ({
  name: m.title,
  value: m.id,
}));

export const GAMEMOA_DISCORD_COMMAND = {
  name: GAMEMOA_COMMAND_NAME,
  description: "GAMEMOA 계정 연동 및 정보 확인",
  options: [
    {
      type: OPTION_TYPE_SUB_COMMAND,
      name: DISCORD_SUBCOMMANDS.LINK,
      description: "이 Discord 계정을 GAMEMOA 계정과 연동합니다",
    },
    {
      type: OPTION_TYPE_SUB_COMMAND,
      name: DISCORD_SUBCOMMANDS.PROFILE,
      description: "연동된 GAMEMOA 프로필 요약을 확인합니다",
    },
    {
      type: OPTION_TYPE_SUB_COMMAND,
      name: DISCORD_SUBCOMMANDS.GAMES,
      description: "현재 GAMEMOA에서 즐길 수 있는 게임 목록을 확인합니다",
    },
    {
      type: OPTION_TYPE_SUB_COMMAND,
      name: DISCORD_SUBCOMMANDS.PLAY,
      description: "이 Discord 서버 기여 플레이 링크를 생성합니다",
      options: [
        {
          type: OPTION_TYPE_STRING,
          name: "game",
          description: "플레이할 미니게임을 선택합니다 (선택사항)",
          required: false,
          choices: gameChoices,
        },
      ],
    },
  ],
} as const;

export const DISCORD_COMMANDS = [GAMEMOA_DISCORD_COMMAND];
