import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ShareMatchResult } from "@/components/share-match-result";
import { createClient } from "@/lib/supabase/server";

type MatchDetailPageProps = { params: Promise<{ id: string }> };

const EVENT_LABELS: Record<string, string> = {
  match_created: "Match créé",
  player_joined: "a rejoint le match",
  player_ready: "a modifié sa préparation",
  match_started: "Début du match",
  goal: "a marqué",
  goal_cancelled: "a annulé son but",
  result_proposed: "Score final proposé",
  result_confirmed: "a confirmé le résultat",
  result_rejected: "a refusé le résultat",
  match_finished: "Résultat validé",
  rematch_created: "Revanche créée",
};

function related<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CH", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("fr-CH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/history/${id}`)}`);

  const [{ data: match }, { data: participants }, { data: events }] = await Promise.all([
    supabase.from("matches").select("id,mode,status,target_score,team_a_score,team_b_score,winner_team_id,cancel_reason,created_at,started_at,ended_at").eq("id", id).single(),
    supabase.from("match_participants").select("user_id,team_id,seat,profiles(display_name),match_teams(side)").eq("match_id", id).order("seat"),
    supabase.from("match_events").select("id,type,created_at,actor_id,team_id,profiles(display_name),match_teams(side)").eq("match_id", id).order("created_at", { ascending: true }),
  ]);

  if (!match || !participants?.some((participant) => participant.user_id === auth.user.id)) notFound();
  if (match.status !== "completed" && match.status !== "cancelled") redirect(`/match/${id}`);

  const teams = [1, 2].map((side) => ({
    side,
    players: participants.filter((participant) => related(participant.match_teams)?.side === side),
  }));
  const winnerSide = participants.find((participant) => participant.team_id === match.winner_team_id);
  const winningSide = winnerSide ? related(winnerSide.match_teams)?.side : null;

  return (
    <div>
      <Link href="/history" className="text-sm font-bold text-[var(--muted)]">← Historique</Link>
      <header className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--accent)]">Détail du match</p>
            <h1 className="mt-2 text-3xl font-black">{match.mode === "two_v_two" ? "2 contre 2" : "1 contre 1"}</h1>
          </div>
          <span className={`rounded-full px-3 py-2 text-xs font-black ${match.status === "completed" ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "bg-[var(--surface-raised)] text-[var(--muted)]"}`}>
            {match.status === "completed" ? "Terminé" : "Annulé"}
          </span>
        </div>
        <p className="mt-3 text-sm capitalize text-[var(--muted)]">{formatDate(match.ended_at ?? match.created_at)}</p>
      </header>

      <section className="mt-8 rounded-[2rem] bg-[var(--surface)] p-5 shadow-[0_18px_45px_rgb(0_0_0_/_18%)]" aria-label="Résultat">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {teams.map((team, index) => (
            <div key={team.side} className={index === 0 ? "text-left" : "text-right"}>
              <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">Équipe {team.side === 1 ? "A" : "B"}</p>
              <div className="mt-2 space-y-1">
                {team.players.map((participant) => {
                  const profile = related(participant.profiles);
                  return <p key={participant.user_id} className="truncate text-sm font-bold">{profile?.display_name ?? "Joueur"}{participant.user_id === auth.user.id ? " · toi" : ""}</p>;
                })}
              </div>
            </div>
          )).reduce<React.ReactNode[]>((items, team, index) => {
            if (index === 1) items.push(<div key="score" className="text-center"><p className="text-5xl font-black tabular-nums">{match.team_a_score}<span className="mx-2 text-[var(--muted)]">–</span>{match.team_b_score}</p><p className="mt-2 text-xs text-[var(--muted)]">Premier à {match.target_score}</p></div>);
            items.push(team);
            return items;
          }, [])}
        </div>
        {winningSide ? <p className="mt-5 border-t border-white/5 pt-4 text-center text-sm font-bold text-[var(--accent)]">Victoire de l’équipe {winningSide === 1 ? "A" : "B"}</p> : null}
        {match.status === "cancelled" ? <p className="mt-5 border-t border-white/5 pt-4 text-center text-sm text-[var(--muted)]">Résultat refusé par un participant</p> : null}
        {match.status === "completed" ? (
          <ShareMatchResult
            teamA={teams[0].players.map((participant) => related(participant.profiles)?.display_name ?? "Joueur").join(" & ")}
            teamAScore={match.team_a_score}
            teamB={teams[1].players.map((participant) => related(participant.profiles)?.display_name ?? "Joueur").join(" & ")}
            teamBScore={match.team_b_score}
          />
        ) : null}
      </section>

      <section className="mt-8" aria-labelledby="timeline-title">
        <div className="flex items-end justify-between"><h2 id="timeline-title" className="text-xl font-black">Chronologie</h2><span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{events?.length ?? 0} événements</span></div>
        <ol className="relative mt-5 space-y-3 before:absolute before:bottom-5 before:left-[1.15rem] before:top-5 before:w-px before:bg-white/10">
          {events?.map((event) => {
            const profile = related(event.profiles);
            const team = related(event.match_teams);
            const isGoal = event.type === "goal";
            return <li key={event.id} className="relative flex gap-4 rounded-2xl bg-[var(--surface)] p-4">
              <span aria-hidden="true" className={`relative z-10 mt-0.5 grid size-9 shrink-0 place-items-center rounded-full font-black ${isGoal ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "bg-[var(--surface-raised)] text-[var(--muted)]"}`}>{isGoal ? "+1" : "·"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm"><strong>{profile?.display_name ?? "Système"}</strong> {EVENT_LABELS[event.type] ?? event.type}{team?.side && (event.type === "goal" || event.type === "goal_cancelled") ? ` pour l’équipe ${team.side === 1 ? "A" : "B"}` : ""}</p>
                <time dateTime={event.created_at} className="mt-1 block text-xs text-[var(--muted)]">{formatTime(event.created_at)}</time>
              </div>
            </li>;
          })}
        </ol>
      </section>

      <Link href={`/match/${id}`} className="mt-8 flex min-h-14 items-center justify-center rounded-2xl bg-[var(--surface)] px-5 font-bold">Revoir le résultat et faire une revanche</Link>
    </div>
  );
}
