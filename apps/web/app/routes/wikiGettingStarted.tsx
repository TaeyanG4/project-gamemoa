import { Link } from "react-router";
import { WikiLayout, WikiCallout, WikiSteps } from "../components/wiki/WikiLayout";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "시작하기 | OwOGG Wiki" },
    { name: "description", content: "OwOGG 첫 게임 플레이와 기록 남기기 안내" },
  ];
}

export default function WikiGettingStartedRoute() {
  const { dict } = useI18n();
  const t = dict.wikiBody.gettingStarted;

  return (
    <WikiLayout eyebrow="GETTING STARTED" title={t.title} description={t.description}>
      <section>
        <h2 className="text-lg font-black text-text-primary">{t.flowHeading}</h2>
        <div className="mt-3">
          <WikiSteps steps={[t.step1, t.step2, t.step3, t.step4, t.step5]} />
        </div>
      </section>

      <WikiCallout>{t.calloutGuest}</WikiCallout>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/games"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">{t.cardCatalog}</p>
          <p className="mt-1 text-xs text-text-muted">{t.cardCatalogDesc}</p>
        </Link>
        <Link
          to="/ranking"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">{t.cardRanking}</p>
          <p className="mt-1 text-xs text-text-muted">{t.cardRankingDesc}</p>
        </Link>
      </section>

      <p className="text-xs text-text-muted">
        {t.footerPrefix}
        <Link to="/wiki/discord" className="font-bold text-brand-light hover:underline">
          {t.footerDiscordLink}
        </Link>
        {t.footerMid}
        <Link to="/wiki/account" className="font-bold text-brand-light hover:underline">
          {t.footerAccountLink}
        </Link>
        {t.footerSuffix}
      </p>
    </WikiLayout>
  );
}
