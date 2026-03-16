"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import { getOrCreateUsername } from "@/lib/profile";
import { assertSupabaseEnv, supabase } from "@/lib/supabase";
import { calculatePoints, createSudoku, formatSeconds, validateProgress } from "@/lib/sudoku";
import { Difficulty, SudokuGameState } from "@/lib/types";

const GAME_STORAGE_KEY = "sudoky-active-game";
const difficultyValues: Difficulty[] = ["easy", "medium", "hard"];
const difficultyLabels: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard"
};

type Props = {
  basePath?: string;
};

export default function SudokuGame({ basePath = "/" }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const requestedDifficulty = (params.get("difficulty") as Difficulty) || "easy";
  const forceNew = params.get("new") === "1";

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [game, setGame] = useState<SudokuGameState | null>(null);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [activeDigit, setActiveDigit] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");
  const [savedScore, setSavedScore] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [victoryLocked, setVictoryLocked] = useState(false);

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
              setGame(saved);
              return;
            } catch {
              localStorage.removeItem(GAME_STORAGE_KEY);
            }
          }
        }

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
        setIsSubmittingScore(false);
        setVictoryLocked(false);
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

  const digitCounts = useMemo(() => {
    if (!game) {
      return Array(10).fill(0) as number[];
    }
    const counts = Array(10).fill(0) as number[];
    for (const row of game.board) {
      for (const value of row) {
        if (value >= 1 && value <= 9) {
          counts[value] += 1;
        }
      }
    }
    return counts;
  }, [game]);

  useEffect(() => {
    if (activeDigit !== null && digitCounts[activeDigit] >= 9) {
      setActiveDigit(null);
    }
  }, [activeDigit, digitCounts]);

  useEffect(() => {
    if (!game || savedScore) {
      return;
    }
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(game));
  }, [game, savedScore]);

  const updateCellValue = useCallback((row: number, col: number, nextValue: number) => {
    if (!game || game.paused || game.puzzle[row][col] !== 0 || savedScore || isSubmittingScore || victoryLocked) {
      return;
    }

    if (Number.isNaN(nextValue) || nextValue < 0 || nextValue > 9) {
      return;
    }

    setGame((prev) => {
      if (!prev) return prev;
      const board = prev.board.map((r) => [...r]);
      board[row][col] = nextValue;
      return { ...prev, board };
    });
  }, [game, isSubmittingScore, savedScore, victoryLocked]);

  useEffect(() => {
    if (!selected || !game || game.paused || savedScore || isSubmittingScore || victoryLocked) {
      return;
    }

    const { row, col } = selected;
    if (game.puzzle[row][col] !== 0) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        const digit = Number(event.key);
        setActiveDigit(digit);
        updateCellValue(row, col, digit);
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        event.preventDefault();
        updateCellValue(row, col, 0);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game, isSubmittingScore, savedScore, selected, updateCellValue, victoryLocked]);

  const submitScoreIfSolved = useCallback(async (origin: "auto" | "manual" = "manual") => {
    if (!game || savedScore || isSubmittingScore) {
      return;
    }

    if (!validateProgress(game.board, game.puzzle)) {
      setStatus(origin === "auto" ? "Grid is full but has mistakes." : "Grid is not solved correctly yet.");
      return;
    }

    setVictoryLocked(true);
    setIsSubmittingScore(true);

    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      setVictoryLocked(false);
      setIsSubmittingScore(false);
      router.replace("/login");
      return;
    }

    const points = calculatePoints(game.difficulty, game.elapsedSeconds);
    const { error } = await supabase.from("scores").insert({
      user_id: user.id,
      difficulty: game.difficulty,
      completion_seconds: game.elapsedSeconds,
      points
    });

    if (error) {
      setStatus(error.message);
      setVictoryLocked(false);
      setIsSubmittingScore(false);
      return;
    }

    localStorage.removeItem(GAME_STORAGE_KEY);
    setSavedScore(true);
    setIsSubmittingScore(false);
    setStatus(`Solved. +${points} points recorded.`);
  }, [game, isSubmittingScore, router, savedScore]);

  useEffect(() => {
    if (!game || game.paused || savedScore || isSubmittingScore || victoryLocked) {
      return;
    }

    const hasEmptyCell = game.board.some((row) => row.some((value) => value === 0));
    if (hasEmptyCell) {
      return;
    }

    void submitScoreIfSolved("auto");
  }, [game, isSubmittingScore, savedScore, submitScoreIfSolved, victoryLocked]);

  if (!displayName || !game) {
    return (
      <main className="container">
        <p>Loading...</p>
      </main>
    );
  }

  const togglePause = () => {
    if (savedScore || isSubmittingScore || victoryLocked) {
      return;
    }
    setGame((prev) => {
      if (!prev) return prev;
      const next = { ...prev, paused: !prev.paused };
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const selectedValue = selected ? game.board[selected.row]?.[selected.col] ?? 0 : 0;
  const selectedIsEditable = selected ? game.puzzle[selected.row][selected.col] === 0 : false;
  const highlightedDigit = activeDigit ?? (selectedValue > 0 ? selectedValue : null);

  return (
    <main className="container">
      <NavBar displayName={displayName} />
      <section className="card">
        <h1>Sudoku</h1>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.8rem" }}>
          {difficultyValues.map((d) => (
            <button
              key={d}
              className={d === difficulty ? "primary" : ""}
              type="button"
              onClick={() => {
                setActiveDigit(null);
                setSelected(null);
                router.replace(`${basePath}?difficulty=${d}&new=1`);
              }}
            >
              New {difficultyLabels[d]}
            </button>
          ))}
        </div>

        <p>
          Difficulty: <strong>{difficultyLabels[game.difficulty]}</strong> | Timer: <strong>{formatSeconds(game.elapsedSeconds)}</strong> | {game.paused ? "Paused" : "Running"}
        </p>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button onClick={togglePause} disabled={savedScore || isSubmittingScore || victoryLocked}>
            {game.paused ? "Resume" : "Pause"}
          </button>
        </div>

        <div className="grid" aria-label="sudoku grid" style={savedScore || isSubmittingScore || victoryLocked ? { pointerEvents: "none", opacity: 0.65 } : undefined}>
          {game.board.map((rowVals, row) =>
            rowVals.map((value, col) => {
              const fixed = game.puzzle[row][col] !== 0;
              const isSameValue = highlightedDigit !== null && value === highlightedDigit;
              const top = row % 3 === 0 ? 2 : 1;
              const left = col % 3 === 0 ? 2 : 1;
              const bottom = row === 8 ? 2 : 1;
              const right = col === 8 ? 2 : 1;
              const cellBackground = isSameValue ? "#fde68a" : fixed ? "#e2e8f0" : "transparent";

              const isSelected = selected?.row === row && selected?.col === col;

              return (
                <div
                  key={`${row}-${col}`}
                  className={`cell ${fixed ? "fixed" : ""}`}
                  style={{
                    borderTopWidth: top,
                    borderLeftWidth: left,
                    borderBottomWidth: bottom,
                    borderRightWidth: right,
                    background: cellBackground
                  }}
                >
                  <button
                    type="button"
                    className={`cell-button ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setSelected({ row, col });
                      if (value > 0) {
                        setActiveDigit(value);
                      }
                    }}
                    style={{ fontWeight: fixed ? 700 : 400 }}
                    aria-label={`row ${row + 1} col ${col + 1}`}
                  >
                    {value === 0 ? "" : value}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="digit-pad">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => {
            const completed = digitCounts[digit] >= 9;
            const selectedDigit = highlightedDigit === digit;
            return (
              <button
                key={digit}
                type="button"
                disabled={completed || savedScore || isSubmittingScore || victoryLocked}
                onClick={() => {
                  setActiveDigit(digit);
                  if (!selected) {
                    return;
                  }
                  updateCellValue(selected.row, selected.col, digit);
                }}
                style={{
                  minWidth: 42,
                  fontWeight: 700,
                  background: selectedDigit ? "#fde68a" : undefined,
                  borderColor: selectedDigit ? "#f59e0b" : undefined
                }}
                aria-label={`Highlight digit ${digit}`}
              >
                {digit}
              </button>
            );
          })}
          <button
            type="button"
            disabled={!selectedIsEditable || savedScore || isSubmittingScore || victoryLocked}
            onClick={() => {
              if (!selected) {
                return;
              }
              updateCellValue(selected.row, selected.col, 0);
            }}
            aria-label="Clear selected cell"
          >
            Clear
          </button>
        </div>

        {status ? <p className={status.includes("Solved") ? "" : "text-danger"}>{status}</p> : null}
      </section>
    </main>
  );
}
