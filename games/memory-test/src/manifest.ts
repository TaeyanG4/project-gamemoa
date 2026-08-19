import type { GameManifest } from "@owogg/game-sdk";

export const memoryTestManifest: GameManifest = {
  id: "memory-test",
  slug: "memory-test",
  title: "순서 기억력 테스트",
  shortDescription: "깜빡이는 색상 순서를 기억하고 순서대로 똑같이 누르세요!",
  description:
    "점점 길어지는 패턴을 완벽히 기억해보세요. 당신의 단기 기억력 한계는 어디까지일까요?",
  modes: ["single"],
  status: "published",
  categories: ["brain", "popular"],
  tags: ["기억력", "두뇌", "패턴", "패밀리"],
  minPlayers: 1,
  maxPlayers: 1,
  thumbnail: "/games/memory-test/thumbnail.svg",
  accent: "#10b981",
  estimatedRoundSeconds: 45,
  requiresAuth: false,
  supportsLeaderboard: true,
  inputMethods: ["mouse", "touch"],
  supportsReplay: false,
  version: "0.0.1",
  scoreConfig: {
    unit: "Level",
    direction: "desc",
    // 0, not 1 — a player who fails on their very first color submits a real, valid
    // completedLevels of 0 (see MemoryGameUI.tsx's handleColorClick: Math.max(0, level - 1) with
    // level starting at 1). A min of 1 rejected that as an invalid score at /api/scores.
    min: 0,
    max: 50,
    displayPrefix: "Level ",
  },
};

export const manifest = memoryTestManifest;
