import { Link } from "react-router";
import { WikiLayout, WikiCallout } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "XP와 레벨 | OwOGG Wiki" },
    { name: "description", content: "OwOGG 경험치(XP)와 레벨 계산 방식" },
  ];
}

export default function WikiGamesXpRoute() {
  return (
    <WikiLayout
      eyebrow="GAMES"
      title="XP와 레벨"
      description="게임을 유효하게 완료할 때마다 경험치가 쌓이고, 누적 경험치에 따라 레벨이 오릅니다."
    >
      <section>
        <h2 className="text-lg font-black text-text-primary">XP 지급</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
          <li>인정되는 게임 완료 1회당 10 XP가 지급됩니다.</li>
          <li>같은 게임은 하루(UTC 기준) 최대 10회까지만 XP가 지급됩니다.</li>
          <li>상한에 도달해도 게임 플레이 자체는 계속 가능합니다 — 추가 XP만 지급되지 않습니다.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">레벨 공식</h2>
        <p className="mt-2 text-sm text-text-secondary">
          레벨 L에 도달하기 위한 누적 XP는{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono">100 × (L − 1)²</code>
          입니다. 레벨이 오를수록 다음 레벨까지 필요한 XP가 점점 늘어납니다.
        </p>
      </section>

      <WikiCallout>
        Discord 서버에서 만든 XP와 글로벌 XP의 관계가 궁금하다면{" "}
        <Link to="/wiki/discord/xp" className="font-bold text-brand-light hover:underline">
          Discord 서버 XP 문서
        </Link>
        를 확인하세요.
      </WikiCallout>

      <p className="text-xs text-text-muted">
        내 레벨과 XP는{" "}
        <Link to="/profile" className="font-bold text-brand-light hover:underline">
          내 프로필
        </Link>
        에서, 전체 순위는{" "}
        <Link to="/ranking" className="font-bold text-brand-light hover:underline">
          명예의 전당
        </Link>
        에서 확인할 수 있습니다.
      </p>
    </WikiLayout>
  );
}
