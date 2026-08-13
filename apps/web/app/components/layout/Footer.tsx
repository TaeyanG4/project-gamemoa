import { Link } from "react-router";
import { Gamepad2 } from "lucide-react";
import { useI18n } from "../../features/i18n/I18nContext";

export function Footer() {
  const { dict } = useI18n();

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
          <p className="text-xs text-text-muted">{dict.footer.tagline}</p>
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} gamemoa. {dict.footer.rightsReserved}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-text-secondary">
          <a
            href="https://github.com/TaeyanG4/project-gamemoa"
            target="_blank"
            rel="noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            {dict.footer.githubRepo}
          </a>
          <Link to="/games" className="hover:text-text-primary transition-colors">
            {dict.footer.allGames}
          </Link>
          <Link to="/ranking" className="hover:text-text-primary transition-colors">
            {dict.footer.ranking}
          </Link>
          <Link to="/wiki" className="hover:text-text-primary transition-colors">
            {dict.footer.wiki}
          </Link>
          <Link to="/terms" className="hover:text-text-primary transition-colors">
            이용약관
          </Link>
          <Link to="/privacy" className="hover:text-text-primary transition-colors">
            개인정보처리방침
          </Link>
        </div>
      </div>
    </footer>
  );
}
