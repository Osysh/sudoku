"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getOrCreateUsername } from "@/lib/profile";
import { assertSupabaseEnv, supabase } from "@/lib/supabase";

type AuthProfileState = {
  isAuthenticated: boolean;
  displayName: string;
  user: User | null;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
};

const GUEST_NAME = "Guest";

async function resolveDisplayName(user: User): Promise<string> {
  try {
    return await getOrCreateUsername(user);
  } catch {
    return user.email ?? "Player";
  }
}

export function useAuthProfile(): AuthProfileState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState(GUEST_NAME);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(true);

  useEffect(() => {
    try {
      assertSupabaseEnv();
      setIsSupabaseConfigured(true);
    } catch {
      setIsSupabaseConfigured(false);
      setIsAuthenticated(false);
      setDisplayName(GUEST_NAME);
      setUser(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const applySignedOut = () => {
      if (!mounted) return;
      setIsAuthenticated(false);
      setDisplayName(GUEST_NAME);
      setUser(null);
    };

    const applySignedIn = async (nextUser: User) => {
      if (!mounted) return;
      setIsAuthenticated(true);
      setUser(nextUser);
      const name = await resolveDisplayName(nextUser);
      if (mounted) {
        setDisplayName(name);
      }
    };

    const syncAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const sessionUser = data.session?.user;
        if (!sessionUser) {
          applySignedOut();
        } else {
          await applySignedIn(sessionUser);
        }
      } catch {
        applySignedOut();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void syncAuth();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user;
      if (!nextUser) {
        applySignedOut();
        return;
      }
      await applySignedIn(nextUser);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { isAuthenticated, displayName, user, isLoading, isSupabaseConfigured };
}
