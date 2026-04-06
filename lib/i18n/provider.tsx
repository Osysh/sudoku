"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import { en } from "@/lib/i18n/messages/en";
import { de } from "@/lib/i18n/messages/de";
import { fr } from "@/lib/i18n/messages/fr";

export const SUPPORTED_LOCALES = ["en", "fr", "de"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

type TranslationVars = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: TranslationVars) => string;
};

const messagesByLocale: Record<Locale, Record<string, unknown>> = {
  en,
  fr,
  de
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(source: unknown, path: string): string | null {
  const value = path.split(".").reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== "object" || !(part in acc)) {
      return null;
    }
    return (acc as Record<string, unknown>)[part];
  }, source);

  return typeof value === "string" ? value : null;
}

function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) {
    return null;
  }
  const lower = value.toLowerCase();
  if (lower.startsWith("fr")) {
    return "fr";
  }
  if (lower.startsWith("de")) {
    return "de";
  }
  if (lower.startsWith("en")) {
    return "en";
  }
  return null;
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = normalizeLocale(localStorage.getItem(STORAGE_KEYS.LOCALE));
  if (stored) {
    return stored;
  }

  const browserLocale = normalizeLocale(window.navigator.language);
  return browserLocale ?? "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    setLocale(getInitialLocale());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOCALE, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback((key: string, vars?: TranslationVars) => {
    const localeTemplate = getNestedValue(messagesByLocale[locale], key);
    const fallbackTemplate = getNestedValue(messagesByLocale.en, key);
    const template = localeTemplate ?? fallbackTemplate ?? key;
    return interpolate(template, vars);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
