"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getOrCreateUsername } from "@/lib/profile";
import { assertSupabaseEnv, supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";

export type AuthProfileState = {
  isAuthenticated: boolean;
  displayName: string;
  user: User | null;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
};

const GUEST_NAME = "Guest";
const AuthProfileContext = createContext<AuthProfileState | null>(null);

function metadataUsername(user: User): string {
  return typeof user.user_metadata?.username === "string" ? user.user_metadata.username.trim() : "";
}

function fallbackDisplayName(user: User): string {
  const metadataName = metadataUsername(user);
  if (metadataName) {
    return metadataName;
  }

  const email = user.email?.trim();
  if (email) {
    return email;
  }

  return "Player";
}

async function resolveDisplayName(user: User): Promise<string> {
  const timeoutMs = 6000;

  try {
    return await Promise.race<string>([
      getOrCreateUsername(user),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve(fallbackDisplayName(user)), timeoutMs);
      })
    ]);
  } catch {
    return fallbackDisplayName(user);
  }
}

async function ensureMetadataUsername(user: User, username: string): Promise<void> {
  if (metadataUsername(user) || !username.trim()) {
    return;
  }

  try {
    await withTimeout(
      supabase.auth.updateUser({
        data: {
          ...(user.user_metadata ?? {}),
          username
        }
      }),
      8000,
      "Metadata sync"
    );
  } catch {
    // Non-blocking: UI should still proceed even if metadata sync fails.
  }
}

function useProvideAuthProfile(): AuthProfileState {
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
      setDisplayName(fallbackDisplayName(nextUser));
      const name = await resolveDisplayName(nextUser);
      if (mounted) {
        setDisplayName(name);
      }
      await ensureMetadataUsername(nextUser, name);
    };

    const syncAuth = async () => {
      try {
        const { data, error } = await withTimeout(supabase.auth.getSession(), 8000, "Session check");
        if (error) throw error;
        const sessionUser = data.session?.user;
        if (!sessionUser) {
          applySignedOut();
        } else {
          void applySignedIn(sessionUser);
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

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setIsLoading(false);
      }

      const nextUser = session?.user;
      if (!nextUser) {
        applySignedOut();
        return;
      }

      // Keep auth callback synchronous to avoid auth lock contention.
      setTimeout(() => {
        void applySignedIn(nextUser);
      }, 0);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { isAuthenticated, displayName, user, isLoading, isSupabaseConfigured };
}

export function AuthProfileProvider({ children }: { children: React.ReactNode }) {
  const value = useProvideAuthProfile();
  return <AuthProfileContext.Provider value={value}>{children}</AuthProfileContext.Provider>;
}

export function useAuthProfile(): AuthProfileState {
  const context = useContext(AuthProfileContext);
  if (!context) {
    throw new Error("useAuthProfile must be used within AuthProfileProvider");
  }
  return context;
}
