import { Link } from "react-router";
import { WikiLayout, WikiCallout } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "계정 | GAMEMOA Wiki" },
    { name: "description", content: "GAMEMOA 계정, 로그인, 프로필 설정 안내" },
  ];
}

export default function WikiAccountRoute() {
  return (
    <WikiLayout
      eyebrow="ACCOUNT"
      title="계정 개요"
      description="GAMEMOA는 Google과 Discord 로그인을 지원하며, 두 방식은 기본적으로 별도 계정입니다."
    >
      <section>
        <h2 className="text-lg font-black text-text-primary">로그인 방식</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Google 또는 Discord로 로그인할 수 있습니다. 같은 사람이더라도 Google로 만든 계정과
          Discord로 만든 계정은 기본적으로 서로 다른 GAMEMOA 계정입니다 — 자동으로 합쳐지지
          않습니다.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">프로필 설정</h2>
        <p className="mt-2 text-sm text-text-secondary">
          내 프로필 페이지에서 닉네임과 국가/지역을 설정할 수 있고, 레벨·XP·업적·즐겨찾기·최근
          플레이 기록을 확인할 수 있습니다.
        </p>
        <Link
          to="/profile"
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-light hover:underline"
        >
          내 프로필로 이동 →
        </Link>
      </section>

      <WikiCallout>
        Google과 Discord 계정을 따로 만들었다면{" "}
        <Link to="/wiki/account/merge" className="font-bold text-brand-light hover:underline">
          계정 통합
        </Link>
        기능으로 하나로 합칠 수 있습니다.
      </WikiCallout>
    </WikiLayout>
  );
}
