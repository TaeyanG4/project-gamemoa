import { Link } from "react-router";
import type { ComponentType } from "react";
import { Mail, MessageCircleQuestion, Send, Flag, Bug } from "lucide-react";
import { useI18n } from "../features/i18n/I18nContext";

/** Three separate inboxes rather than one, so each kind of message reaches the right place
 * without needing a subject-line convention to sort them — see docs/GAME_CREATION_GUIDE.md-style
 * reasoning: cheap to keep genuinely distinct concerns on distinct channels from day one. */
const CHANNELS = [
  { key: "general", email: "contact@owogg.com", icon: Mail },
  { key: "report", email: "report@owogg.com", icon: Flag },
  { key: "bug", email: "bug@owogg.com", icon: Bug },
] as const;

export function meta() {
  return [
    { title: "문의하기 | OwOGG" },
    { name: "description", content: "OwOGG에 문의사항, 신고, 버그 제보를 보내주세요." },
  ];
}

function ChannelCard({
  icon: Icon,
  label,
  description,
  email,
  emailCta,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  description: string;
  email: string;
  emailCta: string;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black text-text-primary">{label}</p>
          <p className="text-xs text-text-muted">{description}</p>
          <p className="mt-1 text-xs font-bold text-brand-light">{email}</p>
        </div>
      </div>
      <a
        href={`mailto:${email}`}
        className="flex shrink-0 items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-all hover:scale-105"
      >
        <Send className="h-4 w-4" />
        {emailCta}
      </a>
    </div>
  );
}

export default function ContactRoute() {
  const { dict } = useI18n();
  const t = dict.contact;

  const channelLabels = {
    general: { label: t.generalLabel, description: t.generalDesc },
    report: { label: t.reportLabel, description: t.reportDesc },
    bug: { label: t.bugLabel, description: t.bugDesc },
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-8">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
          <MessageCircleQuestion className="h-4 w-4" />
          <span>{t.eyebrow}</span>
        </div>
        <h1 className="text-3xl font-black text-text-primary md:text-4xl">{t.title}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t.subtitle}</p>
      </header>

      <div className="flex flex-col gap-6 rounded-3xl border border-border bg-surface-raised p-6 shadow-xl md:p-8">
        <div className="flex flex-col gap-3">
          {CHANNELS.map((channel) => (
            <ChannelCard
              key={channel.key}
              icon={channel.icon}
              email={channel.email}
              emailCta={t.emailCta}
              {...channelLabels[channel.key]}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6">
          <h2 className="text-sm font-black text-text-primary">{t.guidanceTitle}</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text-secondary">
            {t.guidanceItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-6">
          <h2 className="text-sm font-black text-text-primary">{t.discordAltTitle}</h2>
          <p className="text-sm text-text-secondary">{t.discordAltBody}</p>
          <Link
            to="/discord/guide"
            className="mt-1 w-fit text-xs font-bold text-brand-light hover:underline"
          >
            {t.discordAltCta} →
          </Link>
        </div>
      </div>
    </div>
  );
}
