import { Link } from "react-router";
import { WikiLayout } from "../components/wiki/WikiLayout";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "게임과 랭킹 | OwOGG Wiki" },
    { name: "description", content: "OwOGG 게임 카탈로그, 랭킹, XP 개요" },
  ];
}

export default function WikiGamesRoute() {
  const { dict } = useI18n();
  const t = dict.wikiBody.games;

  return (
    <WikiLayout eyebrow="GAMES" title={t.title} description={t.description}>
      <p>{t.intro}</p>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/wiki/games/ranking"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">{t.cardRanking}</p>
          <p className="mt-1 text-xs text-text-muted">{t.cardRankingDesc}</p>
        </Link>
        <Link
          to="/wiki/games/xp"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">{t.cardXp}</p>
          <p className="mt-1 text-xs text-text-muted">{t.cardXpDesc}</p>
        </Link>
      </section>

      <p className="text-xs text-text-muted">
        {t.footerPrefix}
        <Link to="/games" className="font-bold text-brand-light hover:underline">
          {t.footerLink}
        </Link>
        {t.footerSuffix}
      </p>
    </WikiLayout>
  );
}
