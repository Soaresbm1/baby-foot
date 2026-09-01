"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function CancelMatchButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function cancelMatch() {
    setBusy(true);
    setError(undefined);
    const { error: rpcError } = await createClient().rpc("cancel_waiting_match", {
      p_match_id: matchId,
    });
    setBusy(false);

    if (rpcError) {
      setError("Le match n’a pas pu être annulé. Recharge la page et réessaie.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-5 min-h-12 w-full rounded-2xl text-sm font-bold text-red-300"
      >
        Annuler ce match
      </button>
    );
  }

  return (
    <section className="mt-5 rounded-2xl border border-red-300/25 bg-red-950/20 p-4" aria-label="Confirmation d’annulation">
      <p className="font-bold">Annuler définitivement ce match ?</p>
      <p className="mt-1 text-sm text-[var(--muted)]">Les joueurs devront utiliser une nouvelle invitation.</p>
      {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="min-h-12 rounded-xl bg-[var(--surface-raised)] font-bold disabled:opacity-60"
        >
          Garder
        </button>
        <button
          type="button"
          onClick={cancelMatch}
          disabled={busy}
          className="min-h-12 rounded-xl bg-red-700 font-bold text-white disabled:opacity-60"
        >
          {busy ? "Annulation…" : "Oui, annuler"}
        </button>
      </div>
    </section>
  );
}
