"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import { STORAGE_KEYS, THEME_IMAGE_BY_MODE, THEME_MODES, ThemeMode } from "@/lib/constants";
import { Locale, useI18n } from "@/lib/i18n/provider";
import { useT } from "@/lib/i18n/useT";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

function normalizeTheme(value: string | null): ThemeMode {
  if (value === "swiss_alp" || value === "image") {
    return "swiss_alp";
  }
  if (value === "paris") {
    return "paris";
  }
  if (value === "leopard") {
    return "leopard";
  }
  if (value === "yquem") {
    return "yquem";
  }
  if (value === "grimpe") {
    return "grimpe";
  }
  if (value === "chocolat") {
    return "chocolat";
  }
  return "pink";
}

function applyThemeToBody(theme: ThemeMode) {
  const imagePath = THEME_IMAGE_BY_MODE[theme];
  document.body.setAttribute("data-theme", theme);
  document.body.style.setProperty("--theme-bg-image", imagePath ? `url("${BASE_PATH}${imagePath}")` : "none");
}

export default function BackgroundToggle() {
  const [theme, setTheme] = useState<ThemeMode>("pink");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const translate = useT();
  const { locale, setLocale } = useI18n();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME_MODE) ?? localStorage.getItem(STORAGE_KEYS.LEGACY_BG_MODE);
    const initialTheme = normalizeTheme(saved);
    setTheme(initialTheme);
    applyThemeToBody(initialTheme);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }
      if (rootRef.current.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const applyTheme = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, nextTheme);
    applyThemeToBody(nextTheme);
    setOpen(false);
  };

  const applyLocale = (nextLocale: Locale) => {
    if (nextLocale !== locale) {
      setLocale(nextLocale);
    }
  };

  return (
    <div className="settings-menu" ref={rootRef}>
      <Button
        className="settings-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={translate("theme.openThemeSettings")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.14 12.94a7.92 7.92 0 0 0 .06-.94 7.92 7.92 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.5 7.5 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.57.23-1.11.54-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64L4.85 11.06c-.04.31-.05.62-.05.94 0 .32.01.63.05.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.72 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.57-.23 1.12-.54 1.62-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4Z" />
        </svg>
        <span>{translate("theme.settings")}</span>
      </Button>

      {open ? (
        <div className="settings-panel" role="menu" aria-label={translate("theme.settingsMenu")}>
          <p className="settings-title">{translate("theme.title")}</p>
          {THEME_MODES.map((mode) => (
            <Button
              key={mode}
              role="menuitemradio"
              aria-checked={theme === mode}
              className={theme === mode ? "active" : ""}
              onClick={() => applyTheme(mode)}
            >
              {translate(`theme.${mode}`)}
            </Button>
          ))}
          <div className="settings-divider" />
          <p className="settings-title">{translate("language.label")}</p>
          <div className="settings-lang-row" role="group" aria-label={translate("language.label")}>
            <Button className={locale === "en" ? "active" : ""} onClick={() => applyLocale("en")} aria-pressed={locale === "en"}>
              EN
            </Button>
            <Button className={locale === "fr" ? "active" : ""} onClick={() => applyLocale("fr")} aria-pressed={locale === "fr"}>
              FR
            </Button>
            <Button className={locale === "de" ? "active" : ""} onClick={() => applyLocale("de")} aria-pressed={locale === "de"}>
              DE
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
