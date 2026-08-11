import { Link } from "react-router";
import { Search, Menu, X, Gamepad2 } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-surface/80 border-b border-border/50 transition-all">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <Gamepad2 className="w-6 h-6 text-brand transition-transform group-hover:-translate-y-1" />
            <span className="font-bold text-xl tracking-tight">
              game<span className="text-brand">moa</span>
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/games" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              게임
            </Link>
            <Link to="/ranking" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              랭킹
            </Link>
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <button className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer">
            <Search className="w-5 h-5" />
          </button>
          <button className="px-4 py-2 text-sm font-semibold text-brand border border-brand/50 rounded-full hover:bg-brand/10 transition-colors cursor-pointer">
            로그인
          </button>
        </div>

        <button 
          className="md:hidden p-2 text-text-secondary cursor-pointer"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-surface">
          <nav className="flex flex-col p-4 gap-4">
            <Link 
              to="/games" 
              className="px-4 py-3 text-sm font-medium rounded-lg hover:bg-surface-raised transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              게임
            </Link>
            <Link 
              to="/ranking" 
              className="px-4 py-3 text-sm font-medium rounded-lg hover:bg-surface-raised transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              랭킹
            </Link>
            <button className="mt-4 px-4 py-3 text-sm font-semibold text-center text-brand border border-brand/50 rounded-lg hover:bg-brand/10 transition-colors cursor-pointer">
              로그인
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
