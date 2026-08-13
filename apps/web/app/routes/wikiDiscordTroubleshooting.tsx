import { Link } from "react-router";
import { WikiLayout, WikiCallout, WikiFaqItem } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "문제 해결 | OwOGG Wiki" },
    { name: "description", content: "OwOGG Discord 연동 문제 해결 가이드" },
  ];
}

export default function WikiDiscordTroubleshootingRoute() {
  return (
    <WikiLayout
      eyebrow="DISCORD"
      title="문제 해결"
      description="증상으로 찾아보세요. 어떤 경우에도 일반 사용자가 Bot Token을 설정할 필요는 없습니다."
    >
      <WikiCallout tone="warning">
        아래 어떤 증상도 Bot Token, Application ID, Public Key 입력을 요구하지 않습니다. 그런 안내를
        받았다면 공식 OwOGG 채널이 아닐 수 있습니다.
      </WikiCallout>

      <div className="space-y-3">
        <WikiFaqItem question="/owogg가 자동완성에 안 나옵니다">
          Discord 클라이언트를 재시작하거나 서버를 나갔다가 다시 들어와 보세요. 그래도 안 나오면
          앱이 이 서버에 실제로 설치되어 있는지 서버 관리자에게 확인을 요청하세요. OwOGG 운영진
          쪽에서는{" "}
          <code className="rounded bg-surface px-1 py-0.5 text-xs font-mono">
            pnpm discord:commands:check
          </code>
          로 전역 명령어 등록 상태를 확인할 수 있습니다.
        </WikiFaqItem>

        <WikiFaqItem question="/owogg link를 입력했는데 일반 메시지로 올라갑니다">
          정상적인 슬래시 명령어 대신 일반 텍스트로 전송됐다면 Discord가 명령어를 인식하지 못한
          것입니다. 자동완성 목록에서 정확히 <code>/owogg</code>를 선택한 뒤 하위 명령어를 선택해서
          실행해야 합니다. 직접 타이핑해서 전송하면 일반 메시지가 됩니다.
        </WikiFaqItem>

        <WikiFaqItem question="애플리케이션이 응답하지 않았습니다">
          일시적인 지연이나 오류일 수 있습니다. 잠시 후 다시 시도하세요. 반복되면 OwOGG 서비스
          상태에 문제가 있을 수 있으니 잠시 후 다시 확인해주세요.
        </WikiFaqItem>

        <WikiFaqItem question="계정이 이미 연결되어 있다고 합니다">
          이 Discord 계정이 이미 다른 OwOGG 계정과 연결되어 있다는 뜻입니다. 하나의 Discord 계정은
          하나의 OwOGG 계정에만 연결할 수 있습니다. 다른 계정에 연결하려면 먼저 웹에서 기존 연결을
          해제해야 합니다.
        </WikiFaqItem>

        <WikiFaqItem question="/owogg play가 서버 미등록이라고 합니다">
          이 Discord 서버가 아직 OwOGG 커뮤니티로 등록되지 않았습니다. 서버 관리자가{" "}
          <Link
            to="/wiki/discord/server-registration"
            className="font-bold text-brand-light hover:underline"
          >
            서버 등록
          </Link>
          을 완료해야 합니다. 앱 설치만으로는 등록되지 않습니다.
        </WikiFaqItem>

        <WikiFaqItem question="서버가 등록 목록(등록 후보)에 없습니다">
          등록 가능한 서버 목록은 실제로 서버 관리(Manage Server) 권한이 있는 서버만 표시됩니다.
          권한이 없거나, 로그인한 Discord 계정이 원하는 서버 계정이 아닌지 확인하세요.
        </WikiFaqItem>

        <WikiFaqItem question="봇이 Discord 멤버 목록에서 보이지 않습니다">
          OwOGG는 상시 접속(Gateway) 봇이 아니라 서명된 HTTP Interactions 방식으로 동작합니다.
          그래서 멤버 목록에 항상 "온라인"으로 표시되지 않을 수 있습니다 — 이는 정상이며 명령어
          작동에는 영향이 없습니다.
        </WikiFaqItem>

        <WikiFaqItem question="봇이 오프라인으로 보입니다">
          위와 같은 이유입니다. HTTP Interactions 기반 앱은 상시 접속 상태를 유지하지 않으므로
          Discord 멤버 목록에서 오프라인으로 표시될 수 있습니다. 명령어가 정상적으로 실행된다면
          문제가 아닙니다.
        </WikiFaqItem>
      </div>

      <p className="text-xs text-text-muted">
        여기에 없는 문제인가요?{" "}
        <Link to="/discord/guide" className="font-bold text-brand-light hover:underline">
          Discord 이용 가이드
        </Link>
        의 FAQ도 확인해보세요.
      </p>
    </WikiLayout>
  );
}
