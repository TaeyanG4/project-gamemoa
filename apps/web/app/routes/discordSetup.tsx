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

export function meta() {
  return [
    { title: "Discord 설치 가이드 | GAMEMOA" },
    { name: "description", content: "GAMEMOA를 Discord 서버에 설치하고 시작하는 5단계 가이드" },
  ];
}

type StepState = "done" | "todo" | "unknown";

export default function DiscordSetupRoute() {
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

  // Installation itself can never be confirmed from GAMEMOA — Discord doesn't tell us. We only
  // ever show "설치 진행" (never fabricate "설치됨").
  const installState: StepState = "unknown";
  const linkState: StepState = !isAuthenticated ? "todo" : discordLinked ? "done" : "todo";
  const registerState: StepState =
    managedGuildCount === null ? "unknown" : managedGuildCount > 0 ? "done" : "todo";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 md:px-8">
      <header className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">
          GAMEMOA × Discord
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-text-primary md:text-4xl">
          Discord 설치 가이드
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          아래 5단계만 따라 하면 서버에서 바로 GAMEMOA를 사용할 수 있습니다. Bot Token, Application
          ID 같은 값은 필요 없습니다 — 그런 값은 GAMEMOA 운영진만 다룹니다.
        </p>
      </header>

      <ol className="space-y-4">
        <SetupStep
          index={1}
          state={installState}
          title="Discord에 GAMEMOA 추가"
          description="서버 관리자 권한이 있는 계정으로 Discord 앱을 서버에 설치합니다."
        >
          {!installUrlLoaded ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 설치 링크 확인 중...
            </span>
          ) : installUrl ? (
            <a
              href={installUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"
            >
              Discord에 GAMEMOA 추가 <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <p className="text-xs font-semibold text-text-muted">
              설치 링크가 아직 준비되지 않았습니다. 서버 관리자에게 공식 설치 링크를 문의하세요.
            </p>
          )}
          <p className="mt-2 text-[11px] text-text-muted">
            Discord 앱 설치는 GAMEMOA 서버 등록(3단계)과 다릅니다 — 설치만으로 서버가 자동 등록되지
            않습니다.
          </p>
        </SetupStep>

        <SetupStep
          index={2}
          state={linkState}
          title="Discord 계정 연결"
          description="Discord 봇 명령어에서 본인 GAMEMOA 정보를 사용할 수 있도록 계정을 연결합니다."
        >
          {authLoading ? (
            <span className="text-xs text-text-muted">확인 중...</span>
          ) : !isAuthenticated ? (
            <button
              onClick={openLoginModal}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light cursor-pointer"
            >
              GAMEMOA 로그인
            </button>
          ) : discordLinked ? (
            <p className="text-xs font-semibold text-accent-green">
              연결되었습니다. Discord에서 <code>/gamemoa profile</code>을 사용할 수 있습니다.
            </p>
          ) : (
            <Link
              to="/discord/link"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light"
            >
              계정 연결 페이지 이동 <Link2 className="h-3.5 w-3.5" />
            </Link>
          )}
        </SetupStep>

        <SetupStep
          index={3}
          state={registerState}
          title="서버 등록"
          description="Discord 서버 관리(MANAGE_GUILD) 권한이 있는 서버를 GAMEMOA 커뮤니티로 등록합니다."
        >
          {!isAuthenticated ? (
            <p className="text-xs text-text-muted">먼저 GAMEMOA에 로그인해주세요.</p>
          ) : managedGuildCount !== null && managedGuildCount > 0 ? (
            <p className="text-xs font-semibold text-accent-green">
              이미 {managedGuildCount}개 서버를 등록/관리하고 있습니다.
            </p>
          ) : (
            <a
              href={getDiscordRegisterAuthUrl()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light"
            >
              서버 등록 시작 <Server className="h-3.5 w-3.5" />
            </a>
          )}
          <Link
            to="/discord/servers"
            className="mt-2 block text-[11px] font-bold text-brand-light hover:underline"
          >
            서버 디렉토리 보기
          </Link>
        </SetupStep>

        <SetupStep
          index={4}
          state="unknown"
          title="/gamemoa games 테스트"
          description="Discord 채널에서 슬래시 명령어가 정상적으로 자동완성되는지 확인합니다."
        >
          <code className="rounded-lg bg-surface px-2 py-1 text-xs font-black text-brand-light">
            /gamemoa games
          </code>
          <p className="mt-2 text-[11px] text-text-muted">
            자동완성에 나오지 않으면{" "}
            <Link
              to="/wiki/discord/troubleshooting"
              className="font-bold text-brand-light hover:underline"
            >
              문제 해결 가이드
            </Link>
            를 확인하세요.
          </p>
        </SetupStep>

        <SetupStep
          index={5}
          state="unknown"
          title="/gamemoa play로 시작"
          description="이 서버에 귀속되는 플레이 링크를 발급받아 서버 XP를 쌓기 시작합니다."
        >
          <code className="rounded-lg bg-surface px-2 py-1 text-xs font-black text-brand-light">
            /gamemoa play
          </code>
          <Link
            to="/discord/guide"
            className="mt-2 flex items-center gap-1 text-[11px] font-bold text-brand-light hover:underline"
          >
            전체 이용 가이드 보기 <ExternalLink className="h-3 w-3" />
          </Link>
        </SetupStep>
      </ol>

      <footer className="rounded-2xl border border-border bg-surface-raised p-5 text-center">
        <ShieldCheck className="mx-auto mb-2 h-5 w-5 text-brand-light" />
        <p className="text-xs text-text-muted">
          일반 사용자는 Bot Token, Application ID, Public Key를 입력할 필요가 없습니다. 더 자세한
          설명은{" "}
          <Link to="/wiki/discord" className="font-bold text-brand-light hover:underline">
            Discord Wiki
          </Link>
          에서 확인하세요.
        </p>
      </footer>
    </div>
  );
}

function StepBadge({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/10 px-2.5 py-1 text-[10px] font-extrabold text-accent-green border border-accent-green/30">
        <CheckCircle2 className="h-3 w-3" /> 완료
      </span>
    );
  }
  if (state === "todo") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-yellow/10 px-2.5 py-1 text-[10px] font-extrabold text-accent-yellow border border-accent-yellow/30">
        <Circle className="h-3 w-3" /> 진행 필요
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[10px] font-extrabold text-text-muted border border-border">
      직접 확인
    </span>
  );
}

function SetupStep({
  index,
  state,
  title,
  description,
  children,
}: {
  index: number;
  state: StepState;
  title: string;
  description: string;
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
          <StepBadge state={state} />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p>
        <div className="mt-3">{children}</div>
      </div>
    </li>
  );
}
