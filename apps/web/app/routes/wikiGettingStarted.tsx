import { Link } from "react-router";
import { WikiLayout, WikiCallout, WikiSteps } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "시작하기 | OwOGG Wiki" },
    { name: "description", content: "OwOGG를 처음 사용하는 방법" },
  ];
}

export default function WikiGettingStartedRoute() {
  return (
    <WikiLayout
      eyebrow="GETTING STARTED"
      title="시작하기"
      description="가장 빠르게 첫 게임을 플레이하고 기록을 남기는 방법입니다."
    >
      <section>
        <h2 className="text-lg font-black text-text-primary">기본 흐름</h2>
        <div className="mt-3">
          <WikiSteps
            steps={[
              "OwOGG 계정으로 로그인합니다 (Google 또는 Discord).",
              "게임 카탈로그에서 원하는 미니게임을 선택합니다.",
              "게임을 플레이하고 결과를 확인합니다 — 유효한 기록은 자동으로 저장됩니다.",
              "명예의 전당(랭킹)에서 나의 순위와 XP를 확인합니다.",
              "필요하다면 Discord를 연결해 서버 친구들과 경쟁합니다.",
            ]}
          />
        </div>
      </section>

      <WikiCallout>
        게스트로도 게임을 플레이할 수 있습니다. 다만 기록이 계정에 저장되고 랭킹/XP에 반영되려면
        로그인이 필요합니다.
      </WikiCallout>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/games"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">게임 카탈로그 →</p>
          <p className="mt-1 text-xs text-text-muted">지금 플레이할 게임 고르기</p>
        </Link>
        <Link
          to="/ranking"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">명예의 전당 →</p>
          <p className="mt-1 text-xs text-text-muted">게임/XP/스트리머 랭킹 확인</p>
        </Link>
      </section>

      <p className="text-xs text-text-muted">
        Discord 서버에서 친구들과 함께 하고 싶다면{" "}
        <Link to="/wiki/discord" className="font-bold text-brand-light hover:underline">
          Discord 문서
        </Link>
        를, 계정 설정은{" "}
        <Link to="/wiki/account" className="font-bold text-brand-light hover:underline">
          계정 문서
        </Link>
        를 확인하세요.
      </p>
    </WikiLayout>
  );
}
