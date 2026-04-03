import { Difficulty } from "@/lib/types";
import { DAILY_CHALLENGE, QUERY_PARAMS, ROUTES, STORAGE_KEYS } from "@/lib/constants";

export const STANDARD_GAME_STORAGE_KEY = STORAGE_KEYS.ACTIVE_GAME;
export const DAILY_GAME_STORAGE_PREFIX = STORAGE_KEYS.DAILY_GAME_PREFIX;

export type DailyChallengeRow = {
  challenge_date: string;
  difficulty: Difficulty;
  puzzle_canonical: string;
  is_completed?: boolean;
};

export function getLocalDateKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isIsoDateKey(value: string | null | undefined): value is string {
  return !!value && DAILY_CHALLENGE.ISO_DATE_REGEX.test(value);
}

export function getDailyGameStorageKey(challengeDate: string): string {
  return `${DAILY_GAME_STORAGE_PREFIX}${challengeDate}`;
}

export function getStoredGameResumePath(storage: Storage): string | null {
  if (storage.getItem(STANDARD_GAME_STORAGE_KEY)) {
    return ROUTES.GAME;
  }

  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key || !key.startsWith(DAILY_GAME_STORAGE_PREFIX)) {
      continue;
    }

    const challengeDate = key.slice(DAILY_GAME_STORAGE_PREFIX.length);
    if (isIsoDateKey(challengeDate) && storage.getItem(key)) {
      return `${ROUTES.GAME}?${QUERY_PARAMS.MODE}=daily&${QUERY_PARAMS.DATE}=${challengeDate}`;
    }
  }

  return null;
}

export function canonicalPuzzleToBoard(canonical: string): number[][] {
  if (!DAILY_CHALLENGE.PUZZLE_CANONICAL_REGEX.test(canonical)) {
    throw new Error("Invalid daily challenge format.");
  }

  const values = canonical.split("").map((value) => Number(value));
  return Array.from({ length: 9 }, (_, row) => values.slice(row * 9, row * 9 + 9));
}
