"use client";

import { type FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  async function sendResetLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", "/reset-password");
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: callback.toString(),
    });

    setPending(false);
    if (resetError) {
      setError(resetError.message.toLowerCase().includes("rate limit") ? "Trop de demandes ont été envoyées. Attends quelques minutes avant de réessayer." : "Le lien n’a pas pu être envoyé pour le moment.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <section className="rounded-3xl bg-[var(--surface)] p-6 text-center" role="status">
        <span aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--accent)]/15 text-2xl text-[var(--accent)]">✓</span>
        <h2 className="mt-4 text-xl font-black">Consulte ta messagerie</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Si un compte correspond à cette adresse, tu recevras un lien pour choisir un nouveau mot de passe.</p>
      </section>
    );
  }

  return (
    <form onSubmit={sendResetLink} className="space-y-4">
      <label className="block text-sm font-bold">Adresse e-mail
        <input name="email" required type="email" autoComplete="email" inputMode="email" className="mt-2 min-h-14 w-full rounded-2xl border border-transparent bg-[var(--surface)] px-4 text-base font-normal focus:border-[var(--accent)] focus:outline-none" />
      </label>
      {error ? <p role="alert" className="rounded-xl bg-red-950/60 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      <button disabled={pending} className="min-h-14 w-full rounded-2xl bg-[var(--accent)] px-5 font-black text-[var(--accent-contrast)] disabled:opacity-60">{pending ? "Envoi…" : "Envoyer le lien"}</button>
    </form>
  );
}
