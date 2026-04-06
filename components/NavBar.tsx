"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";
import BackgroundToggle from "@/components/BackgroundToggle";
import { ROUTES } from "@/lib/constants";
import { useT } from "@/lib/i18n/useT";

type Props = {
  displayName: string;
  isAuthenticated?: boolean;
  onConnect?: () => void;
};

export default function NavBar({ displayName, isAuthenticated = true, onConnect }: Props) {
  const router = useRouter();
  const t = useT();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      router.replace(ROUTES.LOGIN);
    }
  };

  return (
    <header className="nav">
      <div className="nav-left">
        <Link href={ROUTES.HOME}>{t("common.home")}</Link>
        <Link href={ROUTES.LEADERBOARD}>{t("common.leaderboard")}</Link>
      </div>
      <div className="nav-right">
        <span>{displayName}</span>
        <BackgroundToggle />
        {isAuthenticated ? (
          <Button onClick={handleLogout}>{t("common.logOut")}</Button>
        ) : (
          <Button onClick={() => (onConnect ? onConnect() : router.push(ROUTES.LOGIN))}>{t("common.connect")}</Button>
        )}
      </div>
    </header>
  );
}
