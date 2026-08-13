import { Link } from "react-router";
import { WikiLayout } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "Creator | OwOGG Wiki" },
    { name: "description", content: "OwOGG Creator(스트리머) 채널 소유권 인증 개요" },
  ];
}

export default function WikiCreatorRoute() {
  return (
    <WikiLayout
      eyebrow="CREATOR"
      title="Creator 개요"
      description="공식 OAuth/API로 채널 소유권을 검증한 스트리머/유튜버를 OwOGG Creator로 인정합니다."
    >
      <p>
        Creator 인증은 게임 점수나 XP에 어떤 가산점도 주지 않습니다. 대신 명예의 전당의 스트리머
        랭킹 탭 노출, 내 프로필의 검증 배지와 공식 채널 링크 표시라는 혜택을 제공합니다.
      </p>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/wiki/creator/verification"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">채널 소유권 인증 →</p>
          <p className="mt-1 text-xs text-text-muted">지원 플랫폼과 인증 방법</p>
        </Link>
        <Link
          to="/wiki/creator/featured"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">Featured Creator →</p>
          <p className="mt-1 text-xs text-text-muted">Featured 자격 기준</p>
        </Link>
      </section>

      <p className="text-xs text-text-muted">
        인증은 내 프로필 페이지에서 시작할 수 있습니다.{" "}
        <Link to="/profile" className="font-bold text-brand-light hover:underline">
          내 프로필로 이동
        </Link>
      </p>
    </WikiLayout>
  );
}
