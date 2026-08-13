import { Link } from "react-router";
import { WikiLayout, WikiCallout, WikiSteps } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "Discord 계정 연결 | GAMEMOA Wiki" },
    { name: "description", content: "Discord 계정과 GAMEMOA 계정을 연결하는 방법" },
  ];
}

export default function WikiDiscordAccountLinkRoute() {
  return (
    <WikiLayout
      eyebrow="DISCORD"
      title="계정 연결"
      description="Discord 계정을 GAMEMOA 계정과 연결하면 봇 명령어(/gamemoa profile, /gamemoa play 등)에서 본인 정보를 사용할 수 있습니다."
    >
      <section>
        <h2 className="text-lg font-black text-text-primary">연결 방법</h2>
        <div className="mt-3">
          <WikiSteps
            steps={[
              "Discord 서버에서 /gamemoa link 명령어를 입력합니다.",
              "봇이 나에게만 보이는(ephemeral) 1회용 연결 링크를 응답합니다.",
              "그 링크를 클릭해 GAMEMOA 웹으로 이동합니다.",
              "GAMEMOA에 로그인되어 있지 않다면 먼저 로그인합니다.",
              "연결 확인 화면에서 승인하면 완료됩니다.",
            ]}
          />
        </div>
      </section>

      <WikiCallout>
        연결 링크는 1회용이며 일정 시간 후 만료됩니다. 만료되었거나 이미 사용한 링크라면 Discord에서{" "}
        <code className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono">/gamemoa link</code>를
        다시 실행해 새 링크를 받으세요.
      </WikiCallout>

      <WikiCallout tone="warning">
        하나의 Discord 계정은 하나의 GAMEMOA 계정에만 연결됩니다. 이미 다른 GAMEMOA 계정에 연결된
        Discord 계정으로는 새로 연결할 수 없습니다 — 웹에서 연결을 먼저 해제해야 합니다.
      </WikiCallout>

      <p className="text-xs text-text-muted">
        연결에 실패하나요?{" "}
        <Link
          to="/wiki/discord/troubleshooting"
          className="font-bold text-brand-light hover:underline"
        >
          문제 해결 가이드
        </Link>
        를 확인하세요. 또는 웹에서 바로{" "}
        <Link to="/discord/link" className="font-bold text-brand-light hover:underline">
          계정 연결 페이지
        </Link>
        를 열 수 있습니다.
      </p>
    </WikiLayout>
  );
}
