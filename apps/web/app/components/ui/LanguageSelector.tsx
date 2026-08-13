import { useState } from "react";
import { Check, Languages } from "lucide-react";
import { SUPPORTED_LOCALES } from "@owogg/core";
import type { SupportedLocale } from "@owogg/contracts";
import { useI18n } from "../../features/i18n/I18nContext";

const NATIVE_LABELS: Record<SupportedLocale, string> = {
  "ko-KR": "한국어",
  "en-US": "English",
  "ja-JP": "日本語",
  "zh-CN": "简体中文",
};

/** Icon-triggered language switcher for the global header — lives next to the favorites
 * shortcut. Changes apply immediately (no page reload). Mirrors the header's existing user
 * dropdown pattern (button + absolutely-positioned panel, closes on mouse leave). */
export function LanguageSelector({ className = "" }: { className?: string }) {
  const { locale, setLocale, dict } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer"
        title={dict.language.label}
        aria-label={dict.language.label}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Languages className="w-5 h-5" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={dict.language.label}
          className="absolute right-0 mt-2 w-40 bg-surface-raised border border-border rounded-2xl shadow-2xl py-1.5 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-150"
          onMouseLeave={() => setOpen(false)}
        >
          {SUPPORTED_LOCALES.map((l) => {
            const active = l === locale;
            return (
              <button
                key={l}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setLocale(l);
                  setOpen(false);
                }}
                className={`flex items-center justify-between gap-2 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? "text-brand-light bg-brand/10"
                    : "text-text-primary hover:bg-surface-overlay"
                }`}
              >
                <span>{NATIVE_LABELS[l]}</span>
                {active && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
