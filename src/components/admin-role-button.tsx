"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type AdminRoleButtonProps = {
  isAdmin: boolean;
  playerId: string;
  playerName: string;
};

export function AdminRoleButton({ isAdmin, playerId, playerName }: AdminRoleButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function changeRole() {
    const nextRole = !isAdmin;
    const action = nextRole ? "donner les droits administrateur à" : "retirer les droits administrateur de";
    if (!window.confirm(`Voulez-vous ${action} ${playerName} ?`)) return;

    setBusy(true);
    setError(undefined);
    const { error: rpcError } = await createClient().rpc("set_player_admin", {
      p_player_id: playerId,
      p_is_admin: nextRole,
    });
    setBusy(false);

    if (rpcError) {
      setError("Modification impossible. Recharge la page et réessaie.");
      return;
    }

    router.refresh();
  }

  return (
    <span className="shrink-0 text-right">
      <button
        type="button"
        onClick={changeRole}
        disabled={busy}
        className={`min-h-10 rounded-xl px-3 text-xs font-black disabled:opacity-60 ${isAdmin ? "border border-red-400/20 bg-red-400/10 text-red-200" : "bg-[var(--surface-raised)] text-[var(--foreground)]"}`}
      >
        {busy ? "Modification…" : isAdmin ? "Retirer admin" : "Rendre admin"}
      </button>
      {error ? <span role="alert" className="mt-2 block max-w-40 text-xs text-red-300">{error}</span> : null}
    </span>
  );
}
