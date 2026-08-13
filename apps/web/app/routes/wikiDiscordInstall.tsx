import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import { WikiLayout, WikiCallout, WikiSteps } from "../components/wiki/WikiLayout";
import { fetchDiscordBotStatusApi } from "../features/discord/api";

export function meta() {
  return [
    { title: "Discord 설치하기 | OwOGG Wiki" },
    { name: "description", content: "OwOGG Discord 앱을 서버에 설치하는 방법" },
  ];
}

export default function WikiDiscordInstallRoute() {
  const [installUrl, setInstallUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchDiscordBotStatusApi()
      .then((s) => setInstallUrl(s.installUrl ?? null))
      .catch(() => setInstallUrl(null));
  }, []);

  return (
    <WikiLayout
      eyebrow="DISCORD"
      title="Discord에 OwOGG 설치하기"
      description="Discord 앱 설치는 OwOGG를 서버에서 사용할 준비 단계입니다. 서버 등록과는 별개입니다."
    >
      <WikiCallout>
        <b className="text-text-primary">일반 사용자는 Bot Token을 입력할 필요가 없습니다.</b> 아래
        공식 설치 링크를 클릭하고 Discord의 서버 선택/승인 화면만 따라가면 됩니다.
      </WikiCallout>

      <section>
        <h2 className="text-lg font-black text-text-primary">설치 순서</h2>
        <div className="mt-3">
          <WikiSteps
            steps={[
              "아래 [Discord에 OwOGG 추가] 버튼을 클릭합니다.",
              "Discord 계정으로 로그인되어 있는지 확인합니다.",
              "앱을 추가할 서버를 선택합니다 (서버 관리 권한이 있는 서버만 목록에 보입니다).",
              "요청된 권한을 확인하고 승인합니다.",
              "완료 후 OwOGG로 돌아와 계정 연결과 서버 등록을 진행합니다.",
            ]}
          />
        </div>
        <div className="mt-4">
          {installUrl ? (
            <a
              href={installUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"
            >
              Discord에 OwOGG 추가 <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <p className="text-xs text-text-muted">
              설치 링크를 불러오는 중이거나 아직 준비되지 않았습니다.{" "}
              <Link to="/discord/setup" className="font-bold text-brand-light hover:underline">
                설치 가이드
              </Link>
              에서 다시 확인해보세요.
            </p>
          )}
        </div>
      </section>

      <WikiCallout tone="warning">
        <b className="text-text-primary">앱 설치 ≠ OwOGG 서버 등록입니다.</b> 앱을 설치해도 서버가
        자동으로 OwOGG 디렉토리에 게시되지 않습니다. 관리자가{" "}
        <Link
          to="/wiki/discord/server-registration"
          className="font-bold text-brand-light hover:underline"
        >
          서버 등록
        </Link>
        을 별도로 완료해야 합니다.
      </WikiCallout>

      <p className="text-xs text-text-muted">
        설치 후 다음 단계는{" "}
        <Link
          to="/wiki/discord/account-link"
          className="font-bold text-brand-light hover:underline"
        >
          계정 연결
        </Link>
        입니다.
      </p>
    </WikiLayout>
  );
}
