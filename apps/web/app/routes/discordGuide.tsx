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

export function meta() {
  return [
    { title: "Discord에서 GAMEMOA 사용하기 | GAMEMOA" },
    { name: "description", content: "Discord 서버에서 GAMEMOA 게임과 서버 XP를 사용하는 방법" },
  ];
}

const commands = [
  ["/gamemoa games", "플레이 가능한 게임 목록을 확인합니다."],
  ["/gamemoa link", "Discord 계정과 GAMEMOA 계정을 연결합니다."],
  ["/gamemoa profile", "연결된 계정의 프로필, 레벨, 글로벌 XP를 확인합니다."],
  ["/gamemoa play", "서버에 귀속되는 1회용 게임 플레이 링크를 만듭니다."],
  ["/gamemoa rank", "현재 서버에서 나의 XP와 순위를 확인합니다."],
  ["/gamemoa leaderboard", "현재 서버 XP Top 10을 확인합니다."],
  ["/gamemoa server", "서버 전체 XP와 주간 활동을 확인합니다."],
] as const;

export default function DiscordGuideRoute() {
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
            GAMEMOA × Discord
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
            Discord에서 GAMEMOA 사용하기
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-indigo-100/80 md:text-base">
            서버에서 게임을 시작하고, 나의 활동을 서버 XP와 리더보드로 확인하세요. GAMEMOA는 상시
            Gateway 봇이 아니라 서명된 HTTP Interactions로 동작합니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {installUrl ? (
              <a
                href={installUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-white"
              >
                Discord에 추가 <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-indigo-100">
                설치 링크는 서버 관리자 안내를 확인하세요
              </span>
            )}
            <Link
              to="/discord/servers"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
            >
              서버 디렉토리 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Discord 이용 핵심 단계">
        <StepCard
          number="01"
          icon={<Server />}
          title="서버에 설치"
          text="Discord 앱 설치는 서버 사용 준비 단계입니다."
        />
        <StepCard
          number="02"
          icon={<ShieldCheck />}
          title="서버를 등록"
          text="관리 가능한 길드를 확인한 뒤 공개 여부를 직접 선택합니다."
        />
        <StepCard
          number="03"
          icon={<Gamepad2 />}
          title="게임을 시작"
          text="/gamemoa play 링크로 유효한 활동을 서버에 귀속합니다."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <GuideCard icon={<Server className="h-5 w-5" />} eyebrow="SERVER" title="서버에 설치하기">
          <p>
            Discord Developer Portal에서 앱의 Installation 설정을 확인한 뒤 실제 설치 링크로 서버에
            추가합니다.
          </p>
          <p className="mt-3">
            설치 링크가 화면에 없으면 저장소가 권한이나 애플리케이션 설정을 확인할 수 없는
            상태입니다. 임의 URL을 사용하지 말고 서버 운영자에게 공식 설치 링크를 요청하세요.
          </p>
          <p className="mt-3">앱 설치만으로 GAMEMOA 공개 디렉토리에 서버가 게시되지 않습니다.</p>
        </GuideCard>
        <GuideCard icon={<Link2 className="h-5 w-5" />} eyebrow="ACCOUNT" title="계정 연결하기">
          <ol className="space-y-2 text-sm text-text-secondary">
            <li>
              <b className="text-text-primary">1.</b> Discord에서 <code>/gamemoa link</code> 실행
            </li>
            <li>
              <b className="text-text-primary">2.</b> 응답의 1회용 링크 열기
            </li>
            <li>
              <b className="text-text-primary">3.</b> GAMEMOA 로그인 후 연결 확인
            </li>
          </ol>
          <Link
            to="/discord/link"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-light hover:underline"
          >
            연결 페이지 열기 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </GuideCard>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-7">
        <div className="flex items-start gap-3">
          <Server className="mt-0.5 h-5 w-5 shrink-0 text-brand-light" />
          <div>
            <h2 className="text-xl font-black text-text-primary">서버 등록하기</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              관리자는 다음 순서로 GAMEMOA 서버 공간을 만듭니다.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "GAMEMOA 로그인",
            "공식 Discord 권한 확인",
            "길드 선택과 slug 설정",
            "PUBLIC / UNLISTED / PRIVATE 선택",
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
          서버 디렉토리에서 시작 <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-7">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-5 w-5 shrink-0 text-accent-yellow" />
          <div>
            <h2 className="text-xl font-black text-text-primary">서버 XP가 계산되는 방식</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              글로벌 XP와 서버 XP는 같은 숫자를 복사하는 구조가 아닙니다.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <XpCard
            title="글로벌 XP"
            value="25,000 → 25,010"
            text="GAMEMOA 전체 진행도"
            tone="indigo"
          />
          <XpCard
            title="Guild A 사용자 XP"
            value="0 → 10"
            text="A에서 만든 유효한 기여"
            tone="amber"
          />
          <XpCard title="Guild B" value="0" text="기존 XP가 자동 복사되지 않음" tone="slate" />
        </div>
        <p className="mt-5 rounded-xl border border-accent-yellow/20 bg-accent-yellow/5 p-4 text-sm leading-relaxed text-text-secondary">
          <b className="text-text-primary">어뷰징 방지:</b> 사용자×게임×UTC 하루 기준 글로벌 XP
          지급은 최대 10회입니다. 상한에 도달하면 게임 완료는 가능하지만 추가 XP는 지급되지
          않습니다.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-7">
        <div className="flex items-center gap-3">
          <Gamepad2 className="h-5 w-5 text-brand-light" />
          <h2 className="text-xl font-black text-text-primary">명령어</h2>
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
        <GuideCard icon={<Trophy className="h-5 w-5" />} eyebrow="RANKING" title="서버 랭킹 보기">
          <p>
            서버 페이지에서 서버 XP, 주간 서버 XP, 게임별 서버 참여자 기록을 확인할 수 있습니다.
          </p>
          <p className="mt-3">
            공개 전역 서버 활동 랭킹에는 `PUBLIC` 활성 서버만 표시됩니다. 참여자 수는 GAMEMOA 활동을
            만든 사용자 기준이며 Discord 전체 멤버 수가 아닙니다.
          </p>
          <Link
            to="/ranking"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-light hover:underline"
          >
            GAMEMOA 전체 랭킹 보기 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </GuideCard>
        <GuideCard icon={<CircleHelp className="h-5 w-5" />} eyebrow="HELP" title="문제 해결">
          <p>
            서버가 등록되지 않았다는 메시지가 나오면 관리자가 서버 등록을 완료했는지 확인하세요.
          </p>
          <p className="mt-3">
            계정 연결 오류는 `/gamemoa link`를 새로 실행하고 만료되지 않은 링크로 다시 확인합니다.
          </p>
          <p className="mt-3">
            Play 링크가 만료되었거나 이미 사용되었으면 새 링크를 발급해야 합니다.
          </p>
        </GuideCard>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-7">
        <h2 className="flex items-center gap-2 text-xl font-black text-text-primary">
          <CircleHelp className="h-5 w-5 text-accent-purple" /> 자주 묻는 질문
        </h2>
        <div className="mt-4 divide-y divide-border">
          <Faq question="앱을 설치하면 서버가 자동으로 공개되나요?">
            아니요. 앱 설치와 GAMEMOA 서버 등록은 별개입니다. 관리자가 웹에서 길드를 확인하고
            가시성을 직접 선택해야 합니다.
          </Faq>
          <Faq question="GAMEMOA가 Discord 서버의 모든 멤버를 가져오나요?">
            아니요. 공식 OAuth로 관리 가능한 길드를 확인하고, XP 랭킹에는 GAMEMOA 활동을 만든
            참여자만 사용합니다.
          </Faq>
          <Faq question="기존 글로벌 XP를 서버에 한 번에 가져올 수 있나요?">
            아니요. 새 Guild는 0에서 시작하며 `/gamemoa play`로 만든 유효한 완료만 서버에
            귀속됩니다.
          </Faq>
          <Faq question="상시 봇 프로세스를 실행해야 하나요?">
            v1에서는 필요하지 않습니다. Discord HTTP Interactions endpoint와 Cloudflare Worker가
            요청을 처리합니다.
          </Faq>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-400/20 bg-indigo-950/20 p-5 text-xs text-text-muted">
        <span>더 자세한 운영 절차는 Discord Bot 운영 가이드에서 확인하세요.</span>
        <Link
          to="/discord"
          className="inline-flex items-center gap-1 font-bold text-brand-light hover:underline"
        >
          Discord Hub로 이동 <ArrowRight className="h-3.5 w-3.5" />
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
