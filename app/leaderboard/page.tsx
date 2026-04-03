"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { assertSupabaseEnv, supabase } from "@/lib/supabase";
import { ScoreRow } from "@/lib/types";
import { getOrCreateUsername } from "@/lib/profile";
import { ROUTES } from "@/lib/constants";
import { useT } from "@/lib/i18n/useT";

type LeaderboardPlayerRow = {
  username: string;
  totalPoints: number;
  gamesPlayed: number;
};

export default function LeaderboardPage() {
  const router = useRouter();
  const t = useT();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [players, setPlayers] = useState<LeaderboardPlayerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true);

  useEffect(() => {
    try {
      assertSupabaseEnv();
    } catch (err) {
      setError((err as Error).message);
      setIsAuthLoading(false);
      setIsLeaderboardLoading(false);
      return;
    }

    const load = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) {
          setIsAuthLoading(false);
          setIsLeaderboardLoading(false);
          router.replace(ROUTES.LOGIN);
          return;
        }
        const username = await getOrCreateUsername(user);
        setDisplayName(username);
        setIsAuthLoading(false);

        const { data, error: fetchError } = await supabase
          .from("scores")
          .select("id,user_id,difficulty,completion_seconds,points,created_at");

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        const rows = (data as ScoreRow[]) ?? [];
        if (!rows.length) {
          setPlayers([]);
          return;
        }

        const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id,username")
          .in("user_id", userIds);

        if (profilesError) {
          setError(profilesError.message);
          return;
        }

        const usernameByUserId = new Map<string, string>(
          (profilesData ?? []).map((profile) => [profile.user_id, profile.username])
        );

        const aggregate = new Map<string, LeaderboardPlayerRow>();

        for (const row of rows) {
          const username = usernameByUserId.get(row.user_id);
          if (!username) continue;

          const existing = aggregate.get(username);
          if (existing) {
            existing.totalPoints += row.points;
            existing.gamesPlayed += 1;
            continue;
          }

          aggregate.set(username, {
            username,
            totalPoints: row.points,
            gamesPlayed: 1
          });
        }

        const leaderboardRows = Array.from(aggregate.values()).sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints;
          }
          return a.username.localeCompare(b.username);
        });

        setPlayers(leaderboardRows);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsAuthLoading(false);
        setIsLeaderboardLoading(false);
      }
    };

    load();
  }, [router]);

  if (isAuthLoading) {
    return (
      <main className="container">
        <section className="card">
          <h1>{t("leaderboard.title")}</h1>
          <p className="text-muted">{t("leaderboard.loadingRankings")}</p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>{t("leaderboard.rank")}</th>
                <th>{t("leaderboard.player")}</th>
                <th>{t("leaderboard.games")}</th>
                <th>{t("leaderboard.totalPoints")}</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5].map((rowIndex) => (
                <tr key={`skeleton-auth-${rowIndex}`}>
                  <td>
                    <span className="skeleton-block" style={{ width: 18, height: 14 }} />
                  </td>
                  <td>
                    <span className="skeleton-block" style={{ width: "65%", height: 14 }} />
                  </td>
                  <td>
                    <span className="skeleton-block" style={{ width: 28, height: 14 }} />
                  </td>
                  <td>
                    <span className="skeleton-block" style={{ width: 54, height: 14 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    );
  }

  if (!displayName) {
    return (
      <main className="container">
        <p>{error ?? t("common.redirecting")}</p>
      </main>
    );
  }

  return (
    <main className="container">
      <NavBar displayName={displayName} />
      <section className="card">
        <h1>{t("leaderboard.title")}</h1>
        <p className="text-muted">{t("leaderboard.subtitle")}</p>
        {error ? <p className="text-danger">{error}</p> : null}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>{t("leaderboard.rank")}</th>
              <th>{t("leaderboard.player")}</th>
              <th>{t("leaderboard.games")}</th>
              <th>{t("leaderboard.totalPoints")}</th>
            </tr>
          </thead>
          <tbody>
            {isLeaderboardLoading
              ? [0, 1, 2, 3, 4, 5].map((rowIndex) => (
                  <tr key={`skeleton-data-${rowIndex}`}>
                    <td>
                      <span className="skeleton-block" style={{ width: 18, height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-block" style={{ width: "65%", height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-block" style={{ width: 28, height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-block" style={{ width: 54, height: 14 }} />
                    </td>
                  </tr>
                ))
              : players.map((player, index) => (
                  <tr key={player.username}>
                    <td>{index + 1}</td>
                    <td>{player.username}</td>
                    <td>{player.gamesPlayed}</td>
                    <td>{player.totalPoints}</td>
                  </tr>
                ))}
            {!isLeaderboardLoading && !players.length ? (
              <tr>
                <td colSpan={4} className="text-muted">
                  {t("leaderboard.empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
