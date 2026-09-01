"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function LeaveMatchButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function leaveMatch() {
    setBusy(true);
    setError(undefined);
    const { error: rpcError } = await createClient().rpc("leave_waiting_match", {
      p_match_id: matchId,
    });
    setBusy(false);

    if (rpcError) {
      setError("Impossible de quitter le match. Recharge la page et réessaie.");
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
        Quitter ce match
      </button>
    );
  }

  return (
    <section className="mt-5 rounded-2xl border border-red-300/25 bg-red-950/20 p-4" aria-label="Confirmation de départ">
      <p className="font-bold">Quitter ce match ?</p>
      <p className="mt-1 text-sm text-[var(--muted)]">Ta place sera immédiatement disponible pour un autre joueur.</p>
      {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="min-h-12 rounded-xl bg-[var(--surface-raised)] font-bold disabled:opacity-60">
          Rester
        </button>
        <button type="button" onClick={leaveMatch} disabled={busy} className="min-h-12 rounded-xl bg-red-700 font-bold text-white disabled:opacity-60">
          {busy ? "Départ…" : "Oui, quitter"}
        </button>
      </div>
    </section>
  );
}
