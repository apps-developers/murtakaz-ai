"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import enMessages from "../../messages/en.json";
import arMessages from "../../messages/ar.json";

type Locale = "en" | "ar";

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  isArabic: boolean;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  tr: (en: string, ar: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export type TranslationKey = keyof typeof enMessages;

type Messages = Partial<Record<TranslationKey, string>>;

const dictionary: Record<Locale, Messages> = {
  en: enMessages as Messages,
  ar: arMessages as Messages,
};

function normalizeLocale(locale: string | undefined): Locale {
  return locale === "ar" ? "ar" : "en";
}

export function LocaleProvider({ children, locale }: { children: React.ReactNode; locale: string }) {
  const [activeLocale, setActiveLocale] = useState<Locale>(() => normalizeLocale(locale));

  useEffect(() => {
    setActiveLocale(normalizeLocale(locale));
  }, [locale]);

  const dir: "ltr" | "rtl" = activeLocale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = activeLocale;
      document.documentElement.dir = dir;
    }
  }, [activeLocale, dir]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale: activeLocale,
      dir,
      isArabic: activeLocale === "ar",
      t: (key, params) => {
        const msgs = dictionary[activeLocale] as Record<string, string | undefined>;
        let msg = msgs[key] ?? key;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            msg = msg.replace(`{${k}}`, String(v));
          });
        }
        return msg;
      },
      tr: (en, ar) => (activeLocale === "ar" ? ar : en),
    }),
    [activeLocale, dir],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
