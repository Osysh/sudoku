"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { assertSupabaseEnv, supabase } from "@/lib/supabase";
import { isUsernameAvailable, sanitizeUsernameInput } from "@/lib/profile";
import Button from "@/components/Button";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const requestedMode = searchParams.get("mode");
    if (requestedMode === "signup") {
      setMode("signup");
      return;
    }
    if (requestedMode === "login") {
      setMode("login");
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      assertSupabaseEnv();
    } catch (err) {
      setError((err as Error).message);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/");
      }
    });
  }, [router]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      assertSupabaseEnv();
      if (mode === "login") {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        router.replace("/");
        return;
      }

      const normalizedUsername = sanitizeUsernameInput(username);
      if (normalizedUsername.length < 3) {
        throw new Error("Username must be at least 3 chars (letters, numbers, underscores).");
      }

      const available = await isUsernameAvailable(normalizedUsername);
      if (!available) {
        throw new Error("Username already taken.");
      }

      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: normalizedUsername
          }
        }
      });
      if (signupError) throw signupError;

      if (!data.session) {
        setInfo("Compte cree. Verifie ton email puis connecte-toi.");
        setMode("login");
        return;
      }

      router.replace("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: 420, paddingTop: "8vh" }}>
      <section className="card">
        <h1>Sudoku</h1>
        <p className="text-muted">Email and password are required.</p>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.8rem" }}>
          {mode === "signup" ? (
            <input
              type="text"
              placeholder="Username (letters, numbers, underscore)"
              value={username}
              onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
              required
              minLength={3}
              maxLength={20}
              pattern="^[a-z0-9_]{3,20}$"
              style={{ padding: "0.7rem", borderRadius: 10, border: "1px solid #d1d5db" }}
            />
          ) : null}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: "0.7rem", borderRadius: 10, border: "1px solid #d1d5db" }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ padding: "0.7rem", borderRadius: 10, border: "1px solid #d1d5db" }}
          />
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </Button>
        </form>

        <Button style={{ marginTop: "0.8rem" }} onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          Switch to {mode === "login" ? "Sign up" : "Log in"}
        </Button>

        {info ? <p>{info}</p> : null}
        {error ? <p className="text-danger">{error}</p> : null}
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
