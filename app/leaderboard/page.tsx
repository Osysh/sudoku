"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { assertSupabaseEnv, supabase } from "@/lib/supabase";
import { ScoreRow } from "@/lib/types";
import { getOrCreateUsername } from "@/lib/profile";

const PENDING_SCORE_KEY = "sudoky-pending-score";

type LeaderboardPlayerRow = {
  username: string;
  totalPoints: number;
  gamesPlayed: number;
};

type PendingScore = {
  difficulty: string;
  completionSeconds: number;
  points: number;
};

function readPendingScore(): PendingScore | null {
  try {
    const raw = localStorage.getItem(PENDING_SCORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingScore>;
    if (
      typeof parsed.difficulty !== "string" ||
      typeof parsed.completionSeconds !== "number" ||
      typeof parsed.points !== "number"
    ) return null;
    return parsed as PendingScore;
  } catch {
    return null;
  }
}

function aggregateScores(rows: ScoreRow[]): LeaderboardPlayerRow[] {
  const aggregate = new Map<string, LeaderboardPlayerRow>();
  for (const row of rows) {
    const existing = aggregate.get(row.username);
    if (existing) {
      existing.totalPoints += row.points;
      existing.gamesPlayed += 1;
    } else {
      aggregate.set(row.username, {
        username: row.username,
        totalPoints: row.points,
        gamesPlayed: 1,
      });
    }
  }
  return Array.from(aggregate.values()).sort((a, b) =>
    b.totalPoints !== a.totalPoints
      ? b.totalPoints - a.totalPoints
      : a.username.localeCompare(b.username)
  );
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [players, setPlayers] = useState<LeaderboardPlayerRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      assertSupabaseEnv();
    } catch (err) {
      setError((err as Error).message);
      return;
    }

    const load = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!user) {
          // Not logged in — redirect to login, then back here
          router.replace("/login?next=/leaderboard");
          return;
        }

        setIsAuthenticated(true);

        // Fetch username and scores in parallel
        const [username, scoresResult] = await Promise.all([
          getOrCreateUsername(user),
          supabase.from("scores").select("id,username,difficulty,completion_seconds,points,created_at"),
        ]);

        setDisplayName(username);

        if (scoresResult.error) {
          setError(scoresResult.error.message);
          return;
        }

        // Submit pending score if any (fire-and-forget, then reload scores)
        const pending = readPendingScore();
        if (pending) {
          const { error: insertError } = await supabase.from("scores").insert({
            user_id: user.id,
            username,
            difficulty: pending.difficulty,
            completion_seconds: pending.completionSeconds,
            points: pending.points,
          });
          if (!insertError) {
            localStorage.removeItem(PENDING_SCORE_KEY);
            // Reload scores now that the pending score is saved
            const { data: fresh, error: freshError } = await supabase
              .from("scores")
              .select("id,username,difficulty,completion_seconds,points,created_at");
            if (!freshError && fresh) {
              setPlayers(aggregateScores(fresh as ScoreRow[]));
              return;
            }
          }
        }

        setPlayers(aggregateScores((scoresResult.data as ScoreRow[]) ?? []));
      } catch (err) {
        setError((err as Error).message);
      }
    };

    void load();
  }, [router]);

  if (!displayName) {
    return (
      <main className="container">
        <p>{error ?? "Loading..."}</p>
      </main>
    );
  }

  return (
    <main className="container">
      <NavBar displayName={displayName} isAuthenticated={isAuthenticated} />
      <section className="card">
        <h1>Leaderboard</h1>
        <p className="text-muted">One row per player, ranked by cumulative points across all games.</p>
        {error ? <p className="text-danger">{error}</p> : null}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Games</th>
              <th>Total Points</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr key={player.username}>
                <td>{index + 1}</td>
                <td>{player.username}</td>
                <td>{player.gamesPlayed}</td>
                <td>{player.totalPoints}</td>
              </tr>
            ))}
            {!players.length ? (
              <tr>
                <td colSpan={4} className="text-muted">
                  No completed games yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
