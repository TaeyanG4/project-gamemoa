import { Link } from "react-router";
import { WikiLayout, WikiCallout } from "../components/wiki/WikiLayout";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "게임 개발 및 등록 | OwOGG Wiki" },
    { name: "description", content: "게임 크리에이터로 OwOGG에 직접 만든 게임을 올리는 방법" },
  ];
}

export default function WikiGamesDevelopmentRoute() {
  const { dict } = useI18n();
  const t = dict.wikiBody.gamesDevelopment;

  return (
    <WikiLayout eyebrow="GAMES" title={t.title} description={t.description}>
      <p>{t.intro}</p>

      <section>
        <h2 className="text-lg font-black text-text-primary">{t.eligibilityHeading}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t.eligibilityBody}</p>
        <Link
          to="/game-creator"
          className="mt-3 inline-flex items-center rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light"
        >
          {t.eligibilityLink}
        </Link>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">{t.sdkHeading}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t.sdkBody}</p>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface p-4 text-xs">
          <code>{`<script src="https://games.owogg.com/sdk/v1.js"></script>
<script>
  OwOGG.ready();      // 로딩 완료
  OwOGG.submit(1250);  // 게임 종료 + 최종 점수
</script>`}</code>
        </pre>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">{t.limitsHeading}</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
          <li>{t.limitBundle}</li>
          <li>{t.limitExtracted}</li>
          <li>{t.limitFiles}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">{t.flowHeading}</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-text-secondary">
          <li>{t.flowStep1}</li>
          <li>{t.flowStep2}</li>
          <li>{t.flowStep3}</li>
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">{t.policyHeading}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t.policyBody}</p>
      </section>

      <WikiCallout>
        {t.footerPrefix}
        <Link to="/game-creator" className="font-bold text-brand-light hover:underline">
          {t.footerLink}
        </Link>
        {t.footerSuffix}
      </WikiCallout>
    </WikiLayout>
  );
}
