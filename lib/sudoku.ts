import { Difficulty } from "@/lib/types";

const SIZE = 9;
const BOX_SIZE = 3;

const difficultyClues: Record<Difficulty, number> = {
  easy: 40,
  medium: 32,
  hard: 26
};

export function createEmptyBoard(): number[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => [...row]);
}

function shuffle(nums: number[]): number[] {
  const arr = [...nums];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValid(board: number[][], row: number, col: number, value: number): boolean {
  for (let i = 0; i < SIZE; i += 1) {
    if (board[row][i] === value || board[i][col] === value) {
      return false;
    }
  }

  const rowStart = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const colStart = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = rowStart; r < rowStart + BOX_SIZE; r += 1) {
    for (let c = colStart; c < colStart + BOX_SIZE; c += 1) {
      if (board[r][c] === value) {
        return false;
      }
    }
  }

  return true;
}

function fillBoard(board: number[][]): boolean {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col] === 0) {
        const candidates = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const value of candidates) {
          if (isValid(board, row, col, value)) {
            board[row][col] = value;
            if (fillBoard(board)) {
              return true;
            }
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }

  return true;
}

function generateSolvedBoard(): number[][] {
  const board = createEmptyBoard();
  fillBoard(board);
  return board;
}

function makePuzzle(solution: number[][], clues: number): number[][] {
  const puzzle = cloneBoard(solution);
  const totalToRemove = SIZE * SIZE - clues;
  const positions = shuffle(Array.from({ length: SIZE * SIZE }, (_, i) => i));

  for (let i = 0; i < totalToRemove; i += 1) {
    const idx = positions[i];
    const row = Math.floor(idx / SIZE);
    const col = idx % SIZE;
    puzzle[row][col] = 0;
  }

  return puzzle;
}

export function createSudoku(difficulty: Difficulty): { puzzle: number[][]; solution: number[][] } {
  const solution = generateSolvedBoard();
  const puzzle = makePuzzle(solution, difficultyClues[difficulty]);
  return { puzzle, solution };
}

export function validateProgress(board: number[][], puzzle: number[][]): boolean {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const value = board[row][col];
      if (value < 1 || value > 9) {
        return false;
      }
      if (puzzle[row][col] !== 0 && puzzle[row][col] !== value) {
        return false;
      }
    }
  }

  const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9].join("");

  for (let row = 0; row < SIZE; row += 1) {
    const rowValues = [...board[row]].sort((a, b) => a - b).join("");
    if (rowValues !== expected) {
      return false;
    }
  }

  for (let col = 0; col < SIZE; col += 1) {
    const colValues = Array.from({ length: SIZE }, (_, r) => board[r][col]).sort((a, b) => a - b).join("");
    if (colValues !== expected) {
      return false;
    }
  }

  for (let boxRow = 0; boxRow < SIZE; boxRow += BOX_SIZE) {
    for (let boxCol = 0; boxCol < SIZE; boxCol += BOX_SIZE) {
      const box: number[] = [];
      for (let r = 0; r < BOX_SIZE; r += 1) {
        for (let c = 0; c < BOX_SIZE; c += 1) {
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
    medium: { base: 700, bonusMax: 500, limitSeconds: 3 * 60 * 60 + 30 * 60 },
    hard: { base: 1100, bonusMax: 800, limitSeconds: 4 * 60 * 60 }
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
