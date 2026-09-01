"use client";

import { type FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm({ email }: { email: string }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");

    setError(undefined);
    setNotice(undefined);
    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("Choisis un mot de passe différent de l’ancien.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: authenticationError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (authenticationError) {
      setBusy(false);
      setError("Le mot de passe actuel est incorrect.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) {
      setError("Le mot de passe n’a pas pu être modifié pour le moment.");
      return;
    }

    form.reset();
    setEditing(false);
    setNotice("Mot de passe modifié avec succès.");
  }

  return (
    <section className="mt-4 rounded-3xl bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="text-lg font-black">Mot de passe</h2><p className="mt-1 text-xs text-[var(--muted)]">Protège l’accès à ton compte.</p></div>
        {!editing ? <button type="button" onClick={() => { setEditing(true); setNotice(undefined); }} className="min-h-11 shrink-0 rounded-xl bg-[var(--surface-raised)] px-4 text-sm font-bold">Modifier</button> : null}
      </div>

      {editing ? (
        <form onSubmit={changePassword} className="mt-5 space-y-4">
          <label className="block text-sm font-bold">Mot de passe actuel
            <input name="currentPassword" required type="password" autoComplete="current-password" className="mt-2 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] px-4 font-normal outline-none" />
          </label>
          <label className="block text-sm font-bold">Nouveau mot de passe
            <input name="newPassword" required type="password" minLength={8} autoComplete="new-password" className="mt-2 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] px-4 font-normal outline-none" />
          </label>
          <label className="block text-sm font-bold">Confirmer le nouveau mot de passe
            <input name="confirmation" required type="password" minLength={8} autoComplete="new-password" className="mt-2 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] px-4 font-normal outline-none" />
          </label>
          {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" disabled={busy} onClick={() => { setEditing(false); setError(undefined); }} className="min-h-12 rounded-2xl bg-[var(--surface-raised)] px-4 font-bold disabled:opacity-60">Annuler</button>
            <button disabled={busy} className="min-h-12 rounded-2xl bg-[var(--accent)] px-4 font-black text-[var(--accent-contrast)] disabled:opacity-60">{busy ? "Modification…" : "Enregistrer"}</button>
          </div>
        </form>
      ) : notice ? <p role="status" className="mt-4 text-sm font-bold text-[var(--accent)]">{notice}</p> : null}
    </section>
  );
}
