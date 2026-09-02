import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ChallengePlayer } from "@/components/challenge-player";
import { createClient } from "@/lib/supabase/server";

type PlayerStatistics = {
  player_id: string;
  matches_played: number;
  wins: number;
  goal_difference: number;
  win_rate: number;
  rank: number;
};

type HeadToHead = {
  matches_played: number;
  wins: number;
  losses: number;
  goals_for: number;
  goals_against: number;
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

type PlayerProfilePageProps = { params: Promise<{ id: string }> };

export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/profile/${id}`)}`);
  if (auth.user.id === id) redirect("/profile");

  const [{ data: profile }, { data: leaderboard }, { data: headToHeadData }] = await Promise.all([
    supabase.from("profiles").select("display_name,avatar_url,created_at").eq("id", id).maybeSingle(),
    supabase.rpc("get_leaderboard", { p_mode: null }),
    supabase.rpc("get_head_to_head", { p_opponent_id: id }),
  ]);

  if (!profile) notFound();
  const statistics = ((leaderboard ?? []) as PlayerStatistics[]).find((entry) => entry.player_id === id);
  const duel = ((headToHeadData ?? []) as HeadToHead[])[0];
  const memberSince = new Intl.DateTimeFormat("fr-CH", { month: "long", year: "numeric" }).format(new Date(profile.created_at));

  return (
    <div>
      <Link href="/leaderboard" className="text-sm font-bold text-[var(--muted)]">← Classement</Link>

      <header className="mt-10 flex items-center gap-5">
        <div aria-label={`Avatar de ${profile.display_name}`} className="grid size-20 shrink-0 place-items-center rounded-full bg-[var(--accent)] bg-cover bg-center text-2xl font-black text-[var(--accent-contrast)]" style={profile.avatar_url ? { backgroundImage: `url(${JSON.stringify(profile.avatar_url)})` } : undefined}>
          {profile.avatar_url ? <span className="sr-only">{initials(profile.display_name)}</span> : initials(profile.display_name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Profil joueur</p>
          <h1 className="mt-1 truncate text-3xl font-black tracking-tight">{profile.display_name}</h1>
          <p className="mt-1 text-sm capitalize text-[var(--muted)]">Membre depuis {memberSince}</p>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-3 gap-3" aria-label="Statistiques du joueur">
        <div className="rounded-2xl bg-[var(--surface)] p-4 text-center"><strong className="block text-2xl font-black">{statistics?.rank ? `#${statistics.rank}` : "—"}</strong><span className="mt-1 block text-xs text-[var(--muted)]">Classement</span></div>
        <div className="rounded-2xl bg-[var(--surface)] p-4 text-center"><strong className="block text-2xl font-black text-[var(--accent)]">{statistics?.wins ?? 0}</strong><span className="mt-1 block text-xs text-[var(--muted)]">Victoires</span></div>
        <div className="rounded-2xl bg-[var(--surface)] p-4 text-center"><strong className="block text-2xl font-black">{statistics?.win_rate ?? 0}%</strong><span className="mt-1 block text-xs text-[var(--muted)]">Réussite</span></div>
      </section>

      <section className="mt-4 rounded-3xl bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between border-b border-white/5 pb-4"><span className="text-sm text-[var(--muted)]">Matchs joués</span><strong>{statistics?.matches_played ?? 0}</strong></div>
        <div className="flex items-center justify-between pt-4"><span className="text-sm text-[var(--muted)]">Différence de buts</span><strong className={(statistics?.goal_difference ?? 0) >= 0 ? "text-[var(--accent)]" : "text-red-300"}>{(statistics?.goal_difference ?? 0) > 0 ? "+" : ""}{statistics?.goal_difference ?? 0}</strong></div>
      </section>

      <section className="mt-8 rounded-3xl bg-[var(--surface)] p-5" aria-labelledby="head-to-head-title">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Confrontations</p>
        <h2 id="head-to-head-title" className="mt-2 text-xl font-black">Toi contre {profile.display_name}</h2>
        {(duel?.matches_played ?? 0) > 0 ? (
          <>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div><strong className="block text-2xl font-black">{duel.matches_played}</strong><span className="text-xs text-[var(--muted)]">Matchs</span></div>
              <div><strong className="block text-2xl font-black text-[var(--accent)]">{duel.wins}</strong><span className="text-xs text-[var(--muted)]">Tes victoires</span></div>
              <div><strong className="block text-2xl font-black">{duel.losses}</strong><span className="text-xs text-[var(--muted)]">Ses victoires</span></div>
            </div>
            <p className="mt-5 border-t border-white/5 pt-4 text-center text-sm text-[var(--muted)]">Buts cumulés : <strong className="text-white">{duel.goals_for}–{duel.goals_against}</strong></p>
          </>
        ) : <p className="mt-4 text-sm text-[var(--muted)]">Vous ne vous êtes pas encore affrontés dans un match confirmé.</p>}
      </section>

      <ChallengePlayer opponentId={id} opponentName={profile.display_name} />
    </div>
  );
}
