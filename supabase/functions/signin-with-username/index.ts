// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "@supabase/supabase-js"

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}

Deno.serve(async (req) => {
  // Browser preflight support.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase service configuration" }, 500)
  }

  const { username } = await req.json().catch(() => ({ username: "" }))
  const normalizedUsername = String(username ?? "").trim().toLowerCase()

  if (!USERNAME_REGEX.test(normalizedUsername)) {
    return json({ error: "Invalid username" }, 400)
  }

  // Use service-role client because we need to map profile -> auth user email.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", normalizedUsername)
    .maybeSingle()

  if (profileError) {
    return json({ error: profileError.message }, 500)
  }

  if (!profile?.user_id) {
    return json({ error: "Unknown username" }, 404)
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.user_id)

  if (userError || !userData.user?.email) {
    return json({ error: userError?.message ?? "User email not found" }, 404)
  }

  // Return internal email to client, which then uses normal signInWithPassword.
  return json({ email: userData.user.email })
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/signin-with-username' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"username":"user"}'

*/
