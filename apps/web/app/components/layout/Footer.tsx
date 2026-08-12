import { Link } from "react-router";
import { Gamepad2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-surface-sidebar mt-auto select-none">
      {/* Main Footer Info */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link to="/" className="flex items-center gap-2 group">
            <Gamepad2 className="w-5 h-5 text-brand" />
            <span className="font-bold text-lg tracking-tight text-text-primary">
              game<span className="text-brand">moa</span>
            </span>
          </Link>
          <p className="text-xs text-text-muted">설치 없이, 1초 만에 즐기는 미니게임</p>
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} gamemoa. All rights reserved.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-text-secondary">
          <a
            href="https://github.com/TaeyanG4/project-gamemoa"
            target="_blank"
            rel="noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            GitHub Repo
          </a>
          <Link to="/games" className="hover:text-text-primary transition-colors">
            전체 게임 목록
          </Link>
          <Link to="/ranking" className="hover:text-text-primary transition-colors">
            명예의 전당
          </Link>
        </div>
      </div>
    </footer>
  );
}
