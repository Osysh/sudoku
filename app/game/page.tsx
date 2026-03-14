"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import { assertSupabaseEnv, supabase } from "@/lib/supabase";
import { calculatePoints, createSudoku, formatSeconds, validateProgress } from "@/lib/sudoku";
import { Difficulty, SudokuGameState } from "@/lib/types";
import { getOrCreateUsername } from "@/lib/profile";

const GAME_STORAGE_KEY = "sudoky-active-game";

const difficultyValues: Difficulty[] = ["easy", "medium", "hard"];

export default function GamePage() {
  const router = useRouter();
  const params = useSearchParams();
  const requestedDifficulty = (params.get("difficulty") as Difficulty) || "easy";
  const forceNew = params.get("new") === "1";

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [game, setGame] = useState<SudokuGameState | null>(null);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [status, setStatus] = useState<string>("");
  const [savedScore, setSavedScore] = useState(false);
  const gameNameRef = useRef<string>("");

  const difficulty: Difficulty = useMemo(
    () => (difficultyValues.includes(requestedDifficulty) ? requestedDifficulty : "easy"),
    [requestedDifficulty]
  );
  const isPaused = game?.paused ?? true;

  useEffect(() => {
    try {
      assertSupabaseEnv();
    } catch (err) {
      setStatus((err as Error).message);
      return;
    }
    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user) {
          router.replace("/login");
          return;
        }
        const username = await getOrCreateUsername(user);
        setDisplayName(username);

        if (!forceNew) {
          const raw = localStorage.getItem(GAME_STORAGE_KEY);
          if (raw) {
            try {
              const saved = JSON.parse(raw) as SudokuGameState;
              if (saved.difficulty === difficulty) {
                gameNameRef.current = saved.gameName ?? "";
                setGame(saved);
                return;
              }
            } catch {
              localStorage.removeItem(GAME_STORAGE_KEY);
            }
          }
        }

        gameNameRef.current = "";
        const { puzzle, solution } = createSudoku(difficulty);
        setGame({
          puzzle,
          solution,
          board: puzzle.map((r) => [...r]),
          startedAt: Date.now(),
          elapsedSeconds: 0,
          paused: false,
          difficulty
        });

        setSavedScore(false);
        setStatus("");
        localStorage.removeItem(GAME_STORAGE_KEY);
      } catch (err) {
        setStatus((err as Error).message);
      }
    };

    initialize();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        localStorage.removeItem(GAME_STORAGE_KEY);
        router.replace("/login");
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [difficulty, forceNew, router]);

  useEffect(() => {
    if (isPaused || savedScore) {
      return;
    }

    const id = setInterval(() => {
      setGame((prev) => {
        if (!prev || prev.paused) return prev;
        return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isPaused, savedScore]);

  const persistAndExit = () => {
    if (!game) return;
    const pausedGame = { ...game, gameName: gameNameRef.current.trim() || undefined, paused: true };
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(pausedGame));
    router.push("/");
  };

  const updateCell = (row: number, col: number, value: string) => {
    if (!game || game.paused || game.puzzle[row][col] !== 0) {
      return;
    }

    const parsed = value === "" ? 0 : Number(value);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 9) {
      return;
    }

    setGame((prev) => {
      if (!prev) return prev;
      const board = prev.board.map((r) => [...r]);
      board[row][col] = parsed;
      return { ...prev, board };
    });
  };

  const submitScoreIfSolved = async () => {
    if (!game || savedScore) {
      return;
    }

    if (!validateProgress(game.board, game.puzzle)) {
      setStatus("Grid is not solved correctly yet.");
      return;
    }

    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      router.replace("/login");
      return;
    }

    const points = calculatePoints(game.difficulty, game.elapsedSeconds);
    const { error } = await supabase.from("scores").insert({
      user_id: user.id,
      username: await getOrCreateUsername(user),
      difficulty: game.difficulty,
      completion_seconds: game.elapsedSeconds,
      points
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    localStorage.removeItem(GAME_STORAGE_KEY);
    setSavedScore(true);
    setStatus(`Solved. +${points} points recorded.`);
  };

  if (!displayName || !game) {
    return (
      <main className="container">
        <p>Loading...</p>
      </main>
    );
  }

  const togglePause = () => {
    const name = gameNameRef.current.trim() || undefined;
    setGame((prev) => {
      if (!prev) return prev;
      const next = { ...prev, gameName: name, paused: !prev.paused };
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const saveProgress = () => {
    if (!game) return;
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({ ...game, gameName: gameNameRef.current.trim() || undefined }));
    setStatus("Progress saved on this browser.");
  };

  return (
    <main className="container">
      <NavBar displayName={displayName} />
      <section className="card">
        <h1>
          <input
            value={game.gameName ?? ""}
            onChange={(e) => {
              const name = e.target.value;
              gameNameRef.current = name;
              setGame((prev) => prev ? { ...prev, gameName: name } : prev);
            }}
            placeholder="Saved Game"
            maxLength={40}
            style={{ font: "inherit", fontSize: "1.25em", fontWeight: 700, border: "none", borderBottom: "2px solid #cbd5e1", background: "transparent", outline: "none", width: "100%", padding: "0 0 2px 0" }}
            aria-label="Game name"
          />
        </h1>
        <p>
          Timer: <strong>{formatSeconds(game.elapsedSeconds)}</strong> | {game.paused ? "Paused" : "Running"}
        </p>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button onClick={togglePause}>{game.paused ? "Resume" : "Pause"}</button>
          <button onClick={saveProgress}>Save</button>
          <button onClick={persistAndExit}>Leave game (pause)</button>
          <button className="primary" onClick={submitScoreIfSolved} disabled={savedScore || game.paused}>
            Submit solved grid
          </button>
        </div>

        <div className="grid" aria-label="sudoku grid">
          {game.board.map((rowVals, row) =>
            rowVals.map((value, col) => {
              const fixed = game.puzzle[row][col] !== 0;
              const isSelected = selected?.row === row && selected?.col === col;
              const top = row % 3 === 0 ? 2 : 1;
              const left = col % 3 === 0 ? 2 : 1;
              const bottom = row === 8 ? 2 : 1;
              const right = col === 8 ? 2 : 1;

              return (
                <div
                  key={`${row}-${col}`}
                  className={`cell ${fixed ? "fixed" : ""}`}
                  style={{ borderTopWidth: top, borderLeftWidth: left, borderBottomWidth: bottom, borderRightWidth: right }}
                >
                  <input
                    value={value === 0 ? "" : value}
                    readOnly={fixed || game.paused || savedScore}
                    onFocus={() => setSelected({ row, col })}
                    onChange={(e) => updateCell(row, col, e.target.value)}
                    inputMode="numeric"
                    pattern="[1-9]"
                    maxLength={1}
                    style={{ background: isSelected ? "#eff6ff" : "transparent", fontWeight: fixed ? 700 : 400 }}
                    aria-label={`row ${row + 1} col ${col + 1}`}
                  />
                </div>
              );
            })
          )}
        </div>

        {status ? <p className={status.includes("Solved") ? "" : "text-danger"}>{status}</p> : null}
      </section>
    </main>
  );
}
