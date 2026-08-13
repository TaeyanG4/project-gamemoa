import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { resolveLocale, matchBrowserLocale, DEFAULT_LOCALE } from "@owogg/core";
import type { SupportedLocale } from "@owogg/contracts";
import { DICTIONARIES, type Dictionary } from "./dictionary";
import { useAuth } from "../auth";
import { apiFetch } from "../../lib/api/client";
import { UpdateLocaleResponseSchema } from "@owogg/contracts";

const STORAGE_KEY = "owogg_locale";

function readStoredLocale(): SupportedLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? resolveLocale(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredLocale(locale: SupportedLocale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // localStorage unavailable (private mode, etc) — in-memory state still works this session.
  }
}

/** Guest-or-first-visit resolution: localStorage -> navigator.languages -> DEFAULT_LOCALE.
 * Never touches the network or an authenticated user's saved preference — that layer is applied
 * separately in the provider below. */
function resolveClientLocale(): SupportedLocale {
  const stored = readStoredLocale();
  if (stored) return stored;
  if (typeof navigator !== "undefined" && navigator.languages?.length) {
    const matched = matchBrowserLocale(navigator.languages);
    if (matched) return matched;
  }
  return DEFAULT_LOCALE;
}

interface I18nContextValue {
  locale: SupportedLocale;
  dict: Dictionary;
  setLocale: (locale: SupportedLocale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [locale, setLocaleState] = useState<SupportedLocale>(() => resolveClientLocale());
  // Guards the "adopt current preference once on first login with no saved locale" rule from
  // running more than once per session.
  const [adoptedOnLogin, setAdoptedOnLogin] = useState(false);

  // Authenticated user's saved locale wins once auth state is known.
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && user) {
      if (user.locale) {
        const resolved = resolveLocale(user.locale);
        setLocaleState(resolved);
        writeStoredLocale(resolved);
      } else if (!adoptedOnLogin) {
        // No saved server-side preference yet — adopt the current local/browser preference once
        // and persist it, rather than silently reverting the user to ko-KR.
        setAdoptedOnLogin(true);
        const current = resolveClientLocale();
        writeStoredLocale(current);
        void apiFetch("/api/profile/locale", UpdateLocaleResponseSchema, {
          method: "POST",
          body: JSON.stringify({ locale: current }),
        }).catch(() => {
          // Best-effort — the user can still change language manually.
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user?.locale]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = (next: SupportedLocale) => {
    setLocaleState(next);
    writeStoredLocale(next);
    if (isAuthenticated) {
      void apiFetch("/api/profile/locale", UpdateLocaleResponseSchema, {
        method: "POST",
        body: JSON.stringify({ locale: next }),
      }).catch(() => {
        // Best-effort persistence — the locale still applies immediately client-side even if the
        // server save fails (e.g. transient network error).
      });
    }
  };

  const value = useMemo<I18nContextValue>(
    () => ({ locale, dict: DICTIONARIES[locale], setLocale }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
