"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Player = {
  id: string;
  name: string;
  side: number;
};

export function TeamOrganizer({ matchId, players }: { matchId: string; players: Player[] }) {
  const router = useRouter();
  const [movingId, setMovingId] = useState<string>();
  const [error, setError] = useState<string>();

  async function switchTeam(playerId: string) {
    setMovingId(playerId);
    setError(undefined);
    const { error: rpcError } = await createClient().rpc("switch_participant_team", {
      p_match_id: matchId,
      p_participant_id: playerId,
    });
    setMovingId(undefined);

    if (rpcError) {
      setError("La composition n’a pas pu être modifiée.");
      return;
    }

    router.refresh();
  }

  return (
    <section className="mt-6 rounded-3xl bg-[var(--surface)] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Organisation</p>
      <h2 className="mt-2 text-xl font-black">Composer les équipes</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">Déplace un joueur avant que tout le monde confirme être prêt.</p>
      <div className="mt-4 space-y-2">
        {players.map((player) => (
          <div key={player.id} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-[var(--surface-raised)] px-4">
            <span className="min-w-0">
              <span className="block truncate font-bold">{player.name}</span>
              <span className="block text-xs text-[var(--muted)]">Équipe {player.side === 1 ? "A" : "B"}</span>
            </span>
            <button
              type="button"
              onClick={() => switchTeam(player.id)}
              disabled={Boolean(movingId)}
              aria-label={`Déplacer ${player.name} vers l’équipe ${player.side === 1 ? "B" : "A"}`}
              className="min-h-10 shrink-0 rounded-xl bg-[var(--background)] px-3 text-sm font-bold disabled:opacity-60"
            >
              {movingId === player.id ? "…" : `Vers ${player.side === 1 ? "B" : "A"} →`}
            </button>
          </div>
        ))}
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
