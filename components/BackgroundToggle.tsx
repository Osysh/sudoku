"use client";

import { useEffect, useRef, useState } from "react";

type ThemeMode = "pink" | "swiss_alp" | "paris" | "leopard" | "yquem";

const STORAGE_KEY = "sudoky-theme-mode";
const LEGACY_STORAGE_KEY = "sudoky-bg-mode";
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
  return "pink";
}

function applyThemeToBody(theme: ThemeMode) {
  const imageByTheme: Record<ThemeMode, string | null> = {
    pink: null,
    swiss_alp: "/swiss.jpg",
    paris: "/paris.jpeg",
    leopard: "/leopard.jpeg",
    yquem: "/yquem.jpeg"
  };
  const imagePath = imageByTheme[theme];
  document.body.setAttribute("data-theme", theme);
  document.body.style.setProperty("--theme-bg-image", imagePath ? `url("${BASE_PATH}${imagePath}")` : "none");
}

export default function BackgroundToggle() {
  const [theme, setTheme] = useState<ThemeMode>("pink");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, nextTheme);
    applyThemeToBody(nextTheme);
    setOpen(false);
  };

  return (
    <div className="settings-menu" ref={rootRef}>
      <button
        className="settings-trigger"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open theme settings"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.14 12.94a7.92 7.92 0 0 0 .06-.94 7.92 7.92 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.5 7.5 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.57.23-1.11.54-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64L4.85 11.06c-.04.31-.05.62-.05.94 0 .32.01.63.05.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.72 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.57-.23 1.12-.54 1.62-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4Z" />
        </svg>
        <span>Settings</span>
      </button>

      {open ? (
        <div className="settings-panel" role="menu" aria-label="Theme settings">
          <p className="settings-title">Theme</p>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={theme === "pink"}
            className={theme === "pink" ? "active" : ""}
            onClick={() => applyTheme("pink")}
          >
            Pink
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={theme === "swiss_alp"}
            className={theme === "swiss_alp" ? "active" : ""}
            onClick={() => applyTheme("swiss_alp")}
          >
            Swiss Alp
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={theme === "paris"}
            className={theme === "paris" ? "active" : ""}
            onClick={() => applyTheme("paris")}
          >
            Paris
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={theme === "leopard"}
            className={theme === "leopard" ? "active" : ""}
            onClick={() => applyTheme("leopard")}
          >
            Leopard
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={theme === "yquem"}
            className={theme === "yquem" ? "active" : ""}
            onClick={() => applyTheme("yquem")}
          >
            Yquem
          </button>
        </div>
      ) : null}
    </div>
  );
}
