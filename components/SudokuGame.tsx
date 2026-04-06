"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import BackgroundToggle from "@/components/BackgroundToggle";
import { supabase } from "@/lib/supabase";
import { useAuthProfile } from "@/lib/hooks/useAuthProfile";
import { calculatePoints, createSudoku, formatSeconds, validateProgress } from "@/lib/sudoku";
import { withTimeout } from "@/lib/withTimeout";
import { Difficulty, SudokuGameState } from "@/lib/types";
import { DIFFICULTY_VALUES, QUERY_PARAMS, ROUTES } from "@/lib/constants";
import { useT } from "@/lib/i18n/useT";
import {
  canonicalPuzzleToBoard,
  DailyChallengeRow,
  getDailyGameStorageKey,
  getLocalDateKey,
  isIsoDateKey,
  STANDARD_GAME_STORAGE_KEY
} from "@/lib/dailyChallenge";

type GameOutcome = "playing" | "victory" | "defeat";

export default function SudokuGame() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useT();
  const requestedDifficulty = (params.get(QUERY_PARAMS.DIFFICULTY) as Difficulty) || "easy";
  const forceNew = params.get(QUERY_PARAMS.NEW) === "1";
  const isDailyMode = params.get(QUERY_PARAMS.MODE) === "daily";
  const requestedDailyDate = params.get(QUERY_PARAMS.DATE);
  const localDate = getLocalDateKey();
  const dailyDate = isIsoDateKey(requestedDailyDate) ? requestedDailyDate : localDate;
  const gameStorageKey = isDailyMode ? getDailyGameStorageKey(dailyDate) : STANDARD_GAME_STORAGE_KEY;
  const { isAuthenticated, user, isSupabaseConfigured: supabaseConfigured, isLoading: isAuthLoading } = useAuthProfile();

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
    () => (DIFFICULTY_VALUES.includes(requestedDifficulty) ? requestedDifficulty : "easy"),
    [requestedDifficulty]
  );
  const isPaused = game?.paused ?? true;

  const mostFrequentDigit = (puzzle: number[][]): number | null => {
    const counts = new Array(10).fill(0);
    for (const row of puzzle) for (const v of row) if (v > 0) counts[v]++;
    let best = 0, bestCount = 0;
    for (let d = 1; d <= 9; d++) if (counts[d] > bestCount) { bestCount = counts[d]; best = d; }
    return best > 0 ? best : null;
  };

  useEffect(() => {
    let cancelled = false;

    const resetRoundState = () => {
      setSavedScore(false);
      setIsSubmittingScore(false);
      setVictoryLocked(false);
      setOutcome("playing");
      setFinalScore(null);
      setStatus("");
    };

    const loadSavedGame = (): SudokuGameState | null => {
      const rawGame = localStorage.getItem(gameStorageKey);
      if (!rawGame) {
        return null;
      }
      try {
        return JSON.parse(rawGame) as SudokuGameState;
      } catch {
        localStorage.removeItem(gameStorageKey);
        return null;
      }
    };

    const startLocalGame = () => {
      if (!forceNew) {
        const saved = loadSavedGame();
        if (saved) {
          setGame(saved);
          setActiveDigit(mostFrequentDigit(saved.puzzle));
          return;
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
      setActiveDigit(mostFrequentDigit(puzzle));
      localStorage.removeItem(gameStorageKey);
    };

    const startDailyGame = async () => {
      if (!isIsoDateKey(dailyDate)) {
        setStatus(t("game.invalidDailyDate"));
        return;
      }

      if (!supabaseConfigured) {
        setStatus(t("game.dailyNotConfigured"));
        return;
      }

      if (isAuthLoading) {
        return;
      }

      if (!user) {
        router.replace(`${ROUTES.LOGIN}?${QUERY_PARAMS.MODE}=login`);
        return;
      }

      const { data: rows, error } = await supabase.rpc("get_daily_challenge_for_date", {
        p_local_date: dailyDate
      });
      if (error) {
        throw error;
      }

      const row = (rows?.[0] as DailyChallengeRow | undefined) ?? null;
      if (!row) {
        setStatus(t("game.noDailyForDate"));
        return;
      }

      if (row.is_completed) {
        setStatus(t("game.dailyAlreadyCompleted"));
        router.replace(ROUTES.HOME);
        return;
      }

      if (!forceNew) {
        const saved = loadSavedGame();
        if (saved) {
          setGame(saved);
          setActiveDigit(mostFrequentDigit(saved.puzzle));
          return;
        }
      }

      const puzzle = canonicalPuzzleToBoard(row.puzzle_canonical);
      if (!cancelled) {
        setActiveDigit(mostFrequentDigit(puzzle));
        setGame({
          puzzle,
          solution: puzzle.map((line) => [...line]),
          board: puzzle.map((line) => [...line]),
          startedAt: Date.now(),
          elapsedSeconds: 0,
          paused: false,
          difficulty: row.difficulty,
          gameName: `Daily ${row.challenge_date}`
        });
      }
    };

    setGame(null);
    resetRoundState();

    if (isDailyMode) {
      void startDailyGame().catch(() => {
        if (!cancelled) {
          setStatus(t("game.couldNotLoadDaily"));
        }
      });
    } else {
      startLocalGame();
    }

    return () => {
      cancelled = true;
    };
  }, [dailyDate, difficulty, forceNew, gameStorageKey, isAuthLoading, isDailyMode, router, supabaseConfigured, t, user]);

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
    localStorage.setItem(gameStorageKey, JSON.stringify(game));
  }, [game, gameStorageKey, savedScore, victoryLocked]);

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
      setStatus(t("game.scoreNotConfigured"));
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus(t("game.offlineCannotSave"));
      return;
    }

    setIsSubmittingScore(true);
    setStatus("");

    let saved = false;

    try {
      if (!user) {
        router.push(ROUTES.LOGIN);
        return;
      }

      const { error } = await withTimeout(
        supabase.from("scores").insert({
          user_id: user.id,
          difficulty: game.difficulty,
          completion_seconds: game.elapsedSeconds,
          points: finalScore,
          is_daily_challenge: isDailyMode,
          challenge_date: isDailyMode ? dailyDate : null
        }),
        10000,
        "Score save"
      );

      if (error) {
        throw error;
      }

      localStorage.removeItem(gameStorageKey);
      setSavedScore(true);
      saved = true;
      router.push(ROUTES.LEADERBOARD);
    } catch (error) {
      console.error("Score save failed", error);
      setStatus(t("game.scoreSaveError"));
    } finally {
      if (!saved) {
        setIsSubmittingScore(false);
      }
    }
  }, [dailyDate, finalScore, game, gameStorageKey, isDailyMode, isSubmittingScore, outcome, router, savedScore, supabaseConfigured, t, user]);

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
        <p>{status || t("common.loading")}</p>
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
      localStorage.setItem(gameStorageKey, JSON.stringify(next));
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
            onClick={() => router.push(ROUTES.HOME)}
            aria-label={t("game.goHome")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </Button>
          <span className="game-bar-info">
            <strong>{t(`difficulty.${game.difficulty}`)}</strong>
            {isDailyMode ? (
              <>
                <span className="game-bar-sep">·</span>
                <strong>{t("game.dailyLabel", { date: dailyDate })}</strong>
              </>
            ) : null}
            <span className="game-bar-sep">·</span>
            <strong>{formatSeconds(game.elapsedSeconds)}</strong>
            {game.paused ? <span className="game-bar-sep text-muted">{t("game.paused")}</span> : null}
          </span>
          <div className="game-controls">
            <BackgroundToggle />
          </div>
        </div>

        {outcome === "victory" ? (
          <div className="game-result-banner game-result-banner--victory">
            <p className="game-result-title">🏆 {t("game.victoryTitle", { score: finalScore ?? 0 })}</p>
            <Button variant="primary" disabled={isSubmittingScore} onClick={() => void saveScoreAndRedirect()}>
              {isSubmittingScore ? t("game.saving") : isAuthenticated ? t("game.saveScore") : t("game.logInToSave")}
            </Button>
          </div>
        ) : null}
        {outcome === "defeat" ? (
          <div className="game-result-banner game-result-banner--defeat">
            <p className="game-result-title">{t("game.defeatTitle")}</p>
            <div className="game-result-actions">
              <Button variant="primary" onClick={retryCurrentGrid}>
                {t("game.retryGrid")}
              </Button>
              <Button onClick={() => router.push(ROUTES.HOME)}>{t("common.home")}</Button>
            </div>
          </div>
        ) : null}

        {outcome === "playing" ? (
          <div className="grid-top-actions">
            <Button
              onClick={togglePause}
              disabled={savedScore || isSubmittingScore || victoryLocked}
            >
              {game.paused ? t("common.resume") : t("common.pause")}
            </Button>
          </div>
        ) : null}

        <div className="grid-wrap">
          <div className={`grid ${game.paused ? "paused" : ""}`} aria-label={t("game.sudokuGrid")} style={savedScore || isSubmittingScore || victoryLocked ? { pointerEvents: "none", opacity: 0.65 } : undefined}>
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
                      aria-label={t("game.rowCol", { row: row + 1, col: col + 1 })}
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
                {t("common.resume")}
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
                  aria-label={t("game.highlightDigit", { digit })}
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
              aria-label={t("game.clearSelectedCell")}
            >
              {t("common.clear")}
            </Button>
          </div>
        ) : null}

        {status ? <p className="text-danger">{status}</p> : null}
      </section>
    </main>
  );
}
