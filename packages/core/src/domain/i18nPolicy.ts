/** The four locales GAMEMOA supports this sprint. Traditional Chinese (zh-TW) is intentionally
 * out of scope. Order here is display order (language selector, etc). */
export const SUPPORTED_LOCALES = ["ko-KR", "en-US", "ja-JP", "zh-CN"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "ko-KR";

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Resolves a locale from a raw, untrusted value — an unsupported/invalid value always falls
 * back to `DEFAULT_LOCALE` rather than ever being persisted or applied as-is. */
export function resolveLocale(value: string | null | undefined): SupportedLocale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

/** Best-effort match of a browser `navigator.languages`-style list against our supported
 * locales — exact match first (e.g. "en-US"), then bare-language match (e.g. "en" -> "en-US"). */
export function matchBrowserLocale(candidates: readonly string[]): SupportedLocale | null {
  for (const raw of candidates) {
    if (isSupportedLocale(raw)) return raw;
  }
  for (const raw of candidates) {
    const lang = raw.split("-")[0]?.toLowerCase();
    const match = SUPPORTED_LOCALES.find((l) => l.split("-")[0]?.toLowerCase() === lang);
    if (match) return match;
  }
  return null;
}
