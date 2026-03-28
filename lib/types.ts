import { AppDifficulty } from "@/lib/constants";

export type Difficulty = AppDifficulty;

export type SudokuGameState = {
  puzzle: number[][];
  solution: number[][];
  board: number[][];
  startedAt: number;
  elapsedSeconds: number;
  paused: boolean;
  difficulty: Difficulty;
  gameName?: string;
};

export type ScoreRow = {
  id: string;
  user_id: string;
  difficulty: Difficulty;
  completion_seconds: number;
  points: number;
  is_daily_challenge?: boolean;
  challenge_date?: string | null;
  created_at: string;
};
