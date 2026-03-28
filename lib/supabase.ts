import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const resolvedSupabaseUrl = supabaseUrl?.trim() || "https://placeholder-project.supabase.co";
const resolvedSupabaseAnonKey = supabaseAnonKey?.trim() || "placeholder-anon-key";

export const supabase = createClient(
  resolvedSupabaseUrl,
  resolvedSupabaseAnonKey
);

export function assertSupabaseEnv(): void {
  if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
}
