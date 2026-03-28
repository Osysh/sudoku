"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";
import BackgroundToggle from "@/components/BackgroundToggle";
import { ROUTES } from "@/lib/constants";

type Props = {
  displayName: string;
  isAuthenticated?: boolean;
  onConnect?: () => void;
};

export default function NavBar({ displayName, isAuthenticated = true, onConnect }: Props) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace(ROUTES.LOGIN);
  };

  return (
    <header className="nav">
      <div className="nav-left">
        <Link href={ROUTES.HOME}>Home</Link>
        <Link href={ROUTES.LEADERBOARD}>Leaderboard</Link>
      </div>
      <div className="nav-right">
        <span>{displayName}</span>
        <BackgroundToggle />
        {isAuthenticated ? (
          <Button onClick={handleLogout}>Log out</Button>
        ) : (
          <Button onClick={() => (onConnect ? onConnect() : router.push(ROUTES.LOGIN))}>Connect</Button>
        )}
      </div>
    </header>
  );
}
