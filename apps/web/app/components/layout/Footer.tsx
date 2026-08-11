import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="w-full border-t border-border/30 bg-surface mt-auto">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link to="/" className="font-bold text-lg tracking-tight">
              game<span className="text-brand">moa</span>
            </Link>
            <p className="text-sm text-text-muted">
              &copy; {new Date().getFullYear()} gamemoa. All rights reserved.
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              GitHub
            </a>
            <Link to="/terms" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              이용약관
            </Link>
            <Link to="/privacy" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
