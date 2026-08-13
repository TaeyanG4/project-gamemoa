import { Link } from "react-router";
import { WikiLayout, WikiCallout, WikiSteps } from "../components/wiki/WikiLayout";
import { PlatformIcon } from "../components/ui/PlatformIcon";

export function meta() {
  return [
    { title: "채널 소유권 인증 | GAMEMOA Wiki" },
    { name: "description", content: "GAMEMOA Creator 채널 소유권 인증 방법" },
  ];
}

export default function WikiCreatorVerificationRoute() {
  return (
    <WikiLayout
      eyebrow="CREATOR"
      title="채널 소유권 인증"
      description="공식 OAuth와 API만으로 소유권을 검증합니다. 텍스트 입력이나 스크래핑은 절대 사용하지 않습니다."
    >
      <section>
        <h2 className="text-lg font-black text-text-primary">지원 플랫폼</h2>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {(["YOUTUBE", "CHZZK", "SOOP", "TWITCH"] as const).map((p) => (
            <div key={p} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
              <PlatformIcon platform={p} size={22} />
              <span className="text-xs font-bold text-text-primary">{p}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">인증 방법</h2>
        <div className="mt-3">
          <WikiSteps
            steps={[
              "내 프로필 페이지의 [크리에이터 채널 소유권 인증] 섹션으로 이동합니다.",
              "인증하려는 플랫폼의 [채널 소유권 인증] 버튼을 클릭합니다.",
              "해당 플랫폼의 공식 로그인 화면에서 본인 계정으로 로그인·승인합니다.",
              "GAMEMOA로 돌아오면 채널 정보가 자동으로 확인되어 표시됩니다.",
            ]}
          />
        </div>
      </section>

      <WikiCallout>
        <b className="text-text-primary">GAMEMOA 로그인과 채널 인증은 별개입니다.</b> Google로
        로그인했다고 해서 자동으로 YouTube 채널이 연동되지 않습니다 — 명시적인 인증 절차를 거쳐야
        합니다.
      </WikiCallout>

      <WikiCallout tone="warning">
        하나의 외부 채널은 한 GAMEMOA 계정에만 연동될 수 있습니다. 이미 다른 사용자가 인증한 채널은
        다시 인증할 수 없습니다.
      </WikiCallout>

      <p className="text-xs text-text-muted">
        스트리머 랭킹에 노출되려면 위 4개 플랫폼 중 <b className="text-text-primary">하나만</b>{" "}
        인증하면 충분합니다. 자세한 자격 조건은{" "}
        <Link to="/wiki/games/ranking" className="font-bold text-brand-light hover:underline">
          랭킹 문서
        </Link>
        를 참고하세요.
      </p>
    </WikiLayout>
  );
}
