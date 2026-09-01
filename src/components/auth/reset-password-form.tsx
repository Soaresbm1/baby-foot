"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setPending(false);
      setError("Le lien a peut-être expiré. Demande un nouveau lien de récupération.");
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login?reset=success");
    router.refresh();
  }

  return (
    <form onSubmit={updatePassword} className="space-y-4">
      <label className="block text-sm font-bold">Nouveau mot de passe
        <input name="password" required type="password" minLength={8} autoComplete="new-password" className="mt-2 min-h-14 w-full rounded-2xl border border-transparent bg-[var(--surface)] px-4 text-base font-normal focus:border-[var(--accent)] focus:outline-none" />
      </label>
      <label className="block text-sm font-bold">Confirmer le mot de passe
        <input name="confirmation" required type="password" minLength={8} autoComplete="new-password" className="mt-2 min-h-14 w-full rounded-2xl border border-transparent bg-[var(--surface)] px-4 text-base font-normal focus:border-[var(--accent)] focus:outline-none" />
      </label>
      {error ? <p role="alert" className="rounded-xl bg-red-950/60 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      <button disabled={pending} className="min-h-14 w-full rounded-2xl bg-[var(--accent)] px-5 font-black text-[var(--accent-contrast)] disabled:opacity-60">{pending ? "Mise à jour…" : "Enregistrer le mot de passe"}</button>
    </form>
  );
}
