import { Link } from "react-router";
import { WikiLayout, WikiCallout, WikiSteps } from "../components/wiki/WikiLayout";
import { getDiscordRegisterAuthUrl } from "../features/discord/discordGuildApi";

export function meta() {
  return [
    { title: "서버 등록 | GAMEMOA Wiki" },
    { name: "description", content: "Discord 서버를 GAMEMOA 커뮤니티로 등록하는 방법" },
  ];
}

export default function WikiDiscordServerRegistrationRoute() {
  return (
    <WikiLayout
      eyebrow="DISCORD"
      title="서버 등록"
      description="앱 설치와 서버 등록은 별개입니다. 서버 등록을 완료해야 서버 XP·리더보드·서버 전용 페이지가 활성화됩니다."
    >
      <section>
        <h2 className="text-lg font-black text-text-primary">등록 요건</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
          <li>GAMEMOA 계정으로 로그인되어 있어야 합니다.</li>
          <li>등록하려는 Discord 서버에서 서버 관리(Manage Server) 권한이 있어야 합니다.</li>
          <li>GAMEMOA 앱이 해당 서버에 이미 설치되어 있어야 합니다.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">등록 순서</h2>
        <div className="mt-3">
          <WikiSteps
            steps={[
              "GAMEMOA에 로그인한 상태로 Discord 서버 등록 인증을 시작합니다.",
              "Discord가 요청하는 권한(서버 목록 확인)을 승인합니다.",
              "관리 가능한 서버 목록에서 등록할 서버를 선택합니다.",
              "서버 slug(URL 이름)와 소개, 공개 범위를 설정합니다.",
              "등록을 완료하면 서버 전용 페이지가 즉시 생성됩니다.",
            ]}
          />
        </div>
        <a
          href={getDiscordRegisterAuthUrl()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light"
        >
          서버 등록 시작하기
        </a>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">공개 범위 (Visibility)</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="text-sm font-black text-emerald-300">PUBLIC</p>
            <p className="mt-1 text-xs text-text-muted">
              GAMEMOA 서버 디렉토리와 검색에 노출됩니다.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-black text-amber-300">UNLISTED</p>
            <p className="mt-1 text-xs text-text-muted">
              직접 링크로만 접근 가능하며 디렉토리에는 노출되지 않습니다.
            </p>
          </div>
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
            <p className="text-sm font-black text-rose-300">PRIVATE</p>
            <p className="mt-1 text-xs text-text-muted">서버 관리자만 접근 가능합니다.</p>
          </div>
        </div>
      </section>

      <WikiCallout>
        <b className="text-text-primary">앱 설치 ≠ 서버 등록.</b> 앱을 설치했다고 해서 서버가
        자동으로 공개되지 않습니다. 반드시 위 절차로 직접 등록해야 합니다.
      </WikiCallout>

      <p className="text-xs text-text-muted">
        서버가 목록에 없다면{" "}
        <Link
          to="/wiki/discord/troubleshooting"
          className="font-bold text-brand-light hover:underline"
        >
          문제 해결 가이드
        </Link>
        의 "서버가 등록 후보에 없습니다" 항목을 확인하세요.
      </p>
    </WikiLayout>
  );
}
