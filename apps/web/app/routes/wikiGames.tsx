import { Link } from "react-router";
import { WikiLayout } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "게임과 랭킹 | OwOGG Wiki" },
    { name: "description", content: "OwOGG 게임 카탈로그, 랭킹, XP 개요" },
  ];
}

export default function WikiGamesRoute() {
  return (
    <WikiLayout
      eyebrow="GAMES"
      title="게임과 랭킹 개요"
      description="OwOGG는 반응속도, 순서 기억력, 에임, 타자 속도 등 미니게임 카탈로그를 제공합니다."
    >
      <p>
        각 게임은 독립적인 규칙과 점수 방식을 가지며, 유효한 기록은 자동으로 랭킹에 반영됩니다.
        플레이와 별개로 활동 자체는 경험치(XP)로도 누적됩니다.
      </p>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/wiki/games/ranking"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">랭킹 →</p>
          <p className="mt-1 text-xs text-text-muted">게임별/스트리머 랭킹 계산 방식</p>
        </Link>
        <Link
          to="/wiki/games/xp"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">XP와 레벨 →</p>
          <p className="mt-1 text-xs text-text-muted">경험치 지급 방식과 레벨 공식</p>
        </Link>
      </section>

      <p className="text-xs text-text-muted">
        지금 바로{" "}
        <Link to="/games" className="font-bold text-brand-light hover:underline">
          게임 카탈로그
        </Link>
        에서 플레이해보세요.
      </p>
    </WikiLayout>
  );
}
