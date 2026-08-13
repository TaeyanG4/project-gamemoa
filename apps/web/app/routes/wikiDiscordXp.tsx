import { Link } from "react-router";
import { WikiLayout, WikiCallout } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "서버 XP | GAMEMOA Wiki" },
    { name: "description", content: "GAMEMOA 글로벌 XP와 Discord 서버별 XP의 차이" },
  ];
}

export default function WikiDiscordXpRoute() {
  return (
    <WikiLayout
      eyebrow="DISCORD"
      title="서버 XP가 계산되는 방식"
      description="글로벌 XP, 서버별 사용자 XP, 서버 활동 XP는 서로 다른 세 가지 숫자입니다."
    >
      <section>
        <h2 className="text-lg font-black text-text-primary">세 가지 XP는 다릅니다</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
          <li>
            <b className="text-text-primary">일반 GAMEMOA XP (글로벌)</b> — 계정 전체의 누적 경험치.
            프로필/전체 랭킹에 사용됩니다.
          </li>
          <li>
            <b className="text-text-primary">Discord 서버별 사용자 XP</b> — 그 서버에서{" "}
            <code className="rounded bg-surface px-1 py-0.5 text-xs font-mono">/gamemoa play</code>
            로 만든 유효한 완료만 누적됩니다.
          </li>
          <li>
            <b className="text-text-primary">Discord 서버 활동 XP</b> — 서버 구성원 전체가 기여한
            합계로, 서버 리더보드/주간 랭킹에 사용됩니다.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">예시</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Global XP가 25,000인 사용자가 새로 등록된 Guild A에서{" "}
          <code className="rounded bg-surface px-1 py-0.5 text-xs font-mono">/gamemoa play</code>로
          유효한 완료 1회(+10)를 만들면:
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <XpCard title="글로벌 XP" value="25,000 → 25,010" text="계정 전체 누적" tone="indigo" />
          <XpCard
            title="Guild A 사용자 XP"
            value="0 → 10"
            text="A에서 만든 유효한 기여"
            tone="amber"
          />
          <XpCard title="Guild B" value="0" text="기존 XP가 자동 복사되지 않음" tone="slate" />
        </div>
      </section>

      <WikiCallout>
        <b className="text-text-primary">기존 글로벌 XP는 새 서버에 자동으로 복사되지 않습니다.</b>{" "}
        새로 등록된 서버는 항상 0에서 시작하며, 오직 그 서버에서 만든 새로운 유효한 플레이만
        쌓입니다.
      </WikiCallout>

      <WikiCallout tone="warning">
        <b className="text-text-primary">어뷰징 방지:</b> 사용자 × 게임 × UTC 하루 기준 글로벌 XP
        지급은 최대 10회입니다. 상한에 도달하면 게임 완료 자체는 계속 가능하지만 추가 XP는 지급되지
        않습니다. 하나의 플레이 이벤트는 최대 하나의 서버에만 귀속됩니다 — 같은 완료가 여러 서버에
        중복으로 XP를 만들지 않습니다.
      </WikiCallout>

      <p className="text-xs text-text-muted">
        서버 랭킹 보는 방법은{" "}
        <Link to="/wiki/games/ranking" className="font-bold text-brand-light hover:underline">
          게임과 랭킹 문서
        </Link>
        를 참고하세요.
      </p>
    </WikiLayout>
  );
}

function XpCard({
  title,
  value,
  text,
  tone,
}: {
  title: string;
  value: string;
  text: string;
  tone: "indigo" | "amber" | "slate";
}) {
  const classes = {
    indigo: "border-indigo-400/20 bg-indigo-500/10 text-indigo-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    slate: "border-white/10 bg-slate-900/50 text-slate-200",
  };
  return (
    <div className={`rounded-xl border p-4 ${classes[tone]}`}>
      <p className="text-xs font-bold">{title}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
      <p className="mt-1 text-[11px] opacity-70">{text}</p>
    </div>
  );
}
