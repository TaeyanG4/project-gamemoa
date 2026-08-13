import { Link } from "react-router";
import { WikiLayout, WikiCallout, WikiSteps } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "Discord | GAMEMOA Wiki" },
    { name: "description", content: "GAMEMOA Discord 연동 개요" },
  ];
}

export default function WikiDiscordRoute() {
  return (
    <WikiLayout
      eyebrow="DISCORD"
      title="Discord 개요"
      description="GAMEMOA는 상시 접속 봇이 아니라 서명된 HTTP Interactions로 동작합니다. 설치, 계정 연결, 서버 등록은 서로 다른 3단계입니다."
    >
      <WikiCallout>
        <b className="text-text-primary">
          일반 사용자는 Bot Token, Application ID, Public Key를 다룰 필요가 없습니다.
        </b>{" "}
        이 값들은 GAMEMOA 운영진만 GitHub Actions Secret으로 관리합니다.
      </WikiCallout>

      <section>
        <h2 className="text-lg font-black text-text-primary">전체 흐름</h2>
        <div className="mt-3">
          <WikiSteps
            steps={[
              "Discord에 GAMEMOA 앱을 추가합니다 (서버 관리자 권한 필요).",
              "선택한 서버를 확인하고 승인합니다.",
              "GAMEMOA로 돌아와 Discord 계정을 연결합니다.",
              "관리 권한이 있는 서버를 GAMEMOA 커뮤니티로 등록합니다.",
              "Discord에서 /gamemoa games, /gamemoa play로 시작합니다.",
            ]}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/wiki/discord/install"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">설치하기 →</p>
          <p className="mt-1 text-xs text-text-muted">서버에 앱을 추가하는 방법</p>
        </Link>
        <Link
          to="/wiki/discord/server-registration"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">서버 등록 →</p>
          <p className="mt-1 text-xs text-text-muted">PUBLIC/UNLISTED/PRIVATE 선택</p>
        </Link>
        <Link
          to="/wiki/discord/commands"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">명령어 →</p>
          <p className="mt-1 text-xs text-text-muted">/gamemoa 전체 서브커맨드</p>
        </Link>
        <Link
          to="/wiki/discord/troubleshooting"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">문제 해결 →</p>
          <p className="mt-1 text-xs text-text-muted">자주 발생하는 증상별 해결법</p>
        </Link>
      </section>

      <p className="text-xs text-text-muted">
        지금 바로 설치를 시작하려면{" "}
        <Link to="/discord/setup" className="font-bold text-brand-light hover:underline">
          5단계 설치 가이드
        </Link>
        를 이용하세요.
      </p>
    </WikiLayout>
  );
}
