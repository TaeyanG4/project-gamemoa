import { Sparkles, Wrench, Bug, ScrollText } from "lucide-react";
import { useI18n } from "../features/i18n/I18nContext";
import { CHANGELOG_ENTRIES, type ChangelogTag } from "../features/changelog/entries";

export function meta() {
  return [
    { title: "업데이트 로그 | OwOGG" },
    { name: "description", content: "OwOGG의 변경 사항과 공지를 확인하세요." },
  ];
}

const TAG_ICON: Record<ChangelogTag, typeof Sparkles> = {
  feature: Sparkles,
  improvement: Wrench,
  fix: Bug,
};

const TAG_TONE: Record<ChangelogTag, string> = {
  feature: "text-brand-light bg-brand/10 border-brand/30",
  improvement: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  fix: "text-rose-300 bg-rose-500/10 border-rose-500/30",
};

export default function ChangelogRoute() {
  const { dict } = useI18n();
  const t = dict.changelog;

  const tagLabel: Record<ChangelogTag, string> = {
    feature: t.tagFeature,
    improvement: t.tagImprovement,
    fix: t.tagFix,
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
      <header className="mb-10">
        <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider mb-2">
          <ScrollText className="w-4 h-4" />
          <span>{t.eyebrow}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-text-primary">{t.title}</h1>
        <p className="text-sm text-text-secondary mt-2">{t.subtitle}</p>
      </header>

      {CHANGELOG_ENTRIES.length === 0 ? (
        <div className="py-16 text-center text-text-muted bg-surface-raised rounded-3xl border border-border border-dashed">
          {t.emptyState}
        </div>
      ) : (
        <ol className="relative space-y-8 border-l border-border/60 pl-6">
          {CHANGELOG_ENTRIES.map((entry) => {
            const Icon = TAG_ICON[entry.tag];
            return (
              <li key={`${entry.date}-${entry.title}`} className="relative">
                <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-brand shadow-[0_0_0_4px_rgba(0,0,0,0)]" />
                <time className="text-xs font-bold text-text-muted">{entry.date}</time>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${TAG_TONE[entry.tag]}`}
                  >
                    <Icon className="h-3 w-3" />
                    {tagLabel[entry.tag]}
                  </span>
                  <h2 className="text-base font-black text-text-primary">{entry.title}</h2>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  {entry.description}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
