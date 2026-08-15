import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import { WikiLayout, WikiCallout } from "../components/wiki/WikiLayout";
import { fetchDiscordBotStatusApi } from "../features/discord/api";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "Discord 설치하기 | OwOGG Wiki" },
    { name: "description", content: "OwOGG Discord 앱을 서버에 설치하는 방법" },
  ];
}

export default function WikiDiscordInstallRoute() {
  const { dict } = useI18n();
  const t = dict.wikiBody.discordInstall;
  const [installUrl, setInstallUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchDiscordBotStatusApi()
      .then((s) => setInstallUrl(s.installUrl ?? null))
      .catch(() => setInstallUrl(null));
  }, []);

  return (
    <WikiLayout eyebrow="DISCORD" title={t.title} description={t.description}>
      <WikiCallout>
        <b className="text-text-primary">{t.calloutStrong}</b>
        {t.calloutBody}
      </WikiCallout>

      <section>
        <div>
          {installUrl ? (
            <a
              href={installUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"
            >
              {t.buttonLabel} <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <p className="text-xs text-text-muted">
              {t.loadingPrefix}{" "}
              <Link to="/discord/setup" className="font-bold text-brand-light hover:underline">
                {t.loadingLink}
              </Link>
              {t.loadingSuffix}
            </p>
          )}
        </div>
        <p className="mt-3 text-xs text-text-muted">
          {t.checklistPrefix}
          <Link to="/discord/setup" className="font-bold text-brand-light hover:underline">
            {t.checklistLink}
          </Link>
          {t.checklistSuffix}
        </p>
      </section>

      <WikiCallout tone="warning">
        <b className="text-text-primary">{t.calloutWarningStrong}</b>
        {t.calloutWarningBodyPrefix}
        <Link
          to="/wiki/discord/server-registration"
          className="font-bold text-brand-light hover:underline"
        >
          {t.calloutWarningLink}
        </Link>
        {t.calloutWarningSuffix}
      </WikiCallout>

      <p className="text-xs text-text-muted">
        {t.footerPrefix}
        <Link
          to="/wiki/discord/account-link"
          className="font-bold text-brand-light hover:underline"
        >
          {t.footerLink}
        </Link>
        {t.footerSuffix}
      </p>
    </WikiLayout>
  );
}
