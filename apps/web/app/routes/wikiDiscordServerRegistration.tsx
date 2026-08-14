import { Link } from "react-router";
import { WikiLayout, WikiCallout, WikiSteps } from "../components/wiki/WikiLayout";
import { getDiscordRegisterAuthUrl } from "../features/discord/discordGuildApi";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "서버 등록 | OwOGG Wiki" },
    { name: "description", content: "Discord 서버를 OwOGG 커뮤니티로 등록하는 방법" },
  ];
}

export default function WikiDiscordServerRegistrationRoute() {
  const { dict } = useI18n();
  const t = dict.wikiBody.discordServerRegistration;

  return (
    <WikiLayout eyebrow="DISCORD" title={t.title} description={t.description}>
      <section>
        <h2 className="text-lg font-black text-text-primary">{t.requirementsHeading}</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
          <li>{t.req1}</li>
          <li>{t.req2}</li>
          <li>{t.req3}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">{t.stepsHeading}</h2>
        <div className="mt-3">
          <WikiSteps steps={[t.step1, t.step2, t.step3, t.step4, t.step5]} />
        </div>
        <a
          href={getDiscordRegisterAuthUrl()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light"
        >
          {t.buttonLabel}
        </a>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">{t.visibilityHeading}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="text-sm font-black text-emerald-300">PUBLIC</p>
            <p className="mt-1 text-xs text-text-muted">{t.visibilityPublicDesc}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-black text-amber-300">UNLISTED</p>
            <p className="mt-1 text-xs text-text-muted">{t.visibilityUnlistedDesc}</p>
          </div>
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
            <p className="text-sm font-black text-rose-300">PRIVATE</p>
            <p className="mt-1 text-xs text-text-muted">{t.visibilityPrivateDesc}</p>
          </div>
        </div>
      </section>

      <WikiCallout>
        <b className="text-text-primary">{t.calloutStrong}</b>
        {t.calloutBody}
      </WikiCallout>

      <p className="text-xs text-text-muted">
        {t.footerPrefix}
        <Link
          to="/wiki/discord/troubleshooting"
          className="font-bold text-brand-light hover:underline"
        >
          {t.footerLink}
        </Link>
        {t.footerSuffix}
      </p>
    </WikiLayout>
  );
}
