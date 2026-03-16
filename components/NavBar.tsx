"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackgroundToggle from "@/components/BackgroundToggle";

type Props = {
  displayName: string;
};

export default function NavBar({ displayName }: Props) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <header className="nav">
      <div className="nav-left">
        <Link href="/">Home</Link>
        <Link href="/leaderboard">Leaderboard</Link>
      </div>
      <div className="nav-right">
        <span>{displayName}</span>
        <BackgroundToggle />
        <button onClick={handleLogout}>Log out</button>
      </div>
    </header>
  );
}
