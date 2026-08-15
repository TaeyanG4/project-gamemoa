import { Link } from "react-router";
import { WikiLayout, WikiCallout } from "../components/wiki/WikiLayout";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "문의 · 신고 · 버그 제보 | OwOGG Wiki" },
    { name: "description", content: "OwOGG 문의, 신고, 버그 제보 채널 안내" },
  ];
}

export default function WikiSupportRoute() {
  const { dict } = useI18n();
  const t = dict.wikiBody.support;

  return (
    <WikiLayout eyebrow="SUPPORT" title={t.title} description={t.description}>
      <section className="grid gap-3 sm:grid-cols-1">
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <h2 className="text-sm font-black text-text-primary">{t.generalHeading}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t.generalBody}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <h2 className="text-sm font-black text-text-primary">{t.reportHeading}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t.reportBody}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <h2 className="text-sm font-black text-text-primary">{t.bugHeading}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t.bugBody}</p>
        </div>
      </section>

      <WikiCallout>
        <p className="font-black text-text-primary">{t.tipsHeading}</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>{t.tip1}</li>
          <li>{t.tip2}</li>
          <li>{t.tip3}</li>
        </ul>
      </WikiCallout>

      <p className="text-xs text-text-muted">
        {t.footerPrefix}
        <Link to="/contact" className="font-bold text-brand-light hover:underline">
          {t.footerLink}
        </Link>
        {t.footerSuffix}
      </p>
    </WikiLayout>
  );
}
