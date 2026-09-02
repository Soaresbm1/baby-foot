"use client";

import { useState } from "react";
import Link from "next/link";

import { InviteQrCode } from "@/components/invite-qr-code";
import { createClient } from "@/lib/supabase/client";

type Challenge = { match_id: string; join_token: string };

export function ChallengePlayer({ opponentId, opponentName }: { opponentId: string; opponentName: string }) {
  const [targetScore, setTargetScore] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [challenge, setChallenge] = useState<Challenge>();
  const [copied, setCopied] = useState(false);

  async function createChallenge() {
    setBusy(true);
    setError(undefined);
    const { data, error: rpcError } = await createClient().rpc("create_challenge", {
      p_opponent_id: opponentId,
      p_target_score: targetScore,
    });
    setBusy(false);
    if (rpcError) {
      setError("Le défi n’a pas pu être créé. Vérifie que la nouvelle migration est appliquée.");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setError("Le défi n’a pas pu être créé.");
      return;
    }
    setChallenge(row as Challenge);
  }

  if (challenge) {
    const path = `/join/${challenge.join_token}`;
    const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;
    return (
      <section className="mt-8 rounded-3xl border border-[var(--accent)]/25 bg-[var(--surface)] p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Défi créé</p>
        <h2 className="mt-2 text-xl font-black">Envoie-le à {opponentName}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Seul ce joueur pourra utiliser l’invitation.</p>
        <InviteQrCode value={url} />
        <button type="button" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); }} className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] px-4 font-bold">{copied ? "Lien copié ✓" : "Copier le lien privé"}</button>
        <Link href={`/match/${challenge.match_id}`} className="mt-3 flex min-h-14 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 font-black text-[var(--accent-contrast)]">Ouvrir le match</Link>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-3xl bg-[var(--surface)] p-5" aria-labelledby="challenge-title">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Nouveau duel</p>
      <h2 id="challenge-title" className="mt-2 text-xl font-black">Défier {opponentName}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">Crée une invitation privée pour un match 1 contre 1.</p>
      <fieldset className="mt-5">
        <legend className="text-sm font-bold">Score gagnant</legend>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[5, 10, 15].map((score) => (
            <label key={score} className="cursor-pointer">
              <input type="radio" name="challengeScore" value={score} checked={targetScore === score} onChange={() => setTargetScore(score)} className="peer sr-only" />
              <span className="grid min-h-12 place-items-center rounded-xl bg-[var(--surface-raised)] font-black peer-checked:bg-[var(--accent)] peer-checked:text-[var(--accent-contrast)]">{score}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
      <button type="button" onClick={createChallenge} disabled={busy} className="mt-5 min-h-14 w-full rounded-2xl bg-[var(--accent)] px-4 font-black text-[var(--accent-contrast)] disabled:opacity-60">{busy ? "Création…" : "Créer le défi"}</button>
    </section>
  );
}
