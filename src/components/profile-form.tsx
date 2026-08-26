"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type ProfileFormProps = {
  initialAvatarUrl: string;
  initialDisplayName: string;
};

export function ProfileForm({ initialAvatarUrl, initialDisplayName }: ProfileFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(undefined);
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();
    const avatarUrl = String(form.get("avatarUrl") ?? "").trim();

    if (avatarUrl) {
      try {
        if (new URL(avatarUrl).protocol !== "https:") throw new Error();
      } catch {
        setBusy(false);
        setMessage("L’avatar doit utiliser une adresse HTTPS valide.");
        return;
      }
    }

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setBusy(false); setMessage("Ta session a expiré."); return; }
    const { error } = await supabase.from("profiles").update({ display_name: displayName, avatar_url: avatarUrl || null }).eq("id", auth.user.id);
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setMessage("Profil mis à jour.");
    setEditing(false);
    router.refresh();
  }

  return (
    <section className="mt-8 rounded-3xl bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Informations publiques</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Visibles par les autres joueurs.</p>
        </div>
        {!editing ? <button type="button" onClick={() => setEditing(true)} className="min-h-11 rounded-xl bg-[var(--surface-raised)] px-4 text-sm font-bold">Modifier</button> : null}
      </div>

      {editing ? (
        <form method="post" onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-bold">Nom affiché
            <input name="displayName" required minLength={2} maxLength={50} defaultValue={initialDisplayName} className="mt-2 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] px-4 font-normal outline-none" />
          </label>
          <label className="block text-sm font-bold">URL de l’avatar <span className="font-normal text-[var(--muted)]">(facultatif)</span>
            <input name="avatarUrl" type="url" inputMode="url" defaultValue={initialAvatarUrl} placeholder="https://…" className="mt-2 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] px-4 font-normal outline-none" />
          </label>
          {message ? <p role="status" className="text-sm text-red-300">{message}</p> : null}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => { setEditing(false); setMessage(undefined); }} className="min-h-12 rounded-2xl bg-[var(--surface-raised)] px-4 font-bold">Annuler</button>
            <button disabled={busy} className="min-h-12 rounded-2xl bg-[var(--accent)] px-4 font-black text-[#102006] disabled:opacity-60">{busy ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </form>
      ) : message ? <p role="status" className="mt-4 text-sm text-[var(--accent)]">{message}</p> : null}
    </section>
  );
}
