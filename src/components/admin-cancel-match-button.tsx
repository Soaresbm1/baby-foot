"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function AdminCancelMatchButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function cancelMatch() {
    if (!window.confirm("Annuler ce match pour tous les joueurs ? Cette action est définitive.")) return;

    setBusy(true);
    setError(undefined);
    const { error: rpcError } = await createClient().rpc("admin_cancel_match", {
      p_match_id: matchId,
    });
    setBusy(false);

    if (rpcError) {
      setError("Annulation impossible. Le match a peut-être déjà été terminé.");
      return;
    }

    router.refresh();
  }

  return (
    <span className="shrink-0 text-right">
      <button
        type="button"
        onClick={cancelMatch}
        disabled={busy}
        className="min-h-10 rounded-xl border border-red-400/20 bg-red-400/10 px-3 text-xs font-black text-red-200 disabled:opacity-60"
      >
        {busy ? "Annulation…" : "Annuler"}
      </button>
      {error ? <span role="alert" className="mt-2 block max-w-36 text-xs text-red-300">{error}</span> : null}
    </span>
  );
}
