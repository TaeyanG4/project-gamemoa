import { Link, useNavigate } from "react-router";
import { Search, Menu, Gamepad2, Bookmark, User, Command } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/games?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-surface/90 border-b border-border/80 transition-all select-none">
      <div className="w-full px-4 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-3">
          <button 
            className="lg:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer"
            onClick={onToggleMobileSidebar}
            aria-label="메뉴 열기"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-brand to-accent-purple shadow-md shadow-brand/20 group-hover:scale-105 transition-transform duration-200">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-text-primary">
              game<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-light to-accent-purple">moa</span>
            </span>
          </Link>
        </div>

        {/* Center: Search Bar (CrazyGames Style) */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden sm:flex items-center relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="게임명, 태그 또는 카테고리 검색..."
            className="w-full bg-surface-raised text-text-primary placeholder:text-text-muted text-sm rounded-full pl-10 pr-12 py-2 border border-border/80 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all shadow-inner"
          />
          <div className="absolute right-3 flex items-center gap-1 text-[10px] font-bold text-text-muted px-1.5 py-0.5 rounded bg-surface border border-border pointer-events-none">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </form>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/games?category=favorites"
            className="p-2.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors relative cursor-pointer"
            title="즐겨찾기"
          >
            <Bookmark className="w-5 h-5" />
          </Link>

          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-full hover:shadow-lg hover:shadow-brand/30 hover:scale-105 transition-all cursor-pointer">
            <User className="w-4 h-4" />
            <span>로그인</span>
          </button>
        </div>
      </div>
    </header>
  );
}
