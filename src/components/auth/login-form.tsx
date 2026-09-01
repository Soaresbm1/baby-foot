"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";

import { safeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  nextPath?: string;
};

const AUTH_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Email ou mot de passe incorrect.",
  "Email not confirmed": "Confirmez votre adresse email avant de vous connecter.",
  "User already registered": "Un compte existe déjà avec cette adresse email.",
};

function friendlyAuthError(message: string) {
  return AUTH_MESSAGES[message] ?? `Connexion impossible : ${message}`;
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const microsoftEnabled = process.env.NEXT_PUBLIC_ENABLE_MICROSOFT_AUTH === "true";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [pending, setPending] = useState(false);
  const redirectTo = safeRedirectPath(nextPath);

  async function handleCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setNotice(undefined);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("displayName") ?? "").trim();
    const supabase = createClient();

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: displayName },
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
            },
          });

    if (result.error) {
      setError(friendlyAuthError(result.error.message));
      setPending(false);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setNotice("Compte créé. Consultez votre email pour confirmer votre inscription.");
      setPending(false);
      return;
    }

    window.location.assign(redirectTo);
  }

  async function handleMicrosoftLogin() {
    setError(undefined);
    setPending(true);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", redirectTo);
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: callback.toString(),
        scopes: "email",
      },
    });

    if (oauthError) {
      setError(friendlyAuthError(oauthError.message));
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {microsoftEnabled ? (
        <>
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={pending}
            className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 font-bold text-[#18201b] transition active:scale-[0.98] disabled:opacity-60"
          >
            <span aria-hidden="true" className="grid grid-cols-2 gap-0.5">
              <i className="size-2.5 bg-[#f25022]" />
              <i className="size-2.5 bg-[#7fba00]" />
              <i className="size-2.5 bg-[#00a4ef]" />
              <i className="size-2.5 bg-[#ffb900]" />
            </span>
            Continuer avec Microsoft
          </button>

          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
            <span className="h-px flex-1 bg-[var(--surface-raised)]" />
            ou
            <span className="h-px flex-1 bg-[var(--surface-raised)]" />
          </div>
        </>
      ) : null}

      <form method="post" onSubmit={handleCredentials} className="space-y-4">
        {mode === "signup" ? (
          <label className="block text-sm font-bold">
            Nom affiché
            <input
              name="displayName"
              required
              minLength={2}
              maxLength={50}
              autoComplete="name"
              className="mt-2 min-h-14 w-full rounded-2xl border border-transparent bg-[var(--surface)] px-4 text-base font-normal focus:border-[var(--accent)] focus:outline-none"
            />
          </label>
        ) : null}
        <label className="block text-sm font-bold">
          Email
          <input
            name="email"
            required
            type="email"
            autoComplete="email"
            inputMode="email"
            className="mt-2 min-h-14 w-full rounded-2xl border border-transparent bg-[var(--surface)] px-4 text-base font-normal focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        <label className="block text-sm font-bold">
          Mot de passe
          <input
            name="password"
            required
            type="password"
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="mt-2 min-h-14 w-full rounded-2xl border border-transparent bg-[var(--surface)] px-4 text-base font-normal focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        {mode === "login" ? <Link href="/forgot-password" className="inline-block text-sm font-bold text-[var(--muted)]">Mot de passe oublié ?</Link> : null}

        {error ? <p role="alert" className="rounded-xl bg-red-950/60 px-4 py-3 text-sm text-red-200">{error}</p> : null}
        {notice ? <p role="status" className="rounded-xl bg-lime-950/60 px-4 py-3 text-sm text-lime-100">{notice}</p> : null}

        <button
          disabled={pending}
          className="min-h-14 w-full rounded-2xl bg-[var(--accent)] px-5 font-black text-[var(--accent-contrast)] transition active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Connexion…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(undefined);
          setNotice(undefined);
        }}
        className="min-h-12 w-full text-sm font-bold text-[var(--muted)]"
      >
        {mode === "login" ? "Pas encore de compte ? S’inscrire" : "Déjà un compte ? Se connecter"}
      </button>
    </div>
  );
}
