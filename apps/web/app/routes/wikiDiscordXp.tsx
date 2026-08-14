import { Link } from "react-router";
import { WikiLayout, WikiCallout } from "../components/wiki/WikiLayout";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "서버 XP | OwOGG Wiki" },
    { name: "description", content: "OwOGG 글로벌 XP와 Discord 서버별 XP의 차이" },
  ];
}

export default function WikiDiscordXpRoute() {
  const { dict } = useI18n();
  const t = dict.wikiBody.discordXp;

  return (
    <WikiLayout eyebrow="DISCORD" title={t.title} description={t.description}>
      <section>
        <h2 className="text-lg font-black text-text-primary">{t.differHeading}</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
          <li>
            <b className="text-text-primary">{t.globalTerm}</b>
            {t.globalDesc}
          </li>
          <li>
            <b className="text-text-primary">{t.perGuildTerm}</b>
            {t.perGuildDescPrefix}
            <code className="rounded bg-surface px-1 py-0.5 text-xs font-mono">
              {t.perGuildDescCode}
            </code>
            {t.perGuildDescSuffix}
          </li>
          <li>
            <b className="text-text-primary">{t.guildActivityTerm}</b>
            {t.guildActivityDesc}
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">{t.exampleHeading}</h2>
        <p className="mt-2 text-sm text-text-secondary">
          {t.exampleBodyPrefix}
          <code className="rounded bg-surface px-1 py-0.5 text-xs font-mono">
            {t.exampleBodyCode}
          </code>
          {t.exampleBodySuffix}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <XpCard
            title={t.cardGlobalTitle}
            value="25,000 → 25,010"
            text={t.cardGlobalText}
            tone="indigo"
          />
          <XpCard title={t.cardGuildATitle} value="0 → 10" text={t.cardGuildAText} tone="amber" />
          <XpCard title={t.cardGuildBTitle} value="0" text={t.cardGuildBText} tone="slate" />
        </div>
      </section>

      <WikiCallout>
        <b className="text-text-primary">{t.calloutNoCopyStrong}</b>
        {t.calloutNoCopyBody}
      </WikiCallout>

      <WikiCallout tone="warning">
        <b className="text-text-primary">{t.calloutAbuseStrong}</b>
        {t.calloutAbuseBody}
      </WikiCallout>

      <p className="text-xs text-text-muted">
        {t.footerPrefix}
        <Link to="/wiki/games/ranking" className="font-bold text-brand-light hover:underline">
          {t.footerLink}
        </Link>
        {t.footerSuffix}
      </p>
    </WikiLayout>
  );
}

function XpCard({
  title,
  value,
  text,
  tone,
}: {
  title: string;
  value: string;
  text: string;
  tone: "indigo" | "amber" | "slate";
}) {
  const classes = {
    indigo: "border-indigo-400/20 bg-indigo-500/10 text-indigo-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    slate: "border-white/10 bg-slate-900/50 text-slate-200",
  };
  return (
    <div className={`rounded-xl border p-4 ${classes[tone]}`}>
      <p className="text-xs font-bold">{title}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
      <p className="mt-1 text-[11px] opacity-70">{text}</p>
    </div>
  );
}
