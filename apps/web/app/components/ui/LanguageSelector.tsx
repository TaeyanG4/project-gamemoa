import { Languages } from "lucide-react";
import { SUPPORTED_LOCALES } from "@gamemoa/core";
import type { SupportedLocale } from "@gamemoa/contracts";
import { useI18n } from "../../features/i18n/I18nContext";

const NATIVE_LABELS: Record<SupportedLocale, string> = {
  "ko-KR": "한국어",
  "en-US": "English",
  "ja-JP": "日本語",
  "zh-CN": "简体中文",
};

/** Accessible language selector — changes apply immediately (no page reload). Suitable for the
 * footer/global navigation and for Profile/Account settings. */
export function LanguageSelector({ className = "" }: { className?: string }) {
  const { locale, setLocale, dict } = useI18n();

  return (
    <label className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
      <span className="sr-only">{dict.language.label}</span>
      <Languages className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as SupportedLocale)}
        aria-label={dict.language.label}
        className="cursor-pointer rounded-lg border border-border bg-surface-raised px-2 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l} value={l}>
            {NATIVE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
