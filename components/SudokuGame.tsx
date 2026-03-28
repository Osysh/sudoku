"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrCreateUsername } from "@/lib/profile";
import Button from "@/components/Button";
import BackgroundToggle from "@/components/BackgroundToggle";
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

type GameOutcome = "playing" | "victory" | "defeat";

export default function SudokuGame() {
  const router = useRouter();
  const params = useSearchParams();
  const requestedDifficulty = (params.get("difficulty") as Difficulty) || "easy";
  const forceNew = params.get("new") === "1";

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);
  const [game, setGame] = useState<SudokuGameState | null>(null);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [activeDigit, setActiveDigit] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");
  const [savedScore, setSavedScore] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [victoryLocked, setVictoryLocked] = useState(false);
  const [outcome, setOutcome] = useState<GameOutcome>("playing");
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const difficulty: Difficulty = useMemo(
    () => (difficultyValues.includes(requestedDifficulty) ? requestedDifficulty : "easy"),
    [requestedDifficulty]
  );
  const isPaused = game?.paused ?? true;

  useEffect(() => {
    if (!forceNew) {
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
    setOutcome("playing");
    setFinalScore(null);
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
          await getOrCreateUsername(user);
        } catch {
          // profile creation failed, auth still valid
        }
      } catch {
        if (mounted) {
          setIsAuthenticated(false);
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
        return;
      }

      setIsAuthenticated(true);
      try {
        await getOrCreateUsername(user);
      } catch {
        // ignore
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isPaused || savedScore || victoryLocked) {
      return;
    }

    const id = setInterval(() => {
      setGame((prev) => {
        if (!prev || prev.paused) return prev;
        return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isPaused, savedScore, victoryLocked]);

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

  const saveScoreAndRedirect = useCallback(async () => {
    if (!game || outcome !== "victory" || finalScore === null || savedScore || isSubmittingScore) {
      return;
    }

    if (!supabaseConfigured) {
      setStatus("Score saving is not configured.");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("You are offline. Connect to save your score.");
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
        setIsSubmittingScore(false);
        router.push("/login");
        return;
      }

      const { error } = await supabase.from("scores").insert({
        user_id: user.id,
        difficulty: game.difficulty,
        completion_seconds: game.elapsedSeconds,
        points: finalScore
      });

      if (error) {
        throw error;
      }

      localStorage.removeItem(GAME_STORAGE_KEY);
      setSavedScore(true);
      router.push("/leaderboard");
    } catch {
      setStatus("Could not save score. Please try again.");
      setIsSubmittingScore(false);
    }
  }, [finalScore, game, isSubmittingScore, outcome, router, savedScore, supabaseConfigured]);

  const retryCurrentGrid = useCallback(() => {
    setGame((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        board: prev.puzzle.map((row) => [...row]),
        elapsedSeconds: 0,
        startedAt: Date.now(),
        paused: false
      };
    });
    setSelected(null);
    setActiveDigit(null);
    setSavedScore(false);
    setIsSubmittingScore(false);
    setVictoryLocked(false);
    setOutcome("playing");
    setFinalScore(null);
    setStatus("");
  }, []);

  useEffect(() => {
    if (!game || game.paused || savedScore || isSubmittingScore || victoryLocked) {
      return;
    }

    const hasEmptyCell = game.board.some((row) => row.some((value) => value === 0));
    if (hasEmptyCell) {
      return;
    }

    if (validateProgress(game.board, game.puzzle)) {
      setOutcome("victory");
      setFinalScore(calculatePoints(game.difficulty, game.elapsedSeconds));
      setVictoryLocked(true);
      setStatus("");
      return;
    }

    setOutcome("defeat");
    setFinalScore(null);
    setVictoryLocked(true);
    setStatus("");
  }, [game, isSubmittingScore, savedScore, victoryLocked]);

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
          </span>
          <div className="game-controls">
            <BackgroundToggle />
          </div>
        </div>

        {outcome === "victory" ? (
          <div className="game-result-banner game-result-banner--victory">
            <p className="game-result-title">🏆 Victory! Score: {finalScore ?? 0}</p>
            <Button variant="primary" disabled={isSubmittingScore} onClick={() => void saveScoreAndRedirect()}>
              {isSubmittingScore ? "Saving..." : isAuthenticated ? "Save score" : "Log in to save score"}
            </Button>
          </div>
        ) : null}
        {outcome === "defeat" ? (
          <div className="game-result-banner game-result-banner--defeat">
            <p className="game-result-title">Defeat. This grid has mistakes.</p>
            <div className="game-result-actions">
              <Button variant="primary" onClick={retryCurrentGrid}>
                Retry grid
              </Button>
              <Button onClick={() => router.push("/")}>Home</Button>
            </div>
          </div>
        ) : null}

        {outcome === "playing" ? (
          <div className="grid-top-actions">
            <Button
              onClick={togglePause}
              disabled={savedScore || isSubmittingScore || victoryLocked}
            >
              {game.paused ? "Resume" : "Pause"}
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

        {status ? <p className="text-danger">{status}</p> : null}
      </section>
    </main>
  );
}
