import { AppDifficulty, SUDOKU, SUDOKU_DIFFICULTY_CLUES } from "@/lib/constants";

export type SudokuDifficulty = AppDifficulty;

/**
 * Generates Sudoku boards and puzzles for supported difficulties.
 */
export class SudokuGenerator {
  /**
   * Creates a new 9x9 board initialized with zeros.
   *
   * @returns A 9x9 matrix filled with `0`.
   */
  public createEmptyBoard(): number[][] {
    return Array.from({ length: SUDOKU.SIZE }, () => Array(SUDOKU.SIZE).fill(0));
  }

  /**
   * Generates a Sudoku puzzle and its full solution for the given difficulty.
   *
   * @param difficulty Target puzzle difficulty.
   * @returns The puzzle grid and its solved counterpart.
   */
  public createSudoku(difficulty: SudokuDifficulty): { puzzle: number[][]; solution: number[][] } {
    const solution = this.generateSolvedBoard();
    const puzzle = this.makePuzzle(solution, SUDOKU_DIFFICULTY_CLUES[difficulty]);
    return { puzzle, solution };
  }

  private cloneBoard(board: number[][]): number[][] {
    return board.map((row) => [...row]);
  }

  private shuffle(nums: number[]): number[] {
    const arr = [...nums];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private isValid(board: number[][], row: number, col: number, value: number): boolean {
    for (let i = 0; i < SUDOKU.SIZE; i += 1) {
      if (board[row][i] === value || board[i][col] === value) {
        return false;
      }
    }

    const rowStart = Math.floor(row / SUDOKU.BOX_SIZE) * SUDOKU.BOX_SIZE;
    const colStart = Math.floor(col / SUDOKU.BOX_SIZE) * SUDOKU.BOX_SIZE;
    for (let r = rowStart; r < rowStart + SUDOKU.BOX_SIZE; r += 1) {
      for (let c = colStart; c < colStart + SUDOKU.BOX_SIZE; c += 1) {
        if (board[r][c] === value) {
          return false;
        }
      }
    }

    return true;
  }

  private fillBoard(board: number[][]): boolean {
    for (let row = 0; row < SUDOKU.SIZE; row += 1) {
      for (let col = 0; col < SUDOKU.SIZE; col += 1) {
        if (board[row][col] === 0) {
          const candidates = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const value of candidates) {
            if (this.isValid(board, row, col, value)) {
              board[row][col] = value;
              if (this.fillBoard(board)) {
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

  private generateSolvedBoard(): number[][] {
    const board = this.createEmptyBoard();
    this.fillBoard(board);
    return board;
  }

  private makePuzzle(solution: number[][], clues: number): number[][] {
    const puzzle = this.cloneBoard(solution);
    const totalToRemove = SUDOKU.SIZE * SUDOKU.SIZE - clues;
    const positions = this.shuffle(Array.from({ length: SUDOKU.SIZE * SUDOKU.SIZE }, (_, i) => i));

    for (let i = 0; i < totalToRemove; i += 1) {
      const idx = positions[i];
      const row = Math.floor(idx / SUDOKU.SIZE);
      const col = idx % SUDOKU.SIZE;
      puzzle[row][col] = 0;
    }

    return puzzle;
  }
}

const defaultGenerator = new SudokuGenerator();

/**
 * Convenience wrapper for creating an empty Sudoku board.
 *
 * @returns A 9x9 matrix filled with `0`.
 */
export function createEmptyBoard(): number[][] {
  return defaultGenerator.createEmptyBoard();
}

/**
 * Convenience wrapper for generating a Sudoku puzzle and solution.
 *
 * @param difficulty Target puzzle difficulty.
 * @returns The puzzle grid and its solved counterpart.
 */
export function createSudoku(difficulty: SudokuDifficulty): { puzzle: number[][]; solution: number[][] } {
  return defaultGenerator.createSudoku(difficulty);
}
