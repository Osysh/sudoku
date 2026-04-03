"use client";

import { useI18n } from "@/lib/i18n/provider";

export function useT() {
  return useI18n().t;
}
