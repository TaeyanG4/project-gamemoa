// AUTO-GENERATED FILE BY scripts/generate-game-registry.ts - DO NOT EDIT MANUALLY
//
// Compiled from game-registry/games/<slug>/{info,policy}.json. Edit those files, then run
// `pnpm generate:registry`; `pnpm registry:check` fails the build if this drifts from them.
//
// SYSTEM-owned games only. Nothing reads this yet — GAME_MANIFESTS (gameRegistry.generated.ts)
// is still the runtime source of truth for score policy and the admin kill switch.
import type { GameDefinition } from "../modules/game/domain/gameDefinition.js";

export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    slug: "aim-test",
    owner: {
      type: "SYSTEM",
    },
    title: "에임 테스트",
    shortDescription: "화면에 나타나는 타겟을 빠른 속도로 조준하고 클릭하세요!",
    description:
      "무작위로 생성되는 31개의 타겟을 정확하고 빠르게 조준하여 클릭하세요. 반응 속도와 정확도를 측정합니다.",
    status: "published",
    categories: ["aim", "reaction", "popular"],
    tags: ["에임", "조준", "반응속도", "클릭"],
    modes: ["single"],
    inputMethods: ["mouse", "touch"],
    minPlayers: 1,
    maxPlayers: 1,
    thumbnail: "/games/aim-test/thumbnail.svg",
    accent: "#6366f1",
    estimatedRoundSeconds: 30,
    difficulty: {
      levels: [
        {
          id: "normal",
          label: "보통",
        },
        {
          id: "hard",
          label: "어려움",
        },
      ],
      defaultLevelId: "normal",
    },
    supportsReplay: false,
    policy: {
      score: {
        unit: "ms",
        direction: "asc",
        min: 500,
        max: 60000,
        displaySuffix: " ms",
      },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
  },
  {
    slug: "memory-test",
    owner: {
      type: "SYSTEM",
    },
    title: "순서 기억력 테스트",
    shortDescription: "깜빡이는 색상 순서를 기억하고 순서대로 똑같이 누르세요!",
    description:
      "점점 길어지는 패턴을 완벽히 기억해보세요. 당신의 단기 기억력 한계는 어디까지일까요?",
    status: "published",
    categories: ["brain", "popular"],
    tags: ["기억력", "두뇌", "패턴", "패밀리"],
    modes: ["single"],
    inputMethods: ["mouse", "touch"],
    minPlayers: 1,
    maxPlayers: 1,
    thumbnail: "/games/memory-test/thumbnail.svg",
    accent: "#10b981",
    estimatedRoundSeconds: 45,
    supportsReplay: false,
    policy: {
      score: {
        unit: "Level",
        direction: "desc",
        min: 1,
        max: 50,
        displayPrefix: "Level ",
      },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
  },
  {
    slug: "reaction-time",
    owner: {
      type: "SYSTEM",
    },
    title: "반응속도 테스트",
    shortDescription: "화면이 바뀌면 최대한 빨리 클릭하세요!",
    description:
      "초록색 화면이 나타나는 순간 최대한 빨리 클릭하세요. 당신의 반응속도를 측정합니다.",
    status: "published",
    categories: ["reaction", "popular"],
    tags: ["반응속도", "클릭", "타이밍"],
    modes: ["single"],
    inputMethods: ["mouse", "touch"],
    minPlayers: 1,
    maxPlayers: 1,
    thumbnail: "/games/reaction-time/thumbnail.svg",
    accent: "#22c55e",
    estimatedRoundSeconds: 30,
    supportsReplay: false,
    policy: {
      score: {
        unit: "ms",
        direction: "asc",
        min: 50,
        max: 10000,
        displaySuffix: " ms",
      },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
  },
  {
    slug: "typing-test",
    owner: {
      type: "SYSTEM",
    },
    title: "타자 속도 테스트",
    shortDescription:
      "60초 동안 정해진 문장을 빠르고 정확하게 입력하여 WPM(분당 단어 수)과 정확도를 측정하세요!",
    description:
      "영문 단어를 입력하며 자신의 타자 속도(WPM)와 분당 타수(CPM), 정확도를 측정해보세요. 정교한 타자 타이핑 실력에 도전하세요.",
    status: "published",
    categories: ["typing", "brain", "popular"],
    tags: ["타자", "WPM", "속도", "순발력", "두뇌"],
    modes: ["single"],
    inputMethods: ["keyboard"],
    minPlayers: 1,
    maxPlayers: 1,
    thumbnail: "/games/typing-test/thumbnail.svg",
    accent: "#3b82f6",
    estimatedRoundSeconds: 60,
    supportsReplay: false,
    policy: {
      score: {
        unit: "WPM",
        direction: "desc",
        min: 0,
        max: 300,
        displaySuffix: " WPM",
      },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
  },
];

export const GAME_DEFINITION_MAP: Record<string, GameDefinition> = {
  "aim-test": {
    slug: "aim-test",
    owner: {
      type: "SYSTEM",
    },
    title: "에임 테스트",
    shortDescription: "화면에 나타나는 타겟을 빠른 속도로 조준하고 클릭하세요!",
    description:
      "무작위로 생성되는 31개의 타겟을 정확하고 빠르게 조준하여 클릭하세요. 반응 속도와 정확도를 측정합니다.",
    status: "published",
    categories: ["aim", "reaction", "popular"],
    tags: ["에임", "조준", "반응속도", "클릭"],
    modes: ["single"],
    inputMethods: ["mouse", "touch"],
    minPlayers: 1,
    maxPlayers: 1,
    thumbnail: "/games/aim-test/thumbnail.svg",
    accent: "#6366f1",
    estimatedRoundSeconds: 30,
    difficulty: {
      levels: [
        {
          id: "normal",
          label: "보통",
        },
        {
          id: "hard",
          label: "어려움",
        },
      ],
      defaultLevelId: "normal",
    },
    supportsReplay: false,
    policy: {
      score: {
        unit: "ms",
        direction: "asc",
        min: 500,
        max: 60000,
        displaySuffix: " ms",
      },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
  },
  "memory-test": {
    slug: "memory-test",
    owner: {
      type: "SYSTEM",
    },
    title: "순서 기억력 테스트",
    shortDescription: "깜빡이는 색상 순서를 기억하고 순서대로 똑같이 누르세요!",
    description:
      "점점 길어지는 패턴을 완벽히 기억해보세요. 당신의 단기 기억력 한계는 어디까지일까요?",
    status: "published",
    categories: ["brain", "popular"],
    tags: ["기억력", "두뇌", "패턴", "패밀리"],
    modes: ["single"],
    inputMethods: ["mouse", "touch"],
    minPlayers: 1,
    maxPlayers: 1,
    thumbnail: "/games/memory-test/thumbnail.svg",
    accent: "#10b981",
    estimatedRoundSeconds: 45,
    supportsReplay: false,
    policy: {
      score: {
        unit: "Level",
        direction: "desc",
        min: 1,
        max: 50,
        displayPrefix: "Level ",
      },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
  },
  "reaction-time": {
    slug: "reaction-time",
    owner: {
      type: "SYSTEM",
    },
    title: "반응속도 테스트",
    shortDescription: "화면이 바뀌면 최대한 빨리 클릭하세요!",
    description:
      "초록색 화면이 나타나는 순간 최대한 빨리 클릭하세요. 당신의 반응속도를 측정합니다.",
    status: "published",
    categories: ["reaction", "popular"],
    tags: ["반응속도", "클릭", "타이밍"],
    modes: ["single"],
    inputMethods: ["mouse", "touch"],
    minPlayers: 1,
    maxPlayers: 1,
    thumbnail: "/games/reaction-time/thumbnail.svg",
    accent: "#22c55e",
    estimatedRoundSeconds: 30,
    supportsReplay: false,
    policy: {
      score: {
        unit: "ms",
        direction: "asc",
        min: 50,
        max: 10000,
        displaySuffix: " ms",
      },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
  },
  "typing-test": {
    slug: "typing-test",
    owner: {
      type: "SYSTEM",
    },
    title: "타자 속도 테스트",
    shortDescription:
      "60초 동안 정해진 문장을 빠르고 정확하게 입력하여 WPM(분당 단어 수)과 정확도를 측정하세요!",
    description:
      "영문 단어를 입력하며 자신의 타자 속도(WPM)와 분당 타수(CPM), 정확도를 측정해보세요. 정교한 타자 타이핑 실력에 도전하세요.",
    status: "published",
    categories: ["typing", "brain", "popular"],
    tags: ["타자", "WPM", "속도", "순발력", "두뇌"],
    modes: ["single"],
    inputMethods: ["keyboard"],
    minPlayers: 1,
    maxPlayers: 1,
    thumbnail: "/games/typing-test/thumbnail.svg",
    accent: "#3b82f6",
    estimatedRoundSeconds: 60,
    supportsReplay: false,
    policy: {
      score: {
        unit: "WPM",
        direction: "desc",
        min: 0,
        max: 300,
        displaySuffix: " WPM",
      },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
  },
};
