export interface WikiNavItem {
  path: string;
  label: string;
}

export interface WikiNavSection {
  title: string;
  items: WikiNavItem[];
}

/** Single source of truth for the Wiki's information architecture — sidebar nav, breadcrumbs,
 * and prev/next links are all derived from this list. Discord is listed first since that's what
 * most incoming users need help with (install/onboarding). */
export const WIKI_SECTIONS: WikiNavSection[] = [
  {
    title: "시작하기",
    items: [{ path: "/wiki/getting-started", label: "시작하기" }],
  },
  {
    title: "Discord",
    items: [
      { path: "/wiki/discord", label: "Discord 개요" },
      { path: "/wiki/discord/install", label: "설치하기" },
      { path: "/wiki/discord/account-link", label: "계정 연결" },
      { path: "/wiki/discord/server-registration", label: "서버 등록" },
      { path: "/wiki/discord/commands", label: "명령어" },
      { path: "/wiki/discord/xp", label: "서버 XP" },
      { path: "/wiki/discord/troubleshooting", label: "문제 해결" },
    ],
  },
  {
    title: "계정",
    items: [
      { path: "/wiki/account", label: "계정 개요" },
      { path: "/wiki/account/merge", label: "계정 통합" },
    ],
  },
  {
    title: "게임과 랭킹",
    items: [
      { path: "/wiki/games", label: "게임 개요" },
      { path: "/wiki/games/ranking", label: "랭킹" },
      { path: "/wiki/games/xp", label: "XP와 레벨" },
    ],
  },
  {
    title: "Creator",
    items: [
      { path: "/wiki/creator", label: "Creator 개요" },
      { path: "/wiki/creator/verification", label: "채널 소유권 인증" },
      { path: "/wiki/creator/featured", label: "Featured Creator" },
    ],
  },
];

export const WIKI_FLAT_ITEMS: WikiNavItem[] = WIKI_SECTIONS.flatMap((s) => s.items);

export function findAdjacentWikiPages(currentPath: string): {
  prev: WikiNavItem | null;
  next: WikiNavItem | null;
} {
  const index = WIKI_FLAT_ITEMS.findIndex((item) => item.path === currentPath);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? (WIKI_FLAT_ITEMS[index - 1] ?? null) : null,
    next: index < WIKI_FLAT_ITEMS.length - 1 ? (WIKI_FLAT_ITEMS[index + 1] ?? null) : null,
  };
}
