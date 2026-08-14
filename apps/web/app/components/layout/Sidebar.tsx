import { Link, useLocation } from "react-router";
import { Home, Gamepad2, Zap, Trophy, Flame, Compass, X } from "lucide-react";
import { useI18n } from "../../features/i18n/I18nContext";

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { dict } = useI18n();

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
      <aside className="hidden lg:flex flex-col w-16 hover:w-56 transition-all duration-300 ease-in-out bg-surface-sidebar border-r border-border h-[calc(100vh-4rem)] sticky top-16 z-30 group shadow-2xl overflow-hidden shrink-0 select-none">
        <div className="flex flex-col justify-between h-full p-2">
          {/* Main Nav */}
          <div className="flex flex-col gap-1.5">
            <div className="px-3 py-2 text-[11px] font-bold text-text-muted uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              {dict.sidebar.navHeading}
            </div>

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

          {/* Quick Info Shelf at Bottom of Sidebar */}
          <div className="p-2 border-t border-border/50 flex flex-col gap-2">
            <div className="flex items-center gap-3 px-2 py-1.5 text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              <Compass className="w-4 h-4 text-brand-light" />
              <span>{dict.sidebar.tagline}</span>
            </div>
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
          </div>
        </div>
      )}
    </>
  );
}
