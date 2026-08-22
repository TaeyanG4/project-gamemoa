// Discord Application Command definitions for `/owogg`. This is the single source of
// truth for both command registration (scripts/register-discord-commands.ts) and the
// interaction router (routes/discordInteractions.ts), so they can never drift apart.

export const OWOGG_COMMAND_NAME = "owogg";

export const DISCORD_SUBCOMMANDS = {
  HELP: "help",
  LINK: "link",
  PROFILE: "profile",
  GAMES: "games",
  PLAY: "play",
  RANK: "rank",
  LEADERBOARD: "leaderboard",
  SERVER: "server",
  ACHIEVEMENTS: "achievements",
} as const;

export type DiscordSubcommand = (typeof DISCORD_SUBCOMMANDS)[keyof typeof DISCORD_SUBCOMMANDS];

/** ApplicationCommandOptionType.SUB_COMMAND = 1, STRING = 3 */
const OPTION_TYPE_SUB_COMMAND = 1;
const OPTION_TYPE_STRING = 3;

const periodChoices = [
  { name: "전체 기간", value: "alltime" },
  { name: "이번 주", value: "weekly" },
];

export const OWOGG_DISCORD_COMMAND = {
  name: OWOGG_COMMAND_NAME,
  description: "OwOGG 계정 연동 및 정보 확인",
  options: [
    {
      type: OPTION_TYPE_SUB_COMMAND,
      name: DISCORD_SUBCOMMANDS.HELP,
      description: "/owogg 명령어 전체 목록과 사용법을 확인합니다",
    },
    {
      type: OPTION_TYPE_SUB_COMMAND,
      name: DISCORD_SUBCOMMANDS.LINK,
      description: "이 Discord 계정을 OwOGG 계정과 연동합니다",
    },
    {
      type: OPTION_TYPE_SUB_COMMAND,
      name: DISCORD_SUBCOMMANDS.PROFILE,
      description: "연동된 OwOGG 프로필 요약을 확인합니다",
    },
    {
      type: OPTION_TYPE_SUB_COMMAND,
      name: DISCORD_SUBCOMMANDS.GAMES,
      description: "현재 OwOGG에서 즐길 수 있는 게임 목록을 확인합니다",
    },
    {
      type: OPTION_TYPE_SUB_COMMAND,
      name: DISCORD_SUBCOMMANDS.PLAY,
      description: "이 Discord 서버 기여 플레이 링크를 생성합니다",
      options: [
        {
          type: OPTION_TYPE_STRING,
          name: "game",
          description: "플레이할 게임 slug를 입력합니다 (선택사항, /owogg games에서 확인)",
          required: false,
        },
      ],
    },
    {
      type: OPTION_TYPE_SUB_COMMAND,
      name: DISCORD_SUBCOMMANDS.RANK,
      description: "이 Discord 서버 내 나의 OwOGG 순위와 기여 XP를 확인합니다",
      options: [
        {
          type: OPTION_TYPE_STRING,
          name: "period",
          description: "집계 기간을 선택합니다 (기본값: 전체 기간)",
          required: false,
          choices: periodChoices,
        },
      ],
    },
    {
      type: OPTION_TYPE_SUB_COMMAND,
      name: DISCORD_SUBCOMMANDS.LEADERBOARD,
      description: "이 Discord 서버의 OwOGG XP 리더보드를 확인합니다",
      options: [
        {
          type: OPTION_TYPE_STRING,
          name: "period",
          description: "집계 기간을 선택합니다 (기본값: 전체 기간)",
          required: false,
          choices: periodChoices,
        },
      ],
    },
    {
      type: OPTION_TYPE_SUB_COMMAND,
      name: DISCORD_SUBCOMMANDS.SERVER,
      description: "이 Discord 서버의 OwOGG 활동 정보 요약을 확인합니다",
    },
    {
      type: OPTION_TYPE_SUB_COMMAND,
      name: DISCORD_SUBCOMMANDS.ACHIEVEMENTS,
      description: "연동된 OwOGG 계정의 도전과제 달성 현황을 확인합니다",
    },
  ],
} as const;

export const DISCORD_COMMANDS = [OWOGG_DISCORD_COMMAND];
