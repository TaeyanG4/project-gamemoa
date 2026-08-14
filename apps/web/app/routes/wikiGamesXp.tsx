import { Link } from "react-router";
import { WikiLayout, WikiCallout } from "../components/wiki/WikiLayout";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "XP와 레벨 | OwOGG Wiki" },
    { name: "description", content: "OwOGG 경험치 지급 방식과 레벨 공식" },
  ];
}

export default function WikiGamesXpRoute() {
  const { dict } = useI18n();
  const t = dict.wikiBody.gamesXp;

  return (
    <WikiLayout eyebrow="GAMES" title={t.title} description={t.description}>
      <section>
        <h2 className="text-lg font-black text-text-primary">{t.grantHeading}</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
          <li>{t.grantPerPlay}</li>
          <li>{t.grantDailyCap}</li>
          <li>{t.grantAfterCap}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">{t.formulaHeading}</h2>
        <p className="mt-2 text-sm text-text-secondary">
          {t.formulaPrefix}
          <code className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono">100 × (L − 1)²</code>
          {t.formulaSuffix}
        </p>
      </section>

      <WikiCallout>
        {t.calloutPrefix}
        <Link to="/wiki/discord/xp" className="font-bold text-brand-light hover:underline">
          {t.calloutLink}
        </Link>
        {t.calloutSuffix}
      </WikiCallout>

      <p className="text-xs text-text-muted">
        {t.footerPrefix}
        <Link to="/profile" className="font-bold text-brand-light hover:underline">
          {t.footerProfileLink}
        </Link>
        {t.footerMid}
        <Link to="/ranking" className="font-bold text-brand-light hover:underline">
          {t.footerRankingLink}
        </Link>
        {t.footerSuffix}
      </p>
    </WikiLayout>
  );
}
