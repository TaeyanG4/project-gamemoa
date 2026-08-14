import type { GameManifest } from "@owogg/game-sdk";

export const manifest: GameManifest = {
  id: "typing-test",
  slug: "typing-test",
  title: "타자 속도 테스트",
  shortDescription:
    "60초 동안 정해진 문장을 빠르고 정확하게 입력하여 WPM(분당 단어 수)과 정확도를 측정하세요!",
  description:
    "영문 단어를 입력하며 자신의 타자 속도(WPM)와 분당 타수(CPM), 정확도를 측정해보세요. 정교한 타자 타이핑 실력에 도전하세요.",
  modes: ["single"],
  status: "published",
  categories: ["typing", "brain", "popular"],
  tags: ["타자", "WPM", "속도", "순발력", "두뇌"],
  minPlayers: 1,
  maxPlayers: 1,
  thumbnail: "/games/typing-test/thumbnail.svg",
  accent: "#3b82f6",
  estimatedRoundSeconds: 60,
  requiresAuth: false,
  supportsLeaderboard: true,
  inputMethods: ["keyboard"],
  supportsReplay: false,
  version: "0.1.0",
  scoreConfig: {
    unit: "WPM",
    direction: "desc",
    min: 0,
    max: 300,
    displaySuffix: " WPM",
  },
};
