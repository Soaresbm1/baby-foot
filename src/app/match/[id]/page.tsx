import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ReadyButton } from "@/components/ready-button";
import { createClient } from "@/lib/supabase/server";

type MatchPageProps = { params: Promise<{ id: string }> };

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/match/${id}`)}`);

  const { data: match } = await supabase.from("matches").select("id,status,target_score,team_a_score,team_b_score").eq("id", id).single();
  if (!match) notFound();
  const { data: participants } = await supabase.from("match_participants").select("user_id,is_ready,team_id,profiles(display_name),match_teams(side)").eq("match_id", id);
  const mine = participants?.find((participant) => participant.user_id === auth.user.id);

  return (
    <div>
      <Link href="/" className="text-sm font-bold text-[var(--muted)]">← Accueil</Link>
      <p className="mt-10 text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Match en cours</p>
      <h1 className="mt-2 text-3xl font-black">Premier à {match.target_score}</h1>
      <div className="mt-8 grid grid-cols-2 gap-4">
        {[1, 2].map((side) => {
          const player = participants?.find((participant) => {
            const team = Array.isArray(participant.match_teams) ? participant.match_teams[0] : participant.match_teams;
            return team?.side === side;
          });
          const profile = player && (Array.isArray(player.profiles) ? player.profiles[0] : player.profiles);
          return (
            <div key={side} className="rounded-3xl bg-[var(--surface)] p-5 text-center">
              <p className="truncate text-sm font-bold text-[var(--muted)]">{profile?.display_name ?? "En attente…"}</p>
              <p className="mt-4 text-6xl font-black">{side === 1 ? match.team_a_score : match.team_b_score}</p>
              {player ? <p className="mt-3 text-xs text-[var(--muted)]">{player.is_ready ? "Prêt" : "Pas encore prêt"}</p> : null}
            </div>
          );
        })}
      </div>
      {match.status === "waiting_for_players" ? <p className="mt-6 text-center text-[var(--muted)]">En attente de l’adversaire…</p> : null}
      {match.status === "waiting_for_ready" && mine ? <ReadyButton matchId={id} initialReady={mine.is_ready} /> : null}
      {match.status === "in_progress" ? <p className="mt-6 text-center font-bold text-[var(--accent)]">La partie est lancée !</p> : null}
    </div>
  );
}
