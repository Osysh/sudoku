"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrCreateUsername } from "@/lib/profile";
import Button from "@/components/Button";
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

export default function SudokuGame() {
  const router = useRouter();
  const params = useSearchParams();
  const requestedDifficulty = (params.get("difficulty") as Difficulty) || "easy";
  const forceNew = params.get("new") === "1";

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState("");
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

  const submitPendingScore = useCallback(async () => {
    if (!pendingScore || isSubmittingScore || savedScore || !supabaseConfigured) {
      return;
    }

    setIsSubmittingScore(true);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = data.session?.user;
      if (!user) {
        setIsAuthenticated(false);
        setStatus("Log in to save your score.");
        setIsSubmittingScore(false);
        return;
      }

      let username: string;
      try {
        username = await getOrCreateUsername(user);
        setDisplayName(username);
      } catch (profileErr) {
        setStatus(`Save failed — profile error: ${(profileErr as Error).message}`);
        setIsSubmittingScore(false);
        return;
      }

      const { error } = await supabase.from("scores").insert({
        user_id: user.id,
        username,
        difficulty: pendingScore.difficulty,
        completion_seconds: pendingScore.completionSeconds,
        points: pendingScore.points
      });

      if (error) {
        setStatus(`Save failed — ${error.message}`);
        setIsSubmittingScore(false);
        return;
      }

      localStorage.removeItem(PENDING_SCORE_KEY);
      setPendingScore(null);
      setSavedScore(true);
      setIsSubmittingScore(false);
      setStatus(`+${pendingScore.points} points saved to leaderboard.`);
    } catch (err) {
      setStatus(`Save failed — ${(err as Error).message}`);
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
          return;
        }

        setIsAuthenticated(true);
        try {
          const name = await getOrCreateUsername(user);
          if (mounted) setDisplayName(name);
        } catch {
          if (mounted) setDisplayName(user.email?.split("@")[0] ?? "Player");
        }
      } catch {
        if (mounted) {
          setIsAuthenticated(false);
          setDisplayName("");
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
        setDisplayName("");
        return;
      }

      setIsAuthenticated(true);
      try {
        const name = await getOrCreateUsername(user);
        if (mounted) setDisplayName(name);
      } catch {
        if (mounted) setDisplayName(user.email?.split("@")[0] ?? "Player");
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

    // Always persist to localStorage first — score is never lost regardless of what happens next
    const pending: PendingScore = {
      difficulty: game.difficulty,
      completionSeconds: game.elapsedSeconds,
      points,
      createdAt: Date.now()
    };
    localStorage.setItem(PENDING_SCORE_KEY, JSON.stringify(pending));
    localStorage.removeItem(GAME_STORAGE_KEY);
    setPendingScore(pending);

    if (!supabaseConfigured) {
      setIsSubmittingScore(false);
      setStatus(`Solved. +${points} points pending — connect to save.`);
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsSubmittingScore(false);
      setStatus(`Solved offline. +${points} points pending — connect to save.`);
      return;
    }

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = data.session?.user;
      if (!user) {
        setIsAuthenticated(false);
        setIsSubmittingScore(false);
        setStatus(`Solved. +${points} points pending — log in to save.`);
        return;
      }

      let username: string;
      try {
        username = await getOrCreateUsername(user);
        setDisplayName(username);
      } catch (profileErr) {
        setIsSubmittingScore(false);
        setStatus(`Solved. +${points} pts pending — profile error: ${(profileErr as Error).message}`);
        return;
      }

      const { error } = await supabase.from("scores").insert({
        user_id: user.id,
        username,
        difficulty: game.difficulty,
        completion_seconds: game.elapsedSeconds,
        points
      });

      if (error) {
        setIsSubmittingScore(false);
        setStatus(`Solved. +${points} pts pending — save failed: ${error.message}`);
        return;
      }

      localStorage.removeItem(GAME_STORAGE_KEY);
      localStorage.removeItem(PENDING_SCORE_KEY);
      setPendingScore(null);
      setSavedScore(true);
      setIsSubmittingScore(false);
      setStatus(`Solved. +${points} points recorded.`);
    } catch (err) {
      setIsSubmittingScore(false);
      setStatus(`Solved. +${points} pts pending — error: ${(err as Error).message}`);
    }
  }, [game, isSubmittingScore, savedScore, supabaseConfigured]);

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
      <section className="game-panel">
        <div className="game-bar">
          <Button
            className="home-btn"
            onClick={() => router.push("/")}
            aria-label="Go to home"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </Button>
          <span className="game-bar-info">
            <strong>{difficultyLabels[game.difficulty]}</strong>
            <span className="game-bar-sep">·</span>
            <strong>{formatSeconds(game.elapsedSeconds)}</strong>
            {game.paused ? <span className="game-bar-sep text-muted">Paused</span> : null}
            <span className="game-bar-sep">·</span>
            <span className="text-muted">{displayName || (isAuthenticated ? "Player" : "Guest")}</span>
          </span>
          <Button
            onClick={togglePause}
            disabled={savedScore || isSubmittingScore || victoryLocked}
          >
            {game.paused ? "Resume" : "Pause"}
          </Button>
        </div>

        {pendingScore && !savedScore ? (
          <div style={{ marginBottom: "0.5rem" }}>
            <Button
              variant="primary"
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
            </Button>
          </div>
        ) : null}

        <div className="grid-wrap">
          <div className={`grid ${game.paused ? "paused" : ""}`} aria-label="sudoku grid" style={savedScore || isSubmittingScore || victoryLocked ? { pointerEvents: "none", opacity: 0.65 } : undefined}>
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
                const isInSelectedLine = selected !== null && (selected.row === row || selected.col === col);
                let cellBackground = fixed ? "var(--cell-fixed)" : "transparent";
                if (isInSelectedLine) {
                  cellBackground = fixed ? "var(--cell-line-fixed)" : "var(--cell-line)";
                }
                if (isSameValue) {
                  cellBackground = "var(--cell-same)";
                }

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
          {game.paused ? (
            <div className="grid-pause-overlay">
              <Button variant="primary" onClick={togglePause}>
                Resume
              </Button>
            </div>
          ) : null}
        </div>

        {!game.paused ? (
          <div className="digit-pad">
            {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => {
              const completed = digitCounts[digit] >= 9;
              const selectedDigit = highlightedDigit === digit;
              return (
                <Button
                  key={digit}
                  disabled={completed || savedScore || isSubmittingScore || victoryLocked}
                  onClick={() => {
                    setActiveDigit(digit);
                    if (!selected) return;
                    updateCellValue(selected.row, selected.col, digit);
                  }}
                  style={{
                    minWidth: 42,
                    fontWeight: 700,
                    background: selectedDigit ? "var(--cell-same)" : undefined,
                    borderColor: selectedDigit ? "var(--digit-selected-border)" : undefined
                  }}
                  aria-label={`Highlight digit ${digit}`}
                >
                  {digit}
                </Button>
              );
            })}
            <Button
              disabled={!selectedIsEditable || savedScore || isSubmittingScore || victoryLocked}
              onClick={() => {
                if (!selected) return;
                updateCellValue(selected.row, selected.col, 0);
              }}
              aria-label="Clear selected cell"
            >
              Clear
            </Button>
          </div>
        ) : null}

        {status ? <p className={/(Solved|saved|pending)/i.test(status) ? "" : "text-danger"}>{status}</p> : null}
      </section>

      {showCompletionModal ? (
        <div className="completion-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="completion-title">
          <div className="completion-modal">
            <h2 id="completion-title">Game finished</h2>
            <p className="text-muted">
              {savedScore
                ? `+${status.match(/\+(\d+)/)?.[1] ?? "?"} points saved to the leaderboard.`
                : isAuthenticated
                  ? status
                  : "Log in to save your score to the leaderboard."}
            </p>
            <div className="completion-modal-actions">
              {difficultyValues.map((d) => (
                <Button
                  key={`modal-${d}`}
                  onClick={() => {
                    setActiveDigit(null);
                    setSelected(null);
                    router.replace(`/game?difficulty=${d}&new=1`);
                  }}
                >
                  New {difficultyLabels[d]}
                </Button>
              ))}
              {!isAuthenticated && (
                <Button variant="primary" onClick={() => router.push("/login")}>
                  Log in to save score
                </Button>
              )}
              {isAuthenticated && !savedScore && pendingScore && (
                <Button variant="primary" disabled={isSubmittingScore} onClick={() => void submitPendingScore()}>
                  {isSubmittingScore ? "Saving..." : "Retry saving score"}
                </Button>
              )}
              <Button variant="primary" onClick={() => router.push("/leaderboard")}>
                Go to leaderboard
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
