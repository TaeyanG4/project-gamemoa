import { Link } from "react-router";
import { WikiLayout, WikiCallout } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "랭킹 | OwOGG Wiki" },
    { name: "description", content: "OwOGG 게임/XP/스트리머 랭킹 계산 방식" },
  ];
}

export default function WikiGamesRankingRoute() {
  return (
    <WikiLayout
      eyebrow="GAMES"
      title="랭킹"
      description="명예의 전당(/ranking)은 게임 랭킹, 경험치 랭킹, 스트리머 랭킹 세 가지 탭으로 구성됩니다."
    >
      <section>
        <h2 className="text-lg font-black text-text-primary">게임 랭킹</h2>
        <p className="mt-2 text-sm text-text-secondary">
          게임별 최고 기록(Personal Best) 기준으로 정렬됩니다. 한 사용자가 같은 게임을 여러 번
          플레이해도 랭킹에는 가장 좋은 기록 1개만 반영됩니다.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">경험치(XP) 랭킹</h2>
        <p className="mt-2 text-sm text-text-secondary">
          누적 글로벌 XP 기준으로 정렬됩니다. 자세한 지급 방식은{" "}
          <Link to="/wiki/games/xp" className="font-bold text-brand-light hover:underline">
            XP와 레벨 문서
          </Link>
          를 참고하세요.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">스트리머 랭킹</h2>
        <p className="mt-2 text-sm text-text-secondary">
          YouTube / CHZZK / SOOP / Twitch 중 <b className="text-text-primary">하나 이상</b>의
          플랫폼에서 공식 채널 소유권 인증을 완료한 사용자만 노출됩니다. 순위 값은 일반 게임 랭킹/XP
          랭킹과 동일한 계산식을 사용하며, 인증한 플랫폼 수는 순위에 영향을 주지 않습니다 — 오른쪽
          끝의 플랫폼 아이콘은 필터링·표시 전용입니다.
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          자세한 인증 방법은{" "}
          <Link
            to="/wiki/creator/verification"
            className="font-bold text-brand-light hover:underline"
          >
            Creator 채널 소유권 인증
          </Link>{" "}
          문서를 참고하세요.
        </p>
      </section>

      <WikiCallout>
        Featured Creator 표시는 랭킹 순위나 XP 계산에 어떠한 영향도 주지 않는 표시 전용 배지입니다.
      </WikiCallout>

      <p className="text-xs text-text-muted">
        Discord 서버 단위 랭킹은{" "}
        <Link to="/wiki/discord/xp" className="font-bold text-brand-light hover:underline">
          Discord 서버 XP 문서
        </Link>
        를 참고하세요.
      </p>
    </WikiLayout>
  );
}
