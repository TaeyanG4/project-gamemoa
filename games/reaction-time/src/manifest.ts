import type { GameManifest } from "@gamemoa/game-sdk";

export const manifest: GameManifest = {
  id: "reaction-time",
  slug: "reaction-time",
  title: "반응속도 테스트",
  shortDescription: "화면이 바뀌면 최대한 빨리 클릭하세요!",
  description: "초록색 화면이 나타나는 순간 최대한 빨리 클릭하세요. 당신의 반응속도를 측정합니다.",
  modes: ["single"] as const,
  status: "published",
  categories: ["반응", "측정"],
  tags: ["반응속도", "클릭", "타이밍"],
  minPlayers: 1,
  maxPlayers: 1,
  thumbnail: "/games/reaction-time/thumbnail.svg",
  accent: "#22c55e",
  estimatedRoundSeconds: 30,
  requiresAuth: false,
  supportsLeaderboard: true,
  version: "0.1.0",
  scoreConfig: {
    unit: "ms",
    direction: "asc",
    min: 50,
    max: 10000,
    displaySuffix: " ms",
  },
};
