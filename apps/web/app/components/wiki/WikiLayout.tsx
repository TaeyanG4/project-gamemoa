import { Link, useLocation } from "react-router";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { buildWikiSections, findAdjacentWikiPages } from "../../features/wiki/navigation";
import { useI18n } from "../../features/i18n/I18nContext";

/** Shared shell for every /wiki/* page — sidebar table of contents (current page highlighted),
 * title/description header, and prev/next footer navigation. Deliberately plain React
 * components and routes, no CMS/markdown framework. */
export function WikiLayout({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  const { dict } = useI18n();
  const location = useLocation();
  const currentPath = location.pathname;
  const wikiSections = buildWikiSections(dict.wiki);
  const { prev, next } = findAdjacentWikiPages(wikiSections, currentPath);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center gap-2 text-xs font-bold text-text-muted">
        <Link to="/wiki" className="flex items-center gap-1.5 hover:text-brand-light">
          <BookOpen className="h-3.5 w-3.5" /> OwOGG Wiki
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav
          aria-label={dict.wiki.tocAriaLabel}
          className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:block lg:space-y-6 lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {wikiSections.map((section) => (
            <div key={section.title} className="shrink-0 lg:shrink">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-text-muted">
                {section.title}
              </p>
              <ul className="flex gap-1.5 lg:flex-col lg:gap-1">
                {section.items.map((item) => {
                  const active = item.path === currentPath;
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`block whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? "bg-brand/15 text-brand-light"
                            : "text-text-muted hover:bg-surface-raised hover:text-text-primary"
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="min-w-0 space-y-8">
          <header>
            {eyebrow && (
              <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-brand-light">
                {eyebrow}
              </p>
            )}
            <h1 className="text-2xl font-black tracking-tight text-text-primary md:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
                {description}
              </p>
            )}
          </header>

          <div className="space-y-6 text-sm leading-relaxed text-text-secondary">{children}</div>

          {(prev || next) && (
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              {prev ? (
                <Link
                  to={prev.path}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-brand-light"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> {prev.label}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  to={next.path}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-brand-light"
                >
                  {next.label} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}

export function WikiCallout({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const classes = {
    info: "border-brand/30 bg-brand/5 text-text-secondary",
    warning: "border-accent-yellow/30 bg-accent-yellow/5 text-text-secondary",
    success: "border-accent-green/30 bg-accent-green/5 text-text-secondary",
  };
  return (
    <div className={`rounded-2xl border p-4 text-sm leading-relaxed ${classes[tone]}`}>
      {children}
    </div>
  );
}

export function WikiSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-black text-brand-light">
            {i + 1}
          </span>
          <span className="pt-0.5 text-text-secondary">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function WikiFaqItem({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-border bg-surface-raised p-4">
      <summary className="cursor-pointer list-none text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand">
        {question}
      </summary>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{children}</p>
    </details>
  );
}
