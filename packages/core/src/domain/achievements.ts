// Pure domain data for the OwOGG v1 achievement set. Stable, extensible codes —
// never rename an existing code, only add new ones.

export const ACHIEVEMENT_CODES = {
  FIRST_PLAY: "FIRST_PLAY",
  PLAY_10: "PLAY_10",
  PLAY_100: "PLAY_100",
  FIRST_FAVORITE: "FIRST_FAVORITE",
  LEVEL_5: "LEVEL_5",
  LEVEL_10: "LEVEL_10",
  ALL_GAMES: "ALL_GAMES",
} as const;

export type AchievementCode = (typeof ACHIEVEMENT_CODES)[keyof typeof ACHIEVEMENT_CODES];

export interface AchievementDefinition {
  code: AchievementCode;
  titleKo: string;
  descriptionKo: string;
}

export const ACHIEVEMENT_DEFINITIONS: Record<AchievementCode, AchievementDefinition> = {
  FIRST_PLAY: {
    code: "FIRST_PLAY",
    titleKo: "첫 게임 완료",
    descriptionKo: "게임을 처음으로 완료했습니다.",
  },
  PLAY_10: {
    code: "PLAY_10",
    titleKo: "게임 10회 완료",
    descriptionKo: "게임을 총 10회 완료했습니다.",
  },
  PLAY_100: {
    code: "PLAY_100",
    titleKo: "게임 100회 완료",
    descriptionKo: "게임을 총 100회 완료했습니다.",
  },
  FIRST_FAVORITE: {
    code: "FIRST_FAVORITE",
    titleKo: "첫 즐겨찾기",
    descriptionKo: "게임을 처음으로 즐겨찾기에 추가했습니다.",
  },
  LEVEL_5: {
    code: "LEVEL_5",
    titleKo: "레벨 5 달성",
    descriptionKo: "레벨 5에 도달했습니다.",
  },
  LEVEL_10: {
    code: "LEVEL_10",
    titleKo: "레벨 10 달성",
    descriptionKo: "레벨 10에 도달했습니다.",
  },
  ALL_GAMES: {
    code: "ALL_GAMES",
    titleKo: "올라운더",
    descriptionKo: "현재 제공되는 모든 게임을 최소 1회 완료했습니다.",
  },
};

export const ALL_ACHIEVEMENT_CODES: AchievementCode[] = Object.keys(
  ACHIEVEMENT_DEFINITIONS,
) as AchievementCode[];

export function isAchievementCode(value: string): value is AchievementCode {
  return Object.prototype.hasOwnProperty.call(ACHIEVEMENT_DEFINITIONS, value);
}
