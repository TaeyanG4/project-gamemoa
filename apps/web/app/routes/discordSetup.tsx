import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Link2,
  Loader2,
  Server,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../features/auth";
import { fetchDiscordBotStatusApi } from "../features/discord/api";
import {
  fetchMyManagedGuilds,
  getDiscordRegisterAuthUrl,
} from "../features/discord/discordGuildApi";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "Discord 설치 가이드 | OwOGG" },
    { name: "description", content: "OwOGG를 Discord 서버에 설치하고 시작하는 5단계 가이드" },
  ];
}

type StepState = "done" | "todo" | "unknown";

export default function DiscordSetupRoute() {
  const { dict } = useI18n();
  const { isAuthenticated, isLoading: authLoading, user, openLoginModal } = useAuth();
  const [installUrl, setInstallUrl] = useState<string | null>(null);
  const [installUrlLoaded, setInstallUrlLoaded] = useState(false);
  const [managedGuildCount, setManagedGuildCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void fetchDiscordBotStatusApi()
      .then((status) => {
        if (active) setInstallUrl(status.installUrl ?? null);
      })
      .catch(() => {
        if (active) setInstallUrl(null);
      })
      .finally(() => {
        if (active) setInstallUrlLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let active = true;
    void fetchMyManagedGuilds()
      .then((res) => {
        if (active) setManagedGuildCount(res.guilds.length);
      })
      .catch(() => {
        if (active) setManagedGuildCount(null);
      });
    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated]);

  const discordLinked = Boolean(user?.providers?.includes("discord"));

  // Installation itself can never be confirmed from OwOGG — Discord doesn't tell us. We only
  // ever show "설치 진행" (never fabricate "설치됨").
  const installState: StepState = "unknown";
  const linkState: StepState = !isAuthenticated ? "todo" : discordLinked ? "done" : "todo";
  const registerState: StepState =
    managedGuildCount === null ? "unknown" : managedGuildCount > 0 ? "done" : "todo";
  const badgeLabels: BadgeLabels = {
    done: dict.discordSetup.badgeDone,
    todo: dict.discordSetup.badgeTodo,
    unknown: dict.discordSetup.badgeUnknown,
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 md:px-8">
      <header className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">
          {dict.discordSetup.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-text-primary md:text-4xl">
          {dict.discordSetup.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">{dict.discordSetup.subtitle}</p>
      </header>

      <ol className="space-y-4">
        <SetupStep
          index={1}
          state={installState}
          badgeLabels={badgeLabels}
          title={dict.discordSetup.step1Title}
          description={dict.discordSetup.step1Description}
        >
          {!installUrlLoaded ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
              {dict.discordSetup.checkingInstallLink}
            </span>
          ) : installUrl ? (
            <a
              href={installUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"
            >
              {dict.discord.installCta} <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <p className="text-xs font-semibold text-text-muted">
              {dict.discordSetup.installLinkUnavailable}
            </p>
          )}
          <p className="mt-2 text-[11px] text-text-muted">{dict.discordSetup.installNote}</p>
          <p className="mt-1 text-[11px] text-text-muted">{dict.discordSetup.installStatusHint}</p>
        </SetupStep>

        <SetupStep
          index={2}
          state={linkState}
          badgeLabels={badgeLabels}
          title={dict.discordSetup.step2Title}
          description={dict.discordSetup.step2Description}
        >
          {authLoading ? (
            <span className="text-xs text-text-muted">{dict.discordSetup.checking}</span>
          ) : !isAuthenticated ? (
            <button
              onClick={openLoginModal}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light cursor-pointer"
            >
              {dict.discordSetup.owoggLoginCta}
            </button>
          ) : discordLinked ? (
            <p className="text-xs font-semibold text-accent-green">
              {dict.discordSetup.linkedNote1} <code>/owogg profile</code>
              {dict.discordSetup.linkedNote2}
            </p>
          ) : (
            <Link
              to="/discord/link"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light"
            >
              {dict.discordSetup.linkAccountCta} <Link2 className="h-3.5 w-3.5" />
            </Link>
          )}
        </SetupStep>

        <SetupStep
          index={3}
          state={registerState}
          badgeLabels={badgeLabels}
          title={dict.discordSetup.step3Title}
          description={dict.discordSetup.step3Description}
        >
          {!isAuthenticated ? (
            <p className="text-xs text-text-muted">{dict.discordSetup.loginFirst}</p>
          ) : managedGuildCount !== null && managedGuildCount > 0 ? (
            <p className="text-xs font-semibold text-accent-green">
              {dict.discordSetup.alreadyRegisteredPrefix}
              {managedGuildCount}
              {dict.discordSetup.alreadyRegisteredSuffix}
            </p>
          ) : (
            <a
              href={getDiscordRegisterAuthUrl()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light"
            >
              {dict.discordSetup.registerStartCta} <Server className="h-3.5 w-3.5" />
            </a>
          )}
          <Link
            to="/discord/servers"
            className="mt-2 block text-[11px] font-bold text-brand-light hover:underline"
          >
            {dict.discordSetup.viewServerDirectory}
          </Link>
        </SetupStep>

        <SetupStep
          index={4}
          state="unknown"
          badgeLabels={badgeLabels}
          title={dict.discordSetup.step4Title}
          description={dict.discordSetup.step4Description}
        >
          <code className="rounded-lg bg-surface px-2 py-1 text-xs font-black text-brand-light">
            /owogg games
          </code>
          <p className="mt-2 text-[11px] text-text-muted">
            {dict.discordSetup.notShowingUp}{" "}
            <Link
              to="/wiki/discord/troubleshooting"
              className="font-bold text-brand-light hover:underline"
            >
              {dict.discordSetup.troubleshootingGuide}
            </Link>
            {dict.discordSetup.checkSuffix}
          </p>
        </SetupStep>

        <SetupStep
          index={5}
          state="unknown"
          badgeLabels={badgeLabels}
          title={dict.discordSetup.step5Title}
          description={dict.discordSetup.step5Description}
        >
          <code className="rounded-lg bg-surface px-2 py-1 text-xs font-black text-brand-light">
            /owogg play
          </code>
          <Link
            to="/discord/guide"
            className="mt-2 flex items-center gap-1 text-[11px] font-bold text-brand-light hover:underline"
          >
            {dict.discordSetup.viewFullGuide} <ExternalLink className="h-3 w-3" />
          </Link>
        </SetupStep>
      </ol>

      <footer className="rounded-2xl border border-border bg-surface-raised p-5 text-center">
        <ShieldCheck className="mx-auto mb-2 h-5 w-5 text-brand-light" />
        <p className="text-xs text-text-muted">
          {dict.discordSetup.footerNote1}{" "}
          <Link to="/wiki/discord" className="font-bold text-brand-light hover:underline">
            {dict.discordSetup.discordWikiLink}
          </Link>
          {dict.discordSetup.footerNote2}
        </p>
      </footer>
    </div>
  );
}

type BadgeLabels = { done: string; todo: string; unknown: string };

function StepBadge({ state, labels }: { state: StepState; labels: BadgeLabels }) {
  if (state === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/10 px-2.5 py-1 text-[10px] font-extrabold text-accent-green border border-accent-green/30">
        <CheckCircle2 className="h-3 w-3" /> {labels.done}
      </span>
    );
  }
  if (state === "todo") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-yellow/10 px-2.5 py-1 text-[10px] font-extrabold text-accent-yellow border border-accent-yellow/30">
        <Circle className="h-3 w-3" /> {labels.todo}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[10px] font-extrabold text-text-muted border border-border">
      {labels.unknown}
    </span>
  );
}

function SetupStep({
  index,
  state,
  title,
  description,
  badgeLabels,
  children,
}: {
  index: number;
  state: StepState;
  title: string;
  description: string;
  badgeLabels: BadgeLabels;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4 rounded-2xl border border-border bg-surface-raised p-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-black text-brand-light">
        {index}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-black text-text-primary">{title}</h2>
          <StepBadge state={state} labels={badgeLabels} />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p>
        <div className="mt-3">{children}</div>
      </div>
    </li>
  );
}
