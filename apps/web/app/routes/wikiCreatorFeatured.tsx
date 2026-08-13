import { WikiLayout, WikiCallout } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "Featured Creator | GAMEMOA Wiki" },
    { name: "description", content: "GAMEMOA Featured Creator 자격 기준 안내" },
  ];
}

export default function WikiCreatorFeaturedRoute() {
  return (
    <WikiLayout
      eyebrow="CREATOR"
      title="Featured Creator"
      description="Featured는 GAMEMOA 기준 공개 채널 지표로 심사하는 표시·필터링 전용 배지입니다."
    >
      <section>
        <h2 className="text-lg font-black text-text-primary">개념 구분</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
          <li>
            <b className="text-text-primary">Creator</b> — 공식 OAuth/API로 채널 소유권이 검증된
            상태.
          </li>
          <li>
            <b className="text-text-primary">Featured Creator</b> — Creator 중에서 GAMEMOA
            기준(구독자/팔로워, 채널 개설 기간 등 공개 지표)을 충족해 자동/수동 심사를 통과한 상태.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">심사 방식</h2>
        <p className="mt-2 text-sm text-text-secondary">
          채널 소유권 인증 직후에는 Featured가 즉시 부여되지 않습니다. 일정 시간 뒤 신선한 공식
          지표로 자동 재심사가 이루어지며, 지표가 모호하거나 플랫폼이 공식 API로 지표를 제공하지
          않으면 운영진 수동 심사로 안전하게 넘어갑니다. Featured로 인정된 이후에도 주기적으로
          재검증합니다.
        </p>
      </section>

      <WikiCallout>
        <b className="text-text-primary">Featured는 점수·XP·랭킹 순위에 영향을 주지 않습니다.</b>{" "}
        표시 전용 배지이며, Featured 여부와 무관하게 스트리머 랭킹은 채널 소유권 인증만으로
        노출됩니다.
      </WikiCallout>

      <WikiCallout tone="warning">
        현재는 서비스 검증 단계라 Featured가 자동으로 부여되지 않고, 채널 소유권이 인증된 모든
        Creator가 운영진 수동 심사 대기 상태를 거칩니다. 스트리머 랭킹에는 Featured 여부와 무관하게
        동일하게 노출되며, Featured 배지도 아직 공개적으로 표시하지 않습니다.
      </WikiCallout>

      <p className="text-xs text-text-muted">
        운영진의 심사 기준과 절차는 내부 운영 문서로 별도 관리되며, 특정 수치를 공개하지 않습니다 —
        심사는 항상 공식 API로 확인 가능한 지표만 사용합니다.
      </p>
    </WikiLayout>
  );
}
