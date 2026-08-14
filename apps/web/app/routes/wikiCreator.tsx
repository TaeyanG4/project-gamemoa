import { Link } from "react-router";
import { WikiLayout } from "../components/wiki/WikiLayout";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "Creator | OwOGG Wiki" },
    { name: "description", content: "OwOGG Creator(스트리머) 채널 소유권 인증 개요" },
  ];
}

export default function WikiCreatorRoute() {
  const { dict } = useI18n();
  const t = dict.wikiBody.creator;

  return (
    <WikiLayout eyebrow="CREATOR" title={t.title} description={t.description}>
      <p>{t.intro}</p>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/wiki/creator/verification"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">{t.cardVerification}</p>
          <p className="mt-1 text-xs text-text-muted">{t.cardVerificationDesc}</p>
        </Link>
        <Link
          to="/wiki/creator/featured"
          className="rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand/40"
        >
          <p className="text-sm font-black text-text-primary">{t.cardFeatured}</p>
          <p className="mt-1 text-xs text-text-muted">{t.cardFeaturedDesc}</p>
        </Link>
      </section>

      <p className="text-xs text-text-muted">
        {t.profileHint}{" "}
        <Link to="/profile" className="font-bold text-brand-light hover:underline">
          {t.profileLink}
        </Link>
      </p>
    </WikiLayout>
  );
}
