import { Link } from "react-router";
import { WikiLayout, WikiCallout } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "명령어 | OwOGG Wiki" },
    { name: "description", content: "/owogg 슬래시 명령어 전체 안내" },
  ];
}

// Mirrors apps/api/src/infrastructure/discord/commands.ts (DISCORD_SUBCOMMANDS) — the actual
// registered command source of truth. Never document a subcommand that doesn't exist there.
const COMMANDS = [
  {
    name: "/owogg link",
    purpose: "이 Discord 계정을 OwOGG 계정과 연결합니다.",
    where: "서버 채널 또는 DM",
    accountLinkRequired: false,
    guildRequired: false,
    args: "없음",
    example: "/owogg link",
    commonError: "이미 연결되어 있으면 새 링크 대신 안내 메시지만 옵니다.",
  },
  {
    name: "/owogg profile",
    purpose: "연결된 OwOGG 계정의 닉네임, 레벨, 총 XP를 확인합니다.",
    where: "서버 채널 또는 DM",
    accountLinkRequired: true,
    guildRequired: false,
    args: "없음",
    example: "/owogg profile",
    commonError: "계정이 연결되지 않았으면 /owogg link 안내가 옵니다.",
  },
  {
    name: "/owogg games",
    purpose: "현재 OwOGG에서 플레이 가능한 게임 목록과 링크를 확인합니다.",
    where: "서버 채널 또는 DM, 로그인 불필요",
    accountLinkRequired: false,
    guildRequired: false,
    args: "없음",
    example: "/owogg games",
    commonError: "없음 (항상 공개적으로 응답)",
  },
  {
    name: "/owogg play",
    purpose: "이 서버에 XP가 귀속되는 1회용 게임 플레이 링크를 발급합니다.",
    where: "등록된 서버 채널",
    accountLinkRequired: true,
    guildRequired: true,
    args: "game (선택) — 특정 게임을 지정, 생략 시 게임 목록으로 이동",
    example: "/owogg play game:reaction-time",
    commonError:
      "서버가 미등록이거나 계정 미연결 시 안내 메시지가 옵니다. 링크는 15분간 1회만 유효합니다.",
  },
  {
    name: "/owogg rank",
    purpose: "이 서버 내 나의 순위와 서버 기여 XP를 확인합니다.",
    where: "등록된 서버 채널",
    accountLinkRequired: true,
    guildRequired: true,
    args: "없음",
    example: "/owogg rank",
    commonError: "계정 미연결 또는 이 서버에서 아직 활동이 없으면 안내 메시지가 옵니다.",
  },
  {
    name: "/owogg leaderboard",
    purpose: "이 서버의 OwOGG XP 리더보드 Top 10을 확인합니다.",
    where: "등록된 서버 채널",
    accountLinkRequired: false,
    guildRequired: true,
    args: "없음",
    example: "/owogg leaderboard",
    commonError: "서버가 미등록이면 안내 메시지가 옵니다.",
  },
  {
    name: "/owogg server",
    purpose: "이 서버의 전체 XP와 주간 활동 요약을 확인합니다.",
    where: "등록된 서버 채널",
    accountLinkRequired: false,
    guildRequired: true,
    args: "없음",
    example: "/owogg server",
    commonError: "서버가 미등록이면 안내 메시지가 옵니다.",
  },
] as const;

export default function WikiDiscordCommandsRoute() {
  return (
    <WikiLayout
      eyebrow="DISCORD"
      title="명령어"
      description="모든 OwOGG Discord 명령어는 /owogg의 서브커맨드입니다."
    >
      <WikiCallout>
        표시된 응답은 명령어를 실행한 사용자에게만 보이는 임시(ephemeral) 메시지입니다 — 채널의 다른
        사람에게는 보이지 않습니다.
      </WikiCallout>

      <div className="space-y-4">
        {COMMANDS.map((cmd) => (
          <article
            key={cmd.name}
            className="rounded-2xl border border-border bg-surface-raised p-5"
          >
            <code className="text-base font-black text-brand-light">{cmd.name}</code>
            <p className="mt-2 text-sm text-text-secondary">{cmd.purpose}</p>
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-bold text-text-primary">사용 위치</dt>
                <dd className="text-text-muted">{cmd.where}</dd>
              </div>
              <div>
                <dt className="font-bold text-text-primary">계정 연결 필요</dt>
                <dd className="text-text-muted">{cmd.accountLinkRequired ? "예" : "아니요"}</dd>
              </div>
              <div>
                <dt className="font-bold text-text-primary">서버 등록 필요</dt>
                <dd className="text-text-muted">{cmd.guildRequired ? "예" : "아니요"}</dd>
              </div>
              <div>
                <dt className="font-bold text-text-primary">인자</dt>
                <dd className="text-text-muted">{cmd.args}</dd>
              </div>
            </dl>
            <div className="mt-3 rounded-xl bg-surface p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                예시
              </p>
              <code className="text-xs font-mono text-text-secondary">{cmd.example}</code>
            </div>
            <p className="mt-2 text-[11px] text-text-muted">
              <b className="text-text-primary">흔한 오류: </b>
              {cmd.commonError}
            </p>
          </article>
        ))}
      </div>

      <p className="text-xs text-text-muted">
        예상과 다르게 동작하나요?{" "}
        <Link
          to="/wiki/discord/troubleshooting"
          className="font-bold text-brand-light hover:underline"
        >
          문제 해결 가이드
        </Link>
        를 확인하세요.
      </p>
    </WikiLayout>
  );
}
