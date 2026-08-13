import type { Dictionary } from "../i18n/dictionary";

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
 * most incoming users need help with (install/onboarding). Locale-aware: built from the active
 * dictionary rather than a static Korean-only list. */
export function buildWikiSections(dict: Dictionary["wiki"]): WikiNavSection[] {
  return [
    {
      title: dict.navGettingStarted,
      items: [{ path: "/wiki/getting-started", label: dict.navGettingStarted }],
    },
    {
      title: "Discord",
      items: [
        { path: "/wiki/discord", label: dict.navDiscordOverview },
        { path: "/wiki/discord/install", label: dict.navDiscordInstall },
        { path: "/wiki/discord/account-link", label: dict.navDiscordAccountLink },
        { path: "/wiki/discord/server-registration", label: dict.navDiscordServerRegistration },
        { path: "/wiki/discord/commands", label: dict.navDiscordCommands },
        { path: "/wiki/discord/xp", label: dict.navDiscordXp },
        { path: "/wiki/discord/troubleshooting", label: dict.navDiscordTroubleshooting },
      ],
    },
    {
      title: dict.navAccount,
      items: [
        { path: "/wiki/account", label: dict.navAccountOverview },
        { path: "/wiki/account/merge", label: dict.navAccountMerge },
      ],
    },
    {
      title: dict.navGamesRanking,
      items: [
        { path: "/wiki/games", label: dict.navGamesOverview },
        { path: "/wiki/games/ranking", label: dict.navRanking },
        { path: "/wiki/games/xp", label: dict.navGamesXp },
      ],
    },
    {
      title: "Creator",
      items: [
        { path: "/wiki/creator", label: dict.navCreatorOverview },
        { path: "/wiki/creator/verification", label: dict.navCreatorVerification },
        { path: "/wiki/creator/featured", label: dict.navCreatorFeatured },
      ],
    },
  ];
}

export function findAdjacentWikiPages(
  sections: WikiNavSection[],
  currentPath: string,
): {
  prev: WikiNavItem | null;
  next: WikiNavItem | null;
} {
  const flatItems = sections.flatMap((s) => s.items);
  const index = flatItems.findIndex((item) => item.path === currentPath);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? (flatItems[index - 1] ?? null) : null,
    next: index < flatItems.length - 1 ? (flatItems[index + 1] ?? null) : null,
  };
}
