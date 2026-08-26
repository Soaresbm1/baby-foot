"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function AuthForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(undefined);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("displayName") ?? "").trim();
    const supabase = createClient();

    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: displayName } },
        });

    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage("Compte créé. Consulte tes e-mails pour confirmer ton adresse.");
      return;
    }
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-3xl bg-[var(--surface)] p-5">
      <div className="grid grid-cols-2 rounded-2xl bg-[var(--background)] p-1">
        {(["login", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => { setMode(value); setMessage(undefined); }}
            className={`min-h-11 rounded-xl text-sm font-bold ${mode === value ? "bg-[var(--surface-raised)] text-white" : "text-[var(--muted)]"}`}
          >
            {value === "login" ? "Connexion" : "Créer un compte"}
          </button>
        ))}
      </div>

      <form className="mt-5 space-y-4" method="post" onSubmit={submit}>
        {mode === "signup" ? (
          <label className="block text-sm font-bold">
            Nom affiché
            <input name="displayName" required minLength={2} maxLength={50} autoComplete="name" className="mt-2 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] px-4 font-normal outline-none" />
          </label>
        ) : null}
        <label className="block text-sm font-bold">
          E-mail
          <input name="email" required type="email" autoComplete="email" className="mt-2 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] px-4 font-normal outline-none" />
        </label>
        <label className="block text-sm font-bold">
          Mot de passe
          <input name="password" required type="password" minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-2 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] px-4 font-normal outline-none" />
        </label>
        {message ? <p role="status" className="rounded-2xl bg-[var(--background)] p-3 text-sm text-[var(--muted)]">{message}</p> : null}
        <button disabled={busy} className="min-h-14 w-full rounded-2xl bg-[var(--accent)] px-5 font-black text-[#102006] disabled:opacity-60">
          {busy ? "Patiente…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>
    </div>
  );
}
