"use client";

import { useState, type FormEvent } from "react";

import { InviteQrCode } from "@/components/invite-qr-code";
import { createClient } from "@/lib/supabase/client";

type CreatedMatch = { match_id: string; join_token: string };

export function NewMatchForm() {
  const [created, setCreated] = useState<CreatedMatch>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const target = Number(form.get("targetScore"));
    const { data, error: rpcError } = await createClient().rpc("create_match", {
      p_mode: "one_v_one",
      p_target_score: target,
    });
    setBusy(false);
    if (rpcError) { setError(rpcError.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) { setError("Le match n’a pas pu être créé."); return; }
    setCreated(row as CreatedMatch);
  }

  if (created) {
    const invitePath = `/join/${created.join_token}`;
    const inviteUrl = typeof window === "undefined" ? invitePath : `${window.location.origin}${invitePath}`;
    return (
      <section className="mt-8 rounded-3xl bg-[var(--surface)] p-5">
        <p className="text-sm font-bold uppercase tracking-wider text-[var(--accent)]">Match créé</p>
        <h2 className="mt-2 text-2xl font-black">Invite ton adversaire</h2>
        <InviteQrCode value={inviteUrl} />
        <p className="mt-3 text-center text-sm text-[var(--muted)]">Fais scanner ce code par ton adversaire.</p>
        <p className="mt-2 break-all text-sm text-[var(--muted)]">{inviteUrl}</p>
        <button type="button" onClick={() => navigator.clipboard.writeText(inviteUrl)} className="mt-5 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] px-4 font-bold">Copier le lien</button>
        <a href={`/match/${created.match_id}`} className="mt-3 flex min-h-14 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 font-black text-[#102006]">Ouvrir le match</a>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 rounded-3xl bg-[var(--surface)] p-5">
      <fieldset>
        <legend className="font-bold">Score gagnant</legend>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[5, 10, 15].map((score) => (
            <label key={score} className="cursor-pointer">
              <input className="peer sr-only" type="radio" name="targetScore" value={score} defaultChecked={score === 10} />
              <span className="grid min-h-14 place-items-center rounded-2xl bg-[var(--surface-raised)] text-lg font-black peer-checked:bg-[var(--accent)] peer-checked:text-[#102006]">{score}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
      <button disabled={busy} className="mt-6 min-h-16 w-full rounded-2xl bg-[var(--accent)] px-5 text-lg font-black text-[#102006] disabled:opacity-60">{busy ? "Création…" : "Créer le match"}</button>
    </form>
  );
}
