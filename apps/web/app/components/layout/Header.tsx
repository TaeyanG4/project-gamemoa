import { Link, useNavigate } from "react-router";
import { Search, Menu, Bookmark, User, Command, LogOut, Trophy } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "../../features/auth";
import { useI18n } from "../../features/i18n/I18nContext";
import { LanguageSelector } from "../ui/LanguageSelector";
import { OwoWordmarkIcon } from "../ui/OwoWordmarkIcon";
import { useClickOutside } from "../../hooks/useClickOutside";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, openLoginModal, logout } = useAuth();
  const { dict } = useI18n();
  const userDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(userDropdownRef, () => setShowUserDropdown(false), showUserDropdown);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/games?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-surface/90 border-b border-border/80 transition-all select-none">
      <div className="w-full px-4 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer"
            onClick={onToggleMobileSidebar}
            aria-label={dict.sidebar.openMenuAria}
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link to="/" className="flex items-center gap-2 group">
            <OwoWordmarkIcon className="h-9 w-9 group-hover:scale-105 transition-transform duration-200" />
            <span className="font-extrabold text-xl tracking-tight text-text-primary">
              OwO
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-light to-accent-purple">
                GG
              </span>
            </span>
          </Link>
        </div>

        {/* Center: Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-md hidden sm:flex items-center relative"
        >
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={dict.nav.searchPlaceholder}
            className="w-full bg-surface-raised text-text-primary placeholder:text-text-muted text-sm rounded-full pl-10 pr-12 py-2 border border-border/80 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all shadow-inner"
          />
          <div className="absolute right-3 flex items-center gap-1 text-[10px] font-bold text-text-muted px-1.5 py-0.5 rounded bg-surface border border-border pointer-events-none">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </form>

        {/* Right: Quick Actions & Auth */}
        <div className="flex items-center gap-2.5">
          {/* Search is a full input on sm+ (above); below that there's no room for it, so this
              icon links to /games where the search input lives instead of hiding search entirely. */}
          <Link
            to="/games"
            className="sm:hidden p-2.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer"
            title={dict.nav.searchPlaceholder}
            aria-label={dict.nav.searchPlaceholder}
          >
            <Search className="w-5 h-5" />
          </Link>

          <Link
            to="/games?category=favorites"
            className="p-2.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors relative cursor-pointer"
            title={dict.nav.favorites}
          >
            <Bookmark className="w-5 h-5" />
          </Link>

          <LanguageSelector />

          {isAuthenticated && user ? (
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 pl-3 rounded-full bg-surface-raised border border-border hover:border-brand/50 transition-all cursor-pointer shadow-sm"
              >
                <span className="text-xs font-bold text-text-primary max-w-[100px] truncate hidden md:inline">
                  {user.nickname}
                </span>
                <div className="w-7 h-7 rounded-full bg-brand text-white font-black text-xs flex items-center justify-center overflow-hidden border border-brand/40">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.nickname.slice(0, 2)
                  )}
                </div>
              </button>

              {/* User Dropdown Menu */}
              {showUserDropdown && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-surface-raised border border-border rounded-2xl shadow-2xl py-2 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setShowUserDropdown(false)}
                >
                  <div className="px-4 py-3 border-b border-border/60">
                    <p className="text-xs font-bold text-text-primary truncate">{user.nickname}</p>
                    <p className="text-[11px] text-text-muted truncate">{user.email}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {user.providers.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand/10 text-brand border border-brand/20 capitalize"
                        >
                          {p}
                          {dict.nav.accountSuffix}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-overlay transition-colors"
                  >
                    <User className="w-4 h-4 text-brand-light" />
                    <span>{dict.nav.myProfile}</span>
                  </Link>

                  <Link
                    to="/ranking"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-overlay transition-colors"
                  >
                    <Trophy className="w-4 h-4 text-accent-yellow" />
                    <span>{dict.nav.ranking}</span>
                  </Link>

                  <button
                    onClick={() => {
                      void logout();
                      setShowUserDropdown(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-accent-red hover:bg-accent-red/10 transition-colors w-full text-left border-t border-border/40 mt-1 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{dict.nav.logout}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-full hover:shadow-lg hover:shadow-brand/30 hover:scale-105 transition-all cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>{dict.nav.login}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
