import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  Gamepad2,
  Link2,
  Server,
  ShieldCheck,
  Trophy,
  Zap,
} from "lucide-react";
import { fetchDiscordBotStatusApi } from "../features/discord/api";
import { useI18n } from "../features/i18n/I18nContext";
import type { Dictionary } from "../features/i18n/dictionary";

export function meta() {
  return [
    { title: "Discord에서 GAMEMOA 사용하기 | GAMEMOA" },
    { name: "description", content: "Discord 서버에서 GAMEMOA 게임과 서버 XP를 사용하는 방법" },
  ];
}

function buildCommands(dict: Dictionary["discordGuide"]) {
  return [
    ["/gamemoa games", dict.commandGamesDesc],
    ["/gamemoa link", dict.commandLinkDesc],
    ["/gamemoa profile", dict.commandProfileDesc],
    ["/gamemoa play", dict.commandPlayDesc],
    ["/gamemoa rank", dict.commandRankDesc],
    ["/gamemoa leaderboard", dict.commandLeaderboardDesc],
    ["/gamemoa server", dict.commandServerDesc],
  ] as const;
}

export default function DiscordGuideRoute() {
  const { dict } = useI18n();
  const commands = buildCommands(dict.discordGuide);
  const [installUrl, setInstallUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchDiscordBotStatusApi()
      .then((status) => {
        if (active) setInstallUrl(status.installUrl ?? null);
      })
      .catch(() => {
        if (active) setInstallUrl(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-8">
      <header className="relative overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-7 shadow-2xl md:p-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">
            {dict.discordGuide.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
            {dict.discordGuide.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-indigo-100/80 md:text-base">
            {dict.discordGuide.heroSubtitle}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {installUrl ? (
              <a
                href={installUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-white"
              >
                {dict.discordGuide.installCta} <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-indigo-100">
                {dict.discordGuide.installLinkHint}
              </span>
            )}
            <Link
              to="/discord/servers"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
            >
              {dict.discordGuide.serverDirectoryCta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3" aria-label={dict.discordGuide.stepsAriaLabel}>
        <StepCard
          number="01"
          icon={<Server />}
          title={dict.discordGuide.step1Title}
          text={dict.discordGuide.step1Text}
        />
        <StepCard
          number="02"
          icon={<ShieldCheck />}
          title={dict.discordGuide.step2Title}
          text={dict.discordGuide.step2Text}
        />
        <StepCard
          number="03"
          icon={<Gamepad2 />}
          title={dict.discordGuide.step3Title}
          text={dict.discordGuide.step3Text}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <GuideCard
          icon={<Server className="h-5 w-5" />}
          eyebrow="SERVER"
          title={dict.discordGuide.installGuideTitle}
        >
          <p>{dict.discordGuide.installGuideP1}</p>
          <p className="mt-3">{dict.discordGuide.installGuideP2}</p>
          <p className="mt-3">{dict.discordGuide.installGuideP3}</p>
        </GuideCard>
        <GuideCard
          icon={<Link2 className="h-5 w-5" />}
          eyebrow="ACCOUNT"
          title={dict.discordGuide.accountGuideTitle}
        >
          <ol className="space-y-2 text-sm text-text-secondary">
            <li>
              <b className="text-text-primary">1.</b> {dict.discordGuide.accountStep1Prefix}{" "}
              <code>/gamemoa link</code> {dict.discordGuide.accountStep1Suffix}
            </li>
            <li>
              <b className="text-text-primary">2.</b> {dict.discordGuide.accountStep2}
            </li>
            <li>
              <b className="text-text-primary">3.</b> {dict.discordGuide.accountStep3}
            </li>
          </ol>
          <Link
            to="/discord/link"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-light hover:underline"
          >
            {dict.discordGuide.openLinkPageCta} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </GuideCard>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-7">
        <div className="flex items-start gap-3">
          <Server className="mt-0.5 h-5 w-5 shrink-0 text-brand-light" />
          <div>
            <h2 className="text-xl font-black text-text-primary">
              {dict.discordGuide.registerTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {dict.discordGuide.registerSubtitle}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            dict.discordGuide.registerStep1,
            dict.discordGuide.registerStep2,
            dict.discordGuide.registerStep3,
            dict.discordGuide.registerStep4,
          ].map((item, index) => (
            <div key={item} className="rounded-xl bg-surface p-4">
              <span className="text-xs font-black text-brand-light">0{index + 1}</span>
              <p className="mt-2 text-sm font-bold text-text-primary">{item}</p>
            </div>
          ))}
        </div>
        <Link
          to="/discord/servers"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {dict.discordGuide.registerDirectoryCta} <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-7">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-5 w-5 shrink-0 text-accent-yellow" />
          <div>
            <h2 className="text-xl font-black text-text-primary">{dict.discordGuide.xpTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {dict.discordGuide.xpSubtitle}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <XpCard
            title={dict.discordGuide.xpGlobalTitle}
            value="25,000 → 25,010"
            text={dict.discordGuide.xpGlobalText}
            tone="indigo"
          />
          <XpCard
            title={dict.discordGuide.xpGuildATitle}
            value="0 → 10"
            text={dict.discordGuide.xpGuildAText}
            tone="amber"
          />
          <XpCard
            title={dict.discordGuide.xpGuildBTitle}
            value="0"
            text={dict.discordGuide.xpGuildBText}
            tone="slate"
          />
        </div>
        <p className="mt-5 rounded-xl border border-accent-yellow/20 bg-accent-yellow/5 p-4 text-sm leading-relaxed text-text-secondary">
          <b className="text-text-primary">{dict.discordGuide.antiAbuseLabel}</b>{" "}
          {dict.discordGuide.antiAbuseText}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-7">
        <div className="flex items-center gap-3">
          <Gamepad2 className="h-5 w-5 text-brand-light" />
          <h2 className="text-xl font-black text-text-primary">
            {dict.discordGuide.commandsTitle}
          </h2>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {commands.map(([command, description]) => (
            <div key={command} className="rounded-xl bg-surface p-4">
              <code className="text-sm font-black text-brand-light">{command}</code>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <GuideCard
          icon={<Trophy className="h-5 w-5" />}
          eyebrow="RANKING"
          title={dict.discordGuide.rankingGuideTitle}
        >
          <p>{dict.discordGuide.rankingGuideP1}</p>
          <p className="mt-3">{dict.discordGuide.rankingGuideP2}</p>
          <Link
            to="/ranking"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-light hover:underline"
          >
            {dict.discordGuide.viewFullRankingCta} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </GuideCard>
        <GuideCard
          icon={<CircleHelp className="h-5 w-5" />}
          eyebrow="HELP"
          title={dict.discordGuide.helpGuideTitle}
        >
          <p>{dict.discordGuide.helpP1}</p>
          <p className="mt-3">{dict.discordGuide.helpP2}</p>
          <p className="mt-3">{dict.discordGuide.helpP3}</p>
        </GuideCard>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-7">
        <h2 className="flex items-center gap-2 text-xl font-black text-text-primary">
          <CircleHelp className="h-5 w-5 text-accent-purple" /> {dict.discordGuide.faqTitle}
        </h2>
        <div className="mt-4 divide-y divide-border">
          <Faq question={dict.discordGuide.faq1Q}>{dict.discordGuide.faq1A}</Faq>
          <Faq question={dict.discordGuide.faq2Q}>{dict.discordGuide.faq2A}</Faq>
          <Faq question={dict.discordGuide.faq3Q}>{dict.discordGuide.faq3A}</Faq>
          <Faq question={dict.discordGuide.faq4Q}>{dict.discordGuide.faq4A}</Faq>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-400/20 bg-indigo-950/20 p-5 text-xs text-text-muted">
        <span>{dict.discordGuide.footerNote}</span>
        <Link
          to="/discord"
          className="inline-flex items-center gap-1 font-bold text-brand-light hover:underline"
        >
          {dict.discordGuide.footerHubCta} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </footer>
    </div>
  );
}

function StepCard({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface-raised p-5">
      <div className="flex items-center justify-between text-brand-light">
        <span className="text-xs font-black">{number}</span>
        {icon}
      </div>
      <h2 className="mt-5 text-lg font-black text-text-primary">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{text}</p>
    </article>
  );
}

function GuideCard({
  icon,
  eyebrow,
  title,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface-raised p-5 md:p-7">
      <div className="flex items-center gap-3 text-brand-light">
        <span>{icon}</span>
        <span className="text-[10px] font-black tracking-[0.18em]">{eyebrow}</span>
      </div>
      <h2 className="mt-3 text-xl font-black text-text-primary">{title}</h2>
      <div className="mt-4 text-sm leading-relaxed text-text-secondary">{children}</div>
    </article>
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

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <details className="group py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand">
        <span>{question}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted">{children}</p>
    </details>
  );
}
