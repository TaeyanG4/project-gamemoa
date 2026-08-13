import { Link } from "react-router";
import { WikiLayout, WikiCallout, WikiSteps } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "계정 통합 | GAMEMOA Wiki" },
    { name: "description", content: "Google과 Discord로 따로 만든 계정을 하나로 합치는 방법" },
  ];
}

export default function WikiAccountMergeRoute() {
  return (
    <WikiLayout
      eyebrow="ACCOUNT"
      title="계정 통합"
      description="Primary Account Wins 방식 — 남길 계정(Primary)을 먼저 선택하고 진행합니다."
    >
      <section>
        <h2 className="text-lg font-black text-text-primary">통합 방식: Primary Account Wins</h2>
        <p className="mt-2 text-sm text-text-secondary">
          두 계정 중 계속 사용할 계정을 <b className="text-text-primary">Primary</b>로 지정합니다.
          통합이 완료되면 Primary의 게임 기록·XP·개인화 설정이 그대로 유지되고, Secondary의 해당
          데이터는 합쳐지지 않고 정리됩니다. Secondary에 연결되어 있던 Google/Discord 로그인 수단만
          Primary로 옮겨져, 이후에는 어느 수단으로 로그인해도 같은 Primary 계정으로 들어오게 됩니다.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">진행 순서</h2>
        <div className="mt-3">
          <WikiSteps
            steps={[
              "계속 사용할 계정(Primary)으로 로그인합니다.",
              "계정 통합을 시작하고, 합칠 대상 계정(Secondary)으로 본인 확인을 진행합니다.",
              "통합 내용을 확인합니다 — Secondary의 게임/개인화 데이터는 유지되지 않습니다.",
              "확인 후 통합을 확정합니다.",
              "이후 Secondary였던 로그인 수단으로도 Primary 계정에 로그인됩니다.",
            ]}
          />
        </div>
      </section>

      <WikiCallout tone="warning">
        <b className="text-text-primary">기록은 합쳐지지 않습니다.</b> Primary의 점수/XP/진행도만
        유지되며, Secondary의 기록은 통합 후 사라집니다 — 반드시 남기고 싶은 계정을 Primary로
        선택하세요.
      </WikiCallout>

      <WikiCallout tone="warning">
        <b className="text-text-primary">Secondary 계정이 관리자 계정이면 통합이 차단됩니다.</b>{" "}
        관리자 권한이 있는 계정을 Secondary로 통합하면 그 권한이 어디로도 옮겨지지 않고 사라질 수
        있어, GAMEMOA는 안전을 위해 이 경우 통합 자체를 막고 운영진의 별도 처리를 요구합니다.
      </WikiCallout>

      <p className="text-xs text-text-secondary">
        플랫폼 소유권 인증(Creator)이 되어 있는 계정을 통합하는 경우의 규칙은{" "}
        <Link
          to="/wiki/creator/verification"
          className="font-bold text-brand-light hover:underline"
        >
          Creator 채널 소유권 인증
        </Link>{" "}
        문서를 참고하세요.
      </p>
    </WikiLayout>
  );
}
