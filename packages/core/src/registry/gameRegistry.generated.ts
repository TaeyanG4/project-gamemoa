// AUTO-GENERATED FILE BY scripts/generate-game-registry.ts - DO NOT EDIT MANUALLY
import type { GameManifest } from "@owogg/game-sdk";

export const GAME_MANIFESTS: GameManifest[] = [
  {
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
    version: "0.0.1",
    scoreConfig: {
      unit: "ms",
      direction: "asc",
      min: 500,
      max: 60000,
      displaySuffix: " ms",
    },
  },
  {
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
    version: "0.0.1",
    scoreConfig: {
      unit: "Level",
      direction: "desc",
      min: 1,
      max: 50,
      displayPrefix: "Level ",
    },
  },
  {
    id: "reaction-time",
    slug: "reaction-time",
    title: "반응속도 테스트",
    shortDescription: "화면이 바뀌면 최대한 빨리 클릭하세요!",
    description:
      "초록색 화면이 나타나는 순간 최대한 빨리 클릭하세요. 당신의 반응속도를 측정합니다.",
    modes: ["single"],
    status: "published",
    categories: ["reaction", "popular"],
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
  },
  {
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
    version: "0.1.0",
    scoreConfig: {
      unit: "WPM",
      direction: "desc",
      min: 0,
      max: 300,
      displaySuffix: " WPM",
    },
  },
];

export const GAME_MANIFEST_MAP: Record<string, GameManifest> = {
  "aim-test": {
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
    version: "0.0.1",
    scoreConfig: {
      unit: "ms",
      direction: "asc",
      min: 500,
      max: 60000,
      displaySuffix: " ms",
    },
  },
  "memory-test": {
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
    version: "0.0.1",
    scoreConfig: {
      unit: "Level",
      direction: "desc",
      min: 1,
      max: 50,
      displayPrefix: "Level ",
    },
  },
  "reaction-time": {
    id: "reaction-time",
    slug: "reaction-time",
    title: "반응속도 테스트",
    shortDescription: "화면이 바뀌면 최대한 빨리 클릭하세요!",
    description:
      "초록색 화면이 나타나는 순간 최대한 빨리 클릭하세요. 당신의 반응속도를 측정합니다.",
    modes: ["single"],
    status: "published",
    categories: ["reaction", "popular"],
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
  },
  "typing-test": {
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
    version: "0.1.0",
    scoreConfig: {
      unit: "WPM",
      direction: "desc",
      min: 0,
      max: 300,
      displaySuffix: " WPM",
    },
  },
};

export function validateScoreByManifest(
  gameId: string,
  score: number,
): { valid: boolean; reason?: string } {
  if (typeof score !== "number" || Number.isNaN(score) || !Number.isInteger(score) || score < 0) {
    return { valid: false, reason: "점수는 0 이상의 정수이어야 합니다." };
  }

  const manifest = GAME_MANIFEST_MAP[gameId];
  if (!manifest || !manifest.scoreConfig) {
    if (score > 1000000) {
      return { valid: false, reason: "허용 범위를 초과한 점수입니다." };
    }
    return { valid: true };
  }

  const { min, max } = manifest.scoreConfig;
  if (score < min || score > max) {
    return { valid: false, reason: `유효하지 않은 점수입니다 (${min}~${max}).` };
  }

  return { valid: true };
}
