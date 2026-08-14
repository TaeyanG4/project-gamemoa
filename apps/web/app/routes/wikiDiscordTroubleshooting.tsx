import { Link } from "react-router";
import { WikiLayout, WikiCallout, WikiFaqItem } from "../components/wiki/WikiLayout";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "문제 해결 | OwOGG Wiki" },
    { name: "description", content: "OwOGG Discord 연동 문제 해결 가이드" },
  ];
}

export default function WikiDiscordTroubleshootingRoute() {
  const { dict } = useI18n();
  const t = dict.wikiBody.discordTroubleshooting;

  return (
    <WikiLayout eyebrow="DISCORD" title={t.title} description={t.description}>
      <WikiCallout tone="warning">{t.calloutWarning}</WikiCallout>

      <div className="space-y-3">
        <WikiFaqItem question={t.faqAutocomplete.question}>
          {t.faqAutocomplete.answerPrefix}
          <code className="rounded bg-surface px-1 py-0.5 text-xs font-mono">
            {t.faqAutocomplete.answerCode}
          </code>
          {t.faqAutocomplete.answerSuffix}
        </WikiFaqItem>

        <WikiFaqItem question={t.faqPlainMessage.question}>{t.faqPlainMessage.answer}</WikiFaqItem>

        <WikiFaqItem question={t.faqNoResponse.question}>{t.faqNoResponse.answer}</WikiFaqItem>

        <WikiFaqItem question={t.faqAlreadyLinked.question}>
          {t.faqAlreadyLinked.answer}
        </WikiFaqItem>

        <WikiFaqItem question={t.faqServerNotRegistered.question}>
          {t.faqServerNotRegistered.answerPrefix}
          <Link
            to="/wiki/discord/server-registration"
            className="font-bold text-brand-light hover:underline"
          >
            {t.faqServerNotRegistered.answerLink}
          </Link>
          {t.faqServerNotRegistered.answerSuffix}
        </WikiFaqItem>

        <WikiFaqItem question={t.faqNotInCandidateList.question}>
          {t.faqNotInCandidateList.answer}
        </WikiFaqItem>

        <WikiFaqItem question={t.faqBotNotVisible.question}>
          {t.faqBotNotVisible.answer}
        </WikiFaqItem>

        <WikiFaqItem question={t.faqBotOffline.question}>{t.faqBotOffline.answer}</WikiFaqItem>
      </div>

      <p className="text-xs text-text-muted">
        {t.footerPrefix}
        <Link to="/discord/guide" className="font-bold text-brand-light hover:underline">
          {t.footerLink}
        </Link>
        {t.footerSuffix}
      </p>
    </WikiLayout>
  );
}
