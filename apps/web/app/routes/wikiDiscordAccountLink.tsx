import { Link } from "react-router";
import { WikiLayout, WikiCallout, WikiSteps } from "../components/wiki/WikiLayout";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "Discord 계정 연결 | OwOGG Wiki" },
    { name: "description", content: "Discord 계정과 OwOGG 계정을 연결하는 방법" },
  ];
}

export default function WikiDiscordAccountLinkRoute() {
  const { dict } = useI18n();
  const t = dict.wikiBody.discordAccountLink;

  return (
    <WikiLayout eyebrow="DISCORD" title={t.title} description={t.description}>
      <section>
        <h2 className="text-lg font-black text-text-primary">{t.methodHeading}</h2>
        <div className="mt-3">
          <WikiSteps steps={[t.step1, t.step2, t.step3, t.step4, t.step5]} />
        </div>
      </section>

      <WikiCallout>
        {t.calloutPrefix}
        <code className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono">{t.calloutCode}</code>
        {t.calloutSuffix}
      </WikiCallout>

      <WikiCallout tone="warning">{t.calloutWarning}</WikiCallout>

      <p className="text-xs text-text-muted">
        {t.footerPrefix}
        <Link
          to="/wiki/discord/troubleshooting"
          className="font-bold text-brand-light hover:underline"
        >
          {t.footerLink1}
        </Link>
        {t.footerMid}
        <Link to="/discord/link" className="font-bold text-brand-light hover:underline">
          {t.footerLink2}
        </Link>
        {t.footerSuffix}
      </p>
    </WikiLayout>
  );
}
