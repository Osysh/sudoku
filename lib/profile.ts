import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

function baseFromUser(user: User): string {
  const metadataUsername = typeof user.user_metadata?.username === "string" ? user.user_metadata.username : "";
  const emailPrefix = (user.email ?? "player").split("@")[0] ?? "player";
  const raw = metadataUsername || emailPrefix;
  const normalized = normalizeUsername(raw);

  if (normalized.length >= 3) {
    return normalized;
  }

  return "player";
}

function randomSuffix(length = 4): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function withSuffix(base: string, suffixLength: number): string {
  const suffix = randomSuffix(suffixLength);
  const baseMax = 20 - (suffix.length + 1);
  const prefix = base.slice(0, Math.max(baseMax, 3));
  return `${prefix}_${suffix}`;
}

async function findUsernameByUserId(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from("profiles").select("username").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data?.username ?? null;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (normalized.length < 3) {
    return false;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("username", normalized)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return !data;
}

export async function getOrCreateUsername(user: User): Promise<string> {
  const existing = await findUsernameByUserId(user.id);
  if (existing) {
    return existing;
  }

  const base = baseFromUser(user);
  const candidates = [base, withSuffix(base, 3), withSuffix(base, 4), withSuffix(base, 5)];

  for (const candidate of candidates) {
    const { error } = await supabase.from("profiles").insert({ user_id: user.id, username: candidate });
    if (!error) {
      return candidate;
    }

    if (error.code !== "23505") {
      throw error;
    }
  }

  for (let i = 0; i < 8; i += 1) {
    const candidate = withSuffix(base, 5);
    const { error } = await supabase.from("profiles").insert({ user_id: user.id, username: candidate });
    if (!error) {
      return candidate;
    }

    if (error.code !== "23505") {
      throw error;
    }
  }

  throw new Error("Unable to reserve username. Please try again.");
}

export function sanitizeUsernameInput(value: string): string {
  return normalizeUsername(value);
}
