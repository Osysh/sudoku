"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateUsername } from "@/lib/profile";
import { assertSupabaseEnv, supabase } from "@/lib/supabase";
import Button from "@/components/Button";
import BackgroundToggle from "@/components/BackgroundToggle";
import { DailyChallengeRow, getLocalDateKey, getStoredGameResumePath } from "@/lib/dailyChallenge";
import { Difficulty } from "@/lib/types";
import { DIFFICULTY_VALUES, QUERY_PARAMS, ROUTES } from "@/lib/constants";

type DailyChallengeState = {
  loading: boolean;
  available: boolean;
  completed: boolean;
  difficulty: Difficulty | null;
  date: string;
  message: string | null;
};

export default function HomePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("Guest");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [resumePath, setResumePath] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyChallengeState>({
    loading: true,
    available: false,
    completed: false,
    difficulty: null,
    date: getLocalDateKey(),
    message: null
  });

  useEffect(() => {
    setResumePath(getStoredGameResumePath(localStorage));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setDisplayName("Guest");
  };

  useEffect(() => {
    try {
      assertSupabaseEnv();
    } catch {
      return;
    }

    let mounted = true;

    const loadDaily = async () => {
      setDaily((prev) => ({ ...prev, loading: true, date: getLocalDateKey() }));
      const date = getLocalDateKey();

      const { data: rows, error } = await supabase.rpc("get_daily_challenge_for_date", {
        p_local_date: date
      });

      if (error) {
        if (mounted) {
          setDaily({
            loading: false,
            available: false,
            completed: false,
            difficulty: null,
            date,
            message: "Daily challenge is unavailable right now."
          });
        }
        return;
      }

      const row = (rows?.[0] as DailyChallengeRow | undefined) ?? null;
      if (!row) {
        if (mounted) {
          setDaily({
            loading: false,
            available: false,
            completed: false,
            difficulty: null,
            date,
            message: "No daily challenge has been generated yet."
          });
        }
        return;
      }

      if (mounted) {
        setDaily({
          loading: false,
          available: true,
          completed: !!row.is_completed,
          difficulty: row.difficulty,
          date: row.challenge_date,
          message: null
        });
      }
    };

    const syncAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        const user = data.session?.user;
        if (!user) {
          setDaily({
            loading: false,
            available: false,
            completed: false,
            difficulty: null,
            date: getLocalDateKey(),
            message: "Sign in to play today's daily challenge."
          });
          return;
        }
        setIsAuthenticated(true);
        try {
          const name = await getOrCreateUsername(user);
          if (mounted) setDisplayName(name);
        } catch {
          if (mounted) setDisplayName(user.email ?? "Player");
        }
        await loadDaily();
      } catch {
        if (mounted) {
          setDaily({
            loading: false,
            available: false,
            completed: false,
            difficulty: null,
            date: getLocalDateKey(),
            message: "Daily challenge is unavailable right now."
          });
        }
      }
    };

    void syncAuth();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const user = session?.user;
      if (!user) {
        setIsAuthenticated(false);
        setDisplayName("Guest");
        setDaily({
          loading: false,
          available: false,
          completed: false,
          difficulty: null,
          date: getLocalDateKey(),
          message: "Sign in to play today's daily challenge."
        });
        return;
      }
      setIsAuthenticated(true);
      try {
        const name = await getOrCreateUsername(user);
        if (mounted) setDisplayName(name);
      } catch {
        if (mounted) setDisplayName(user.email ?? "Player");
      }
      await loadDaily();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="home-root">
      <div className="home-page">
        <div className="home-header">
          <h1 className="home-title">Sudoku</h1>
          <BackgroundToggle />
        </div>

        {resumePath ? (
          <div className="home-section">
            <Button variant="primary" className="home-resume-btn" onClick={() => router.push(resumePath)}>
              Resume game
            </Button>
          </div>
        ) : null}

        <div className="home-section">
          <p className="home-section-label">Daily challenge</p>
          {daily.loading ? <p className="home-daily-note">Loading today&apos;s challenge...</p> : null}
          {!daily.loading && daily.message ? <p className="home-daily-note">{daily.message}</p> : null}
          {!daily.loading && isAuthenticated && daily.available ? (
            <Button
              variant="primary"
              className="home-resume-btn"
              disabled={daily.completed}
              onClick={() => router.push(`${ROUTES.GAME}?${QUERY_PARAMS.MODE}=daily&${QUERY_PARAMS.DATE}=${daily.date}`)}
            >
              {daily.completed
                ? "Daily challenge completed"
                : `Play daily (${daily.difficulty ?? "medium"})`}
            </Button>
          ) : null}
          {!daily.loading && !isAuthenticated ? (
            <Button className="home-resume-btn" onClick={() => router.push(`${ROUTES.LOGIN}?${QUERY_PARAMS.MODE}=login`)}>
              Sign in for daily challenge
            </Button>
          ) : null}
        </div>

        <div className="home-section">
          <p className="home-section-label">New game</p>
          <div className="home-difficulty">
            {DIFFICULTY_VALUES.map((d) => (
              <Button key={d} onClick={() => router.push(`${ROUTES.GAME}?${QUERY_PARAMS.DIFFICULTY}=${d}&${QUERY_PARAMS.NEW}=1`)}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="home-bottom-row">
          <Button
            className="home-icon-btn"
            onClick={() => router.push(ROUTES.LEADERBOARD)}
            aria-label="Leaderboard"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 5h-2V3H7v2H5C3.9 5 3 5.9 3 7v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zm-14 3V7h2v3.82C5.86 10.4 5 9.3 5 8zm14 0c0 1.3-.86 2.4-2 2.82V7h2v1z" />
            </svg>
            <span>Leaderboard</span>
          </Button>

          <Button
            className="home-icon-btn home-icon-btn--disabled"
            disabled
            aria-label="Multiplayer — coming soon"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
            <span>Multiplayer</span>
          </Button>
        </div>

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
          <button type="button" className="home-auth-link" onClick={() => router.push(`${ROUTES.LOGIN}?${QUERY_PARAMS.MODE}=login`)}>
            Sign in
          </button>
        )}
      </div>
    </main>
  );
}
