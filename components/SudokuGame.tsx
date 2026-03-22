"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import { getOrCreateUsername } from "@/lib/profile";
import { assertSupabaseEnv, supabase } from "@/lib/supabase";
import { calculatePoints, createSudoku, formatSeconds, validateProgress } from "@/lib/sudoku";
import { Difficulty, SudokuGameState } from "@/lib/types";

const GAME_STORAGE_KEY = "sudoky-active-game";
const PENDING_SCORE_KEY = "sudoky-pending-score";
const difficultyValues: Difficulty[] = ["easy", "medium", "hard"];
const difficultyLabels: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard"
};

type PendingScore = {
  difficulty: Difficulty;
  completionSeconds: number;
  points: number;
  createdAt: number;
};

type Props = {
  basePath?: string;
};

function isDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

function parsePendingScore(raw: string | null): PendingScore | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingScore>;
    if (!isDifficulty(parsed.difficulty)) {
      return null;
    }
    if (typeof parsed.completionSeconds !== "number" || typeof parsed.points !== "number" || typeof parsed.createdAt !== "number") {
      return null;
    }
    return {
      difficulty: parsed.difficulty,
      completionSeconds: parsed.completionSeconds,
      points: parsed.points,
      createdAt: parsed.createdAt
    };
  } catch {
    return null;
  }
}

export default function SudokuGame({ basePath = "/" }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const requestedDifficulty = (params.get("difficulty") as Difficulty) || "easy";
  const forceNew = params.get("new") === "1";

  const [displayName, setDisplayName] = useState("Guest");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);
  const [game, setGame] = useState<SudokuGameState | null>(null);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [activeDigit, setActiveDigit] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");
  const [savedScore, setSavedScore] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [victoryLocked, setVictoryLocked] = useState(false);
  const [pendingScore, setPendingScore] = useState<PendingScore | null>(null);

  const difficulty: Difficulty = useMemo(
    () => (difficultyValues.includes(requestedDifficulty) ? requestedDifficulty : "easy"),
    [requestedDifficulty]
  );
  const isPaused = game?.paused ?? true;

  const queuePendingScore = useCallback((score: Omit<PendingScore, "createdAt">, message: string) => {
    const pending: PendingScore = {
      ...score,
      createdAt: Date.now()
    };

    localStorage.setItem(PENDING_SCORE_KEY, JSON.stringify(pending));
    localStorage.removeItem(GAME_STORAGE_KEY);
    setPendingScore(pending);
    setVictoryLocked(true);
    setSavedScore(false);
    setIsSubmittingScore(false);
    setStatus(message);
  }, []);

  const submitPendingScore = useCallback(async () => {
    if (!pendingScore || isSubmittingScore || savedScore || !supabaseConfigured) {
      return;
    }

    setIsSubmittingScore(true);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      const user = data.session?.user;
      if (!user) {
        setIsAuthenticated(false);
        setDisplayName("Guest");
        setStatus("Log in to save your pending points.");
        setIsSubmittingScore(false);
        return;
      }

      const { error } = await supabase.from("scores").insert({
        user_id: user.id,
        difficulty: pendingScore.difficulty,
        completion_seconds: pendingScore.completionSeconds,
        points: pendingScore.points
      });

      if (error) {
        setStatus("Could not save your pending points yet. Try again once connected.");
        setIsSubmittingScore(false);
        return;
      }

      localStorage.removeItem(PENDING_SCORE_KEY);
      setPendingScore(null);
      setIsSubmittingScore(false);
      setStatus(`Pending score saved. +${pendingScore.points} points recorded.`);
    } catch {
      setStatus("Could not save your pending points yet. Try again once connected.");
      setIsSubmittingScore(false);
    }
  }, [isSubmittingScore, pendingScore, savedScore, supabaseConfigured]);

  useEffect(() => {
    if (!forceNew) {
      const rawPending = localStorage.getItem(PENDING_SCORE_KEY);
      const parsedPending = parsePendingScore(rawPending);
      if (parsedPending) {
        setPendingScore(parsedPending);
        setStatus("Previous solved game is pending. Connect to save points.");
      } else if (rawPending) {
        localStorage.removeItem(PENDING_SCORE_KEY);
      }

      const rawGame = localStorage.getItem(GAME_STORAGE_KEY);
      if (rawGame) {
        try {
          const saved = JSON.parse(rawGame) as SudokuGameState;
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
  }, [difficulty, forceNew]);

  useEffect(() => {
    try {
      assertSupabaseEnv();
      setSupabaseConfigured(true);
    } catch {
      setSupabaseConfigured(false);
      setIsAuthenticated(false);
      setDisplayName("Guest");
      return;
    }

    let mounted = true;

    const syncAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        const user = data.session?.user;
        if (!user) {
          setIsAuthenticated(false);
          setDisplayName("Guest");
          return;
        }

        setIsAuthenticated(true);
        try {
          const username = await getOrCreateUsername(user);
          if (mounted) {
            setDisplayName(username);
          }
        } catch {
          if (mounted) {
            setDisplayName("Guest");
          }
        }
      } catch {
        if (mounted) {
          setIsAuthenticated(false);
          setDisplayName("Guest");
        }
      }
    };

    void syncAuth();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) {
        return;
      }

      const user = session?.user;
      if (!user) {
        setIsAuthenticated(false);
        setDisplayName("Guest");
        return;
      }

      setIsAuthenticated(true);
      try {
        const username = await getOrCreateUsername(user);
        if (mounted) {
          setDisplayName(username);
        }
      } catch {
        if (mounted) {
          setDisplayName("Guest");
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!pendingScore || !isAuthenticated || !supabaseConfigured || isSubmittingScore || savedScore) {
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    void submitPendingScore();
  }, [isAuthenticated, isSubmittingScore, pendingScore, savedScore, submitPendingScore, supabaseConfigured]);

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
    if (!game || savedScore || victoryLocked) {
      return;
    }
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(game));
  }, [game, savedScore, victoryLocked]);

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

    const points = calculatePoints(game.difficulty, game.elapsedSeconds);
    const score = {
      difficulty: game.difficulty,
      completionSeconds: game.elapsedSeconds,
      points
    };

    if (!supabaseConfigured) {
      queuePendingScore(score, `Solved offline. +${points} points pending. Connect to save them.`);
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queuePendingScore(score, `Solved offline. +${points} points pending. Connect to save them.`);
      return;
    }

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      const user = data.session?.user;
      if (!user) {
        setIsAuthenticated(false);
        setDisplayName("Guest");
        queuePendingScore(score, `Solved. +${points} points pending. Log in to save them.`);
        return;
      }

      const { error } = await supabase.from("scores").insert({
        user_id: user.id,
        difficulty: game.difficulty,
        completion_seconds: game.elapsedSeconds,
        points
      });

      if (error) {
        queuePendingScore(score, `Solved. +${points} points pending. Connect to save them.`);
        return;
      }

      localStorage.removeItem(GAME_STORAGE_KEY);
      localStorage.removeItem(PENDING_SCORE_KEY);
      setPendingScore(null);
      setSavedScore(true);
      setIsSubmittingScore(false);
      setStatus(`Solved. +${points} points recorded.`);
    } catch {
      queuePendingScore(score, `Solved. +${points} points pending. Connect to save them.`);
    }
  }, [game, isSubmittingScore, queuePendingScore, savedScore, supabaseConfigured]);

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

  if (!game) {
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
  const showCompletionModal = victoryLocked && !isSubmittingScore;

  return (
    <main className="container">
      <NavBar displayName={displayName} isAuthenticated={isAuthenticated} onConnect={() => router.push("/login")} />
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
          {pendingScore && !savedScore ? (
            <button
              type="button"
              className="primary"
              disabled={isSubmittingScore || !supabaseConfigured}
              onClick={() => {
                if (isAuthenticated) {
                  void submitPendingScore();
                  return;
                }
                router.push("/login");
              }}
            >
              {isAuthenticated ? "Save pending points" : "Connect to save points"}
            </button>
          ) : null}
        </div>

        <div className="grid" aria-label="sudoku grid" style={savedScore || isSubmittingScore || victoryLocked ? { pointerEvents: "none", opacity: 0.65 } : undefined}>
          {game.board.map((rowVals, row) =>
            rowVals.map((value, col) => {
              const fixed = game.puzzle[row][col] !== 0;
              const isSameValue = highlightedDigit !== null && value === highlightedDigit;
              const thin = 1;
              const thick = 3;
              const top = row % 3 === 0 ? thick : thin;
              const left = col % 3 === 0 ? thick : thin;
              const bottom = row === 8 ? thick : 0;
              const right = col === 8 ? thick : 0;
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

        {status ? <p className={/(Solved|saved|pending)/i.test(status) ? "" : "text-danger"}>{status}</p> : null}
      </section>

      {showCompletionModal ? (
        <div className="completion-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="completion-title">
          <div className="completion-modal">
            <h2 id="completion-title">Game finished</h2>
            <p className="text-muted">
              {savedScore ? "Your points were saved." : "Your game is solved. You can start another game or view the leaderboard."}
            </p>
            <div className="completion-modal-actions">
              {difficultyValues.map((d) => (
                <button
                  key={`modal-${d}`}
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
              <button type="button" className="primary" onClick={() => router.push("/leaderboard")}>
                Go to leaderboard
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
