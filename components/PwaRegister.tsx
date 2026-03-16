"use client";

import { useEffect } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    const swUrl = `${basePath}/sw.js`;
    const scope = basePath || "/";
    navigator.serviceWorker.register(swUrl, { scope }).catch((error: unknown) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return null;
}
