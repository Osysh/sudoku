"use client";

import { useEffect, useState } from "react";

type BgMode = "pink" | "image";

const STORAGE_KEY = "sudoky-bg-mode";

function applyMode(mode: BgMode) {
  document.body.setAttribute("data-bg-mode", mode);
}

export default function BackgroundToggle() {
  const [mode, setMode] = useState<BgMode>("pink");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initialMode: BgMode = saved === "image" ? "image" : "pink";
    setMode(initialMode);
    applyMode(initialMode);
  }, []);

  const toggle = () => {
    const nextMode: BgMode = mode === "pink" ? "image" : "pink";
    setMode(nextMode);
    localStorage.setItem(STORAGE_KEY, nextMode);
    applyMode(nextMode);
  };

  return (
    <button className="bg-toggle" onClick={toggle} type="button">
      Fond: {mode === "pink" ? "Rose" : "Image"}
    </button>
  );
}
