import { Link, useLocation } from "react-router";
import { Home, Gamepad2, Zap, Trophy, Flame, X, Bookmark, Check } from "lucide-react";
import { SUPPORTED_LOCALES } from "@owogg/core";
import { useI18n } from "../../features/i18n/I18nContext";
import { DiscordIcon } from "../ui/DiscordIcon";
import { NATIVE_LABELS } from "../ui/LanguageSelector";

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { dict, locale, setLocale } = useI18n();

  const navItems = [
    { label: dict.sidebar.home, path: "/", icon: Home, badge: "HOT" },
    { label: dict.sidebar.allGames, path: "/games", icon: Gamepad2 },
    { label: dict.sidebar.popularGames, path: "/games?category=popular", icon: Flame },
    {
      label: dict.sidebar.reactionBrain,
      path: "/games?category=reaction",
      icon: Zap,
      badge: "NEW",
    },
    { label: dict.sidebar.rankingRecords, path: "/ranking", icon: Trophy },
  ];

  return (
    <>
      {/* Desktop Sidebar (CrazyGames style: compact w-16 or expanded w-56) */}
      {/* z-30: strictly below Header's z-40. Both are `sticky` and Header is h-16 (Sidebar's
          `top-16` sticky offset matches exactly), so they shouldn't normally overlap — but
          they previously shared the same z-40, meaning any transient overlap (e.g. mid-scroll,
          or the sidebar's own shadow-2xl bleeding upward) let the sidebar's later DOM position
          paint over the header instead of under it, hiding the logo. Header must always win. */}
      {/* The <aside> itself stretches to the full height of the content row (default flex
          `align-items: stretch`, no fixed height) so its background and right border run
          unbroken all the way down to the footer. Only the inner panel is sticky/viewport-
          tall — previously the aside itself was both sticky AND h-[calc(100vh-4rem)], so on
          pages taller than the viewport its background simply stopped mid-page, leaving a
          visible horizontal seam with the page background showing through below it. */}
      <aside className="hidden lg:block w-16 hover:w-56 transition-all duration-300 ease-in-out bg-surface-sidebar border-r border-border z-30 group shadow-2xl overflow-hidden shrink-0 select-none">
        <div className="sticky top-16 flex flex-col h-[calc(100vh-4rem)] p-2">
          {/* Main Nav — no heading above it (used to be a "탐색 메뉴" label here, which just
              pushed Home down by its own height even while collapsed) so the first item sits
              right at the top. */}
          <div className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentPath === item.path ||
                (item.path !== "/" && currentPath.startsWith(item.path));

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group/btn relative ${
                    isActive
                      ? "bg-brand text-white font-bold shadow-lg shadow-brand/25"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform group-hover/btn:scale-110 ${isActive ? "text-white" : "text-brand-light"}`}
                  />

                  <span className="text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
                    {item.label}
                  </span>

                  {item.badge && (
                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-accent-red text-white uppercase tracking-wider">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onMobileClose} />

          <div className="relative flex flex-col w-72 max-w-[80vw] bg-surface-sidebar border-r border-border h-full p-4 z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-6 h-6 text-brand" />
                <span className="font-bold text-lg text-text-primary">
                  {dict.sidebar.mobileMenuTitle}
                </span>
              </div>
              <button
                onClick={onMobileClose}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;

                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={onMobileClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive
                        ? "bg-brand text-white font-bold"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-base font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded bg-accent-red text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Secondary actions — favorites, Discord servers, language. These stay out of the
                header's icon row on narrow phones (Header.tsx's "growth rule" comment explains
                why) and live here instead, so they're always one hamburger-tap away rather than
                fighting the header for a width that phones don't have. */}
            <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
              <p className="px-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                {dict.sidebar.moreHeading}
              </p>

              <Link
                to="/games?category=favorites"
                onClick={onMobileClose}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
              >
                <Bookmark className="w-5 h-5" />
                <span className="text-base font-medium">{dict.sidebar.favorites}</span>
              </Link>

              <Link
                to="/discord/servers"
                onClick={onMobileClose}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
              >
                <DiscordIcon className="w-5 h-5" />
                <span className="text-base font-medium">{dict.sidebar.discordServers}</span>
              </Link>

              <div className="px-4 py-1">
                <div className="flex flex-wrap gap-1.5">
                  {SUPPORTED_LOCALES.map((l) => {
                    const active = l === locale;
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLocale(l)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                          active
                            ? "bg-brand/10 text-brand-light border border-brand/30"
                            : "text-text-secondary border border-border hover:text-text-primary hover:bg-surface-raised"
                        }`}
                      >
                        {active && <Check className="w-3 h-3" aria-hidden="true" />}
                        {NATIVE_LABELS[l]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
