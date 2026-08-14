import { Link } from "react-router";
import { WikiLayout, WikiCallout, WikiSteps } from "../components/wiki/WikiLayout";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "Discord | OwOGG Wiki" },
    { name: "description", content: "OwOGG Discord 연동 개요" },
  ];
}

export default function WikiDiscordRoute() {
  const { dict } = useI18n();
  const t = dict.wikiBody.discordOverview;

  return (
    <WikiLayout eyebrow="DISCORD" title={t.title} description={t.description}>
      <WikiCallout>
        <b className="text-text-primary">{t.calloutStrong}</b>
        {t.calloutBody}
      </WikiCallout>

      <section>
        <h2 className="text-lg font-black text-text-primary">{t.flowHeading}</h2>
        <div className="mt-3">
          <WikiSteps steps={[t.step1, t.step2, t.step3, t.step4, t.step5]} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/wiki/discord/install"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">{t.cardInstall}</p>
          <p className="mt-1 text-xs text-text-muted">{t.cardInstallDesc}</p>
        </Link>
        <Link
          to="/wiki/discord/server-registration"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">{t.cardServerReg}</p>
          <p className="mt-1 text-xs text-text-muted">{t.cardServerRegDesc}</p>
        </Link>
        <Link
          to="/wiki/discord/commands"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">{t.cardCommands}</p>
          <p className="mt-1 text-xs text-text-muted">{t.cardCommandsDesc}</p>
        </Link>
        <Link
          to="/wiki/discord/troubleshooting"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">{t.cardTroubleshooting}</p>
          <p className="mt-1 text-xs text-text-muted">{t.cardTroubleshootingDesc}</p>
        </Link>
      </section>

      <p className="text-xs text-text-muted">
        {t.footerPrefix}
        <Link to="/discord/setup" className="font-bold text-brand-light hover:underline">
          {t.footerLink}
        </Link>
        {t.footerSuffix}
      </p>
    </WikiLayout>
  );
}
