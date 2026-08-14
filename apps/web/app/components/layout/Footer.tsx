import { Link } from "react-router";
import { useI18n } from "../../features/i18n/I18nContext";
import { OwoWordmarkIcon } from "../ui/OwoWordmarkIcon";

export function Footer() {
  const { dict } = useI18n();

  return (
    <footer className="w-full border-t border-border bg-surface-sidebar mt-auto select-none">
      {/* Main Footer Info */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link to="/" className="flex items-center gap-1.5 group">
            <OwoWordmarkIcon className="h-7 w-7" />
            <span className="font-bold text-lg tracking-tight text-text-primary">
              OwO<span className="text-brand">GG</span>
            </span>
          </Link>
          <p className="text-xs text-text-muted">{dict.footer.tagline}</p>
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} OwOGG. {dict.footer.rightsReserved}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-text-secondary">
          <Link to="/games" className="hover:text-text-primary transition-colors">
            {dict.footer.allGames}
          </Link>
          <Link to="/ranking" className="hover:text-text-primary transition-colors">
            {dict.footer.ranking}
          </Link>
          <Link to="/wiki" className="hover:text-text-primary transition-colors">
            {dict.footer.wiki}
          </Link>
          <Link to="/changelog" className="hover:text-text-primary transition-colors">
            {dict.footer.changelog}
          </Link>
          <Link to="/terms" className="hover:text-text-primary transition-colors">
            {dict.legal.terms.pageTitle}
          </Link>
          <Link to="/privacy" className="hover:text-text-primary transition-colors">
            {dict.legal.privacy.pageTitle}
          </Link>
        </div>
      </div>
    </footer>
  );
}
