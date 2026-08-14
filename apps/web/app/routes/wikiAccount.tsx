import { Link } from "react-router";
import { WikiLayout, WikiCallout } from "../components/wiki/WikiLayout";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "계정 | OwOGG Wiki" },
    { name: "description", content: "OwOGG 계정, 로그인, 프로필 설정 안내" },
  ];
}

export default function WikiAccountRoute() {
  const { dict } = useI18n();
  const t = dict.wikiBody.account;

  return (
    <WikiLayout eyebrow="ACCOUNT" title={t.title} description={t.description}>
      <section>
        <h2 className="text-lg font-black text-text-primary">{t.loginHeading}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t.loginBody}</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-text-primary">{t.profileHeading}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t.profileBody}</p>
        <Link
          to="/settings"
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-light hover:underline"
        >
          {t.profileLink}
        </Link>
      </section>

      <WikiCallout>
        {t.calloutPrefix}
        <Link to="/wiki/account/merge" className="font-bold text-brand-light hover:underline">
          {t.calloutLink}
        </Link>
        {t.calloutSuffix}
      </WikiCallout>
    </WikiLayout>
  );
}
