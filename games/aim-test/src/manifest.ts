import type { GameManifest } from "@owogg/game-sdk";

export const manifest: GameManifest = {
  id: "aim-test",
  slug: "aim-test",
  title: "에임 테스트",
  shortDescription: "화면에 나타나는 타겟을 빠른 속도로 조준하고 클릭하세요!",
  description:
    "무작위로 생성되는 31개의 타겟을 정확하고 빠르게 조준하여 클릭하세요. 반응 속도와 정확도를 측정합니다.",
  modes: ["single"],
  status: "published",
  categories: ["aim", "reaction", "popular"],
  tags: ["에임", "조준", "반응속도", "클릭"],
  minPlayers: 1,
  maxPlayers: 1,
  thumbnail: "/games/aim-test/thumbnail.svg",
  accent: "#6366f1",
  estimatedRoundSeconds: 30,
  requiresAuth: false,
  supportsLeaderboard: true,
  inputMethods: ["mouse", "touch"],
  supportsReplay: false,
  // Hard mode shrinks the target (see logic.ts's TARGET_SIZE_BY_DIFFICULTY) — same 30 targets,
  // same elapsed-ms scoring, just less margin for error. Scores across tiers are not comparable,
  // hence a separate leaderboard partition per id (never rename these once real scores exist).
  difficulty: {
    levels: [
      { id: "normal", label: "보통" },
      { id: "hard", label: "어려움" },
    ],
    defaultLevelId: "normal",
  },
  version: "0.0.1",
  scoreConfig: {
    unit: "ms",
    direction: "asc",
    min: 500,
    max: 60000,
    displaySuffix: " ms",
  },
};
