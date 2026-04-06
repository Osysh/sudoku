"use client";

import { I18nProvider } from "@/lib/i18n/provider";
import { AuthProfileProvider } from "@/lib/hooks/useAuthProfile";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProfileProvider>{children}</AuthProfileProvider>
    </I18nProvider>
  );
}
