"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { assertSupabaseEnv, supabase } from "@/lib/supabase";
import { useAuthProfile } from "@/lib/hooks/useAuthProfile";
import { isUsernameAvailable, sanitizeUsernameInput } from "@/lib/profile";
import { withTimeout } from "@/lib/withTimeout";
import Button from "@/components/Button";
import { QUERY_PARAMS, ROUTES } from "@/lib/constants";
import { useT } from "@/lib/i18n/useT";

function LoginPageContent() {
  const router = useRouter();
  const t = useT();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading, isSupabaseConfigured } = useAuthProfile();
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const requestedMode = searchParams.get(QUERY_PARAMS.MODE);
    if (requestedMode === "signup") {
      setMode("signup");
      return;
    }
    if (requestedMode === "login") {
      setMode("login");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
      return;
    }

    if (!isAuthLoading && isAuthenticated) {
      router.replace(ROUTES.HOME);
    }
  }, [isAuthLoading, isAuthenticated, isSupabaseConfigured, router]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      assertSupabaseEnv();
      if (mode === "login") {
        const trimmed = identifier.trim().toLowerCase();
        if (!trimmed) {
          throw new Error(t("login.errors.usernameOrEmailRequired"));
        }

        let emailForLogin = trimmed;
        if (!trimmed.includes("@")) {
          const { data: mapped, error: mapError } = await withTimeout(
            supabase.functions.invoke("signin-with-username", {
              body: { username: trimmed }
            }),
            10000,
            "Username lookup"
          );
          if (mapError) {
            const status =
              (mapError as { context?: { status?: number }; status?: number }).context?.status ??
              (mapError as { status?: number }).status;
            const message = String((mapError as { message?: string }).message ?? "");

            if (status === 503 || /service temporarily unavailable/i.test(message)) {
              throw new Error(
                t("login.errors.usernameSigninUnavailable")
              );
            }

            throw mapError;
          }
          if (!mapped?.email) {
            throw new Error(t("login.errors.unknownUsername"));
          }
          emailForLogin = String(mapped.email);
        }

        const { error: loginError } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: emailForLogin,
            password
          }),
          10000,
          "Sign in"
        );
        if (loginError) throw loginError;
        router.replace(ROUTES.HOME);
        return;
      }

      const normalizedUsername = sanitizeUsernameInput(username);
      if (normalizedUsername.length < 3) {
        throw new Error(t("login.errors.usernameMin"));
      }

      const available = await isUsernameAvailable(normalizedUsername);
      if (!available) {
        throw new Error(t("login.errors.usernameTaken"));
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

      if (data.session) {
        await supabase.auth.signOut();
      }

      setInfo(t("login.accountCreated"));
      setMode("login");
      setIdentifier(email.trim().toLowerCase());
      setPassword("");
      return;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: 420, paddingTop: "8vh" }}>
      <section className="card">
        <h1>{t("common.appName")}</h1>
        <p className="text-muted">
          {mode === "login"
            ? t("login.subtitleLogin")
            : t("login.subtitleSignup")}
        </p>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.8rem" }}>
          {mode === "signup" ? (
            <>
              <input
                type="email"
                placeholder={t("login.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ padding: "0.7rem", borderRadius: 10, border: "1px solid #d1d5db" }}
              />
              <input
                type="text"
                placeholder={t("login.username")}
                value={username}
                onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
                required
                minLength={3}
                maxLength={20}
                pattern="^[a-z0-9_]{3,20}$"
                style={{ padding: "0.7rem", borderRadius: 10, border: "1px solid #d1d5db" }}
              />
            </>
          ) : (
            <input
              type="text"
              placeholder={t("login.usernameOrEmail")}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              style={{ padding: "0.7rem", borderRadius: 10, border: "1px solid #d1d5db" }}
            />
          )}
          <input
            type="password"
            placeholder={t("login.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ padding: "0.7rem", borderRadius: 10, border: "1px solid #d1d5db" }}
          />
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? t("login.pleaseWait") : mode === "login" ? t("login.logIn") : t("login.createAccount")}
          </Button>
        </form>

        <Button style={{ marginTop: "0.8rem" }} onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? t("login.noAccount") : t("login.alreadyHave")}
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
