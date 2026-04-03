"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { DailyChallengeRow, getLocalDateKey } from "@/lib/dailyChallenge";
import { supabase, assertSupabaseEnv } from "@/lib/supabase";
import { Difficulty } from "@/lib/types";

export type DailyChallengeStatus = {
  loading: boolean;
  available: boolean;
  completed: boolean;
  difficulty: Difficulty | null;
  date: string;
  message: string | null;
};

const initialStatus = (): DailyChallengeStatus => ({
  loading: true,
  available: false,
  completed: false,
  difficulty: null,
  date: getLocalDateKey(),
  message: null
});

export function useDailyChallengeStatus(user: User | null | undefined): DailyChallengeStatus {
  const [daily, setDaily] = useState<DailyChallengeStatus>(initialStatus);

  useEffect(() => {
    let mounted = true;

    if (user === undefined) {
      setDaily((prev) => ({ ...prev, loading: true, date: getLocalDateKey(), message: null }));
      return () => {
        mounted = false;
      };
    }

    try {
      assertSupabaseEnv();
    } catch {
      setDaily({
        loading: false,
        available: false,
        completed: false,
        difficulty: null,
        date: getLocalDateKey(),
        message: "Daily challenge is unavailable right now."
      });
      return () => {
        mounted = false;
      };
    }

    if (!user) {
      setDaily({
        loading: false,
        available: false,
        completed: false,
        difficulty: null,
        date: getLocalDateKey(),
        message: "Sign in to play today's daily challenge."
      });
      return () => {
        mounted = false;
      };
    }

    const loadDaily = async () => {
      setDaily((prev) => ({ ...prev, loading: true, date: getLocalDateKey() }));
      const date = getLocalDateKey();

      const { data: rows, error } = await supabase.rpc("get_daily_challenge_for_date", {
        p_local_date: date
      });

      if (error) {
        if (mounted) {
          setDaily({
            loading: false,
            available: false,
            completed: false,
            difficulty: null,
            date,
            message: "Daily challenge is unavailable right now."
          });
        }
        return;
      }

      const row = (rows?.[0] as DailyChallengeRow | undefined) ?? null;
      if (!row) {
        if (mounted) {
          setDaily({
            loading: false,
            available: false,
            completed: false,
            difficulty: null,
            date,
            message: "No daily challenge has been generated yet."
          });
        }
        return;
      }

      if (mounted) {
        setDaily({
          loading: false,
          available: true,
          completed: !!row.is_completed,
          difficulty: row.difficulty,
          date: row.challenge_date,
          message: null
        });
      }
    };

    void loadDaily();

    return () => {
      mounted = false;
    };
  }, [user]);

  return daily;
}
