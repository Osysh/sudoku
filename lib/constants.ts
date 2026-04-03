export const ROUTES = {
  HOME: "/",
  GAME: "/game",
  LOGIN: "/login",
  LEADERBOARD: "/leaderboard"
} as const;

export const QUERY_PARAMS = {
  MODE: "mode",
  DIFFICULTY: "difficulty",
  DATE: "date",
  NEW: "new"
} as const;

export const STORAGE_KEYS = {
  ACTIVE_GAME: "sudoky-active-game",
  DAILY_GAME_PREFIX: "sudoky-daily-game-",
  THEME_MODE: "sudoky-theme-mode",
  LEGACY_BG_MODE: "sudoky-bg-mode",
  LOCALE: "sudoky-locale"
} as const;

export const DIFFICULTY_VALUES = ["easy", "medium", "hard"] as const;
export type AppDifficulty = (typeof DIFFICULTY_VALUES)[number];

export const DIFFICULTY_LABELS: Record<AppDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard"
};

export const SUDOKU = {
  SIZE: 9,
  BOX_SIZE: 3,
  DIGITS: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const,
  EXPECTED_DIGITS_SORTED: "123456789"
} as const;

export const SUDOKU_DIFFICULTY_CLUES: Record<AppDifficulty, number> = {
  easy: 40,
  medium: 32,
  hard: 26
};

export const DAILY_CHALLENGE = {
  ISO_DATE_REGEX: /^\d{4}-\d{2}-\d{2}$/,
  PUZZLE_CANONICAL_REGEX: /^[0-9]{81}$/,
  GAUSSIAN_MU: 2.0,
  GAUSSIAN_SIGMA: 0.7,
  GENERATION_MAX_ATTEMPTS_PER_DAY: 80,
  GENERATION_DEFAULT_MAX_RETRIES: 3,
  GENERATION_MAX_RETRIES_CAP: 5,
  HASH_PAGE_SIZE: 1000
} as const;

export const THEME_MODES = ["pink", "swiss_alp", "paris", "leopard", "yquem", "grimpe", "chocolat"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const THEME_IMAGE_BY_MODE: Record<ThemeMode, string | null> = {
  pink: null,
  swiss_alp: "/swiss.jpg",
  paris: "/paris.jpeg",
  leopard: "/leopard.jpeg",
  yquem: "/yquem.jpeg",
  grimpe: "/grimpe.jpg",
  chocolat: "/chocolat.jpg"
};

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
