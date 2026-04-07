import { Difficulty } from "@/lib/types";
import {
  createEmptyBoard,
  createSudoku as createSudokuShared,
  SudokuDifficulty
} from "@/lib/sudoku-core";
import { SUDOKU } from "@/lib/constants";

export { createEmptyBoard };

export function createSudoku(difficulty: Difficulty): { puzzle: number[][]; solution: number[][] } {
  return createSudokuShared(difficulty as SudokuDifficulty);
}

export function validateProgress(board: number[][], puzzle: number[][]): boolean {
  for (let row = 0; row < SUDOKU.SIZE; row += 1) {
    for (let col = 0; col < SUDOKU.SIZE; col += 1) {
      const value = board[row][col];
      if (value < 1 || value > 9) {
        return false;
      }
      if (puzzle[row][col] !== 0 && puzzle[row][col] !== value) {
        return false;
      }
    }
  }

  const expected = SUDOKU.EXPECTED_DIGITS_SORTED;

  for (let row = 0; row < SUDOKU.SIZE; row += 1) {
    const rowValues = [...board[row]].sort((a, b) => a - b).join("");
    if (rowValues !== expected) {
      return false;
    }
  }

  for (let col = 0; col < SUDOKU.SIZE; col += 1) {
    const colValues = Array.from({ length: SUDOKU.SIZE }, (_, r) => board[r][col]).sort((a, b) => a - b).join("");
    if (colValues !== expected) {
      return false;
    }
  }

  for (let boxRow = 0; boxRow < SUDOKU.SIZE; boxRow += SUDOKU.BOX_SIZE) {
    for (let boxCol = 0; boxCol < SUDOKU.SIZE; boxCol += SUDOKU.BOX_SIZE) {
      const box: number[] = [];
      for (let r = 0; r < SUDOKU.BOX_SIZE; r += 1) {
        for (let c = 0; c < SUDOKU.BOX_SIZE; c += 1) {
          box.push(board[boxRow + r][boxCol + c]);
        }
      }
      if (box.sort((a, b) => a - b).join("") !== expected) {
        return false;
      }
    }
  }

  return true;
}

export function calculatePoints(difficulty: Difficulty, completionSeconds: number): number {
  const config = {
    easy: { base: 400, bonusMax: 300, limitSeconds: 3 * 60 * 60 },
    medium: { base: 550, bonusMax: 400, limitSeconds: 3 * 60 * 60 + 15 * 60 },
    difficult: { base: 900, bonusMax: 700, limitSeconds: 4 * 60 * 60 },
    hard: { base: 1300, bonusMax: 1000, limitSeconds: 4 * 60 * 60 + 30 * 60 },
    extrem: { base: 1700, bonusMax: 1300, limitSeconds: 5 * 60 * 60 }
  }[difficulty];

  const elapsed = Math.max(0, completionSeconds);
  const ratio = Math.max(0, Math.min(1, 1 - elapsed / config.limitSeconds));
  const bonus = Math.round(config.bonusMax * ratio);
  return config.base + bonus;
}

export function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(total % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}
