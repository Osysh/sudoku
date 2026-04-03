"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";
import { QUERY_PARAMS, ROUTES } from "@/lib/constants";
import { useAuthProfile } from "@/lib/hooks/useAuthProfile";
import { useDailyChallengeStatus } from "@/lib/hooks/useDailyChallengeStatus";
import { useResumePath } from "@/lib/hooks/useResumePath";
import HomeHeader from "@/components/home/HomeHeader";
import DailyChallengeCard from "@/components/home/DailyChallengeCard";
import NewGameSection from "@/components/home/NewGameSection";
import BottomActions from "@/components/home/BottomActions";
import { Difficulty } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, displayName, isLoading: isAuthLoading, user } = useAuthProfile();
  const resumePath = useResumePath();
  const daily = useDailyChallengeStatus(isAuthLoading ? undefined : user);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleOpenDaily = (date: string) => {
    router.push(`${ROUTES.GAME}?${QUERY_PARAMS.MODE}=daily&${QUERY_PARAMS.DATE}=${date}`);
  };

  const handleSignIn = () => {
    router.push(`${ROUTES.LOGIN}?${QUERY_PARAMS.MODE}=login`);
  };

  const handleStartNewGame = (difficulty: Difficulty) => {
    router.push(`${ROUTES.GAME}?${QUERY_PARAMS.DIFFICULTY}=${difficulty}&${QUERY_PARAMS.NEW}=1`);
  };

  return (
    <main className="home-root">
      <div className="home-page">
        <HomeHeader />

        {resumePath ? (
          <div className="home-section">
            <Button variant="primary" className="home-resume-btn" onClick={() => router.push(resumePath)}>
              Resume game
            </Button>
          </div>
        ) : null}

        <DailyChallengeCard daily={daily} isAuthenticated={isAuthenticated} onPlayDaily={handleOpenDaily} onSignIn={handleSignIn} />
        <NewGameSection onStartNewGame={handleStartNewGame} />
        <BottomActions onOpenLeaderboard={() => router.push(ROUTES.LEADERBOARD)} />

      </div>
      <div className="home-auth-footer">
        {isAuthenticated ? (
          <>
            <p className="home-auth-status">Connected as &quot;{displayName}&quot;</p>
            <button type="button" className="home-auth-link" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <button type="button" className="home-auth-link" onClick={handleSignIn}>
            Sign in
          </button>
        )}
      </div>
    </main>
  );
}
