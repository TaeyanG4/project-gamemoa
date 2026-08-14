import { WikiLayout } from "../components/wiki/WikiLayout";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "이용약관 | OwOGG" },
    { name: "description", content: "OwOGG 서비스 이용약관" },
    { name: "robots", content: "noindex" },
  ];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-black text-text-primary">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-text-secondary">{children}</div>
    </section>
  );
}

export default function TermsRoute() {
  const { dict } = useI18n();
  const t = dict.legal.terms;

  return (
    <WikiLayout eyebrow="정책" title={t.pageTitle} description={t.effectiveDate}>
      <div className="space-y-8 rounded-2xl border border-border bg-surface-raised p-5 md:p-8">
        <Section title={t.section1Heading}>
          <p>{t.section1Body}</p>
        </Section>

        <Section title={t.section2Heading}>
          <p>{t.section2Body}</p>
        </Section>

        <Section title={t.section3Heading}>
          <p>{t.section3Intro}</p>
          <ul className="list-disc space-y-1 pl-5">
            {t.section3List.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title={t.section4Heading}>
          <p>{t.section4Body}</p>
        </Section>

        <Section title={t.section5Heading}>
          <p>{t.section5Body}</p>
        </Section>

        <Section title={t.section6Heading}>
          <p>{t.section6Body}</p>
        </Section>

        <Section title={t.section7Heading}>
          <p>{t.section7Body}</p>
        </Section>

        <Section title={t.section8Heading}>
          <p>
            {t.section8BodyPrefix}
            <a
              href={`mailto:${t.section8BodyEmail}`}
              className="font-bold text-brand-light hover:underline"
            >
              {t.section8BodyEmail}
            </a>
            {t.section8BodySuffix}
          </p>
        </Section>
      </div>
    </WikiLayout>
  );
}
