import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CancelMatchButton } from "@/components/cancel-match-button";
import { LeaveMatchButton } from "@/components/leave-match-button";
import { MatchInvitation } from "@/components/match-invitation";
import { MatchRealtimeRefresh } from "@/components/match-realtime-refresh";
import { ReadyButton } from "@/components/ready-button";
import { ScoreCounter } from "@/components/score-counter";
import { TeamOrganizer } from "@/components/team-organizer";
import { createClient } from "@/lib/supabase/server";

type MatchPageProps = { params: Promise<{ id: string }> };

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/match/${id}`)}`);

  const { data: match } = await supabase.from("matches")
    .select("id,mode,status,target_score,team_a_score,team_b_score,winner_team_id,created_by")
    .eq("id", id).single();
  if (!match) notFound();
  const { data: participants } = await supabase.from("match_participants")
    .select("id,user_id,is_ready,team_id,seat,profiles(display_name),match_teams(side)").eq("match_id", id).order("seat");
  const mine = participants?.find((participant) => participant.user_id === auth.user.id);
  const myTeam = mine && (Array.isArray(mine.match_teams) ? mine.match_teams[0] : mine.match_teams);
  const profileName = (participant: NonNullable<typeof participants>[number]) => {
    const profile = Array.isArray(participant.profiles) ? participant.profiles[0] : participant.profiles;
    return profile?.display_name ?? "Joueur";
  };
  const myPlayers = mine ? participants?.filter((participant) => participant.team_id === mine.team_id) ?? [] : [];
  const opponentPlayers = mine ? participants?.filter((participant) => participant.team_id !== mine.team_id) ?? [] : [];
  const myNames = myPlayers.map(profileName).join(" & ") || "Ton équipe";
  const opponentNames = opponentPlayers.map(profileName).join(" & ") || "Équipe adverse";
  const { data: confirmation } = await supabase.from("match_confirmations")
    .select("user_id").eq("match_id", id).eq("user_id", auth.user.id).maybeSingle();

  return (
    <div>
      <MatchRealtimeRefresh currentUserId={auth.user.id} matchId={id} />
      <Link href="/" className="text-sm font-bold text-[var(--muted)]">← Accueil</Link>
      <p className="mt-10 text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Match en cours</p>
      <h1 className="mt-2 text-3xl font-black">{match.mode === "two_v_two" ? "2 contre 2" : "1 contre 1"} · Premier à {match.target_score}</h1>

      {(match.status === "waiting_for_players" || match.status === "waiting_for_ready") ? (
        <div className="mt-8 grid grid-cols-2 gap-4">
          {[1, 2].map((side) => {
            const teamPlayers = participants?.filter((participant) => {
              const team = Array.isArray(participant.match_teams) ? participant.match_teams[0] : participant.match_teams;
              return team?.side === side;
            }) ?? [];
            const capacity = match.mode === "two_v_two" ? 2 : 1;
            return <div key={side} className={`rounded-3xl p-4 ${myTeam?.side === side ? "bg-[var(--surface-raised)] ring-1 ring-[var(--accent)]/30" : "bg-[var(--surface)]"}`}>
              <p className="mb-3 text-center text-xs font-black uppercase tracking-wider text-[var(--muted)]">Équipe {side === 1 ? "A" : "B"}</p>
              <div className="space-y-2">
                {Array.from({ length: capacity }, (_, seat) => {
                  const player = teamPlayers[seat];
                  return <div key={seat} className="rounded-xl bg-[var(--background)]/50 px-3 py-3 text-center">
                    <p className="truncate text-sm font-bold">{player ? profileName(player) : "En attente…"}</p>
                    {player ? <p className={`mt-1 text-xs ${player.is_ready ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>{player.is_ready ? "Prêt" : "Pas encore prêt"}</p> : null}
                  </div>;
                })}
              </div>
            </div>;
          })}
        </div>
      ) : null}
      {match.mode === "two_v_two" && (match.status === "waiting_for_players" || match.status === "waiting_for_ready") && match.created_by === auth.user.id ? (
        <TeamOrganizer
          matchId={id}
          players={(participants ?? []).map((participant) => {
            const team = Array.isArray(participant.match_teams) ? participant.match_teams[0] : participant.match_teams;
            return { id: participant.id, name: profileName(participant), side: team?.side ?? 1 };
          })}
        />
      ) : null}
      {match.status === "waiting_for_players" ? <p className="mt-6 text-center text-[var(--muted)]">En attente de {match.mode === "two_v_two" ? `${4 - (participants?.length ?? 0)} joueur${4 - (participants?.length ?? 0) > 1 ? "s" : ""}` : "l’adversaire"}…</p> : null}
      {match.status === "waiting_for_players" && match.created_by === auth.user.id ? <MatchInvitation matchId={id} /> : null}
      {match.status === "waiting_for_ready" && mine ? <ReadyButton matchId={id} initialReady={mine.is_ready} /> : null}
      {(match.status === "waiting_for_players" || match.status === "waiting_for_ready") && match.created_by === auth.user.id ? <CancelMatchButton matchId={id} /> : null}
      {(match.status === "waiting_for_players" || match.status === "waiting_for_ready") && mine && match.created_by !== auth.user.id ? <LeaveMatchButton matchId={id} /> : null}
      {(match.status === "in_progress" || match.status === "awaiting_confirmation" || match.status === "completed" || match.status === "cancelled") && mine && myTeam ? (
        <ScoreCounter
          confirmed={Boolean(confirmation)} matchId={id}
          myName={myNames}
          myScore={myTeam.side === 1 ? match.team_a_score : match.team_b_score}
          myTeamId={mine.team_id}
          opponentName={opponentNames}
          opponentScore={myTeam.side === 1 ? match.team_b_score : match.team_a_score}
          status={match.status} targetScore={match.target_score} winnerTeamId={match.winner_team_id}
        />
      ) : null}
    </div>
  );
}
