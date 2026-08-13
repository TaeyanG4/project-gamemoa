import { Link } from "react-router";
import { BookOpen, Gamepad2, MessagesSquare, User, Video } from "lucide-react";

export function meta() {
  return [
    { title: "GAMEMOA Wiki" },
    { name: "description", content: "GAMEMOA 설치, 계정, 게임/랭킹, Discord, Creator 이용 안내" },
  ];
}

const CATEGORIES = [
  {
    icon: MessagesSquare,
    title: "Discord",
    description: "서버 설치, 계정 연결, 서버 등록, 명령어, 서버 XP, 문제 해결.",
    path: "/wiki/discord",
    tone: "text-indigo-300 bg-indigo-500/10 border-indigo-500/30",
  },
  {
    icon: BookOpen,
    title: "시작하기",
    description: "GAMEMOA 계정 만들기부터 첫 게임까지, 가장 빠른 시작 경로.",
    path: "/wiki/getting-started",
    tone: "text-brand-light bg-brand/10 border-brand/30",
  },
  {
    icon: User,
    title: "계정",
    description: "로그인 방식, 프로필 설정, 여러 계정을 하나로 합치는 계정 통합.",
    path: "/wiki/account",
    tone: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  },
  {
    icon: Gamepad2,
    title: "게임과 랭킹",
    description: "게임 카탈로그, 순위 계산 방식, 경험치(XP)와 레벨.",
    path: "/wiki/games",
    tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  },
  {
    icon: Video,
    title: "Creator",
    description: "채널 소유권 인증, 스트리머 랭킹 자격, Featured Creator 기준.",
    path: "/wiki/creator",
    tone: "text-purple-300 bg-purple-500/10 border-purple-500/30",
  },
] as const;

export default function WikiHomeRoute() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10 md:px-8">
      <header className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-light">
          GAMEMOA Wiki
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-text-primary md:text-4xl">
          궁금한 걸 빠르게 찾아보세요
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
          Discord 설치부터 랭킹 계산 방식까지, GAMEMOA를 사용하는 데 필요한 모든 설명을 한곳에
          모았습니다.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map(({ icon: Icon, title, description, path, tone }) => (
          <Link
            key={path}
            to={path}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 transition-all hover:border-brand/40 hover:-translate-y-0.5"
          >
            <div className={`inline-flex w-fit items-center rounded-xl border p-2.5 ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black text-text-primary group-hover:text-brand-light">
              {title}
            </h2>
            <p className="text-xs leading-relaxed text-text-muted">{description}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center">
        <p className="text-sm text-text-muted">
          더 빠른 Discord 설치가 필요하신가요?{" "}
          <Link to="/discord/setup" className="font-bold text-brand-light hover:underline">
            5단계 설치 가이드
          </Link>
          로 바로 이동하세요.
        </p>
      </div>
    </div>
  );
}
