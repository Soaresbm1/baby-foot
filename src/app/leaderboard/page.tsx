import Link from "next/link";
import { redirect } from "next/navigation";

import { leaderboardModeParameter, parseLeaderboardMode, type LeaderboardMode } from "@/lib/leaderboard-mode";
import { createClient } from "@/lib/supabase/server";

type LeaderboardEntry = {
  player_id: string;
  display_name: string;
  avatar_url: string | null;
  matches_played: number;
  wins: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  win_rate: number;
  rank: number;
};

type Season = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const MODE_TABS: { label: string; mode: LeaderboardMode }[] = [
  { label: "Tous", mode: "all" },
  { label: "1 contre 1", mode: "one_v_one" },
  { label: "2 contre 2", mode: "two_v_two" },
];

type LeaderboardPageProps = {
  searchParams: Promise<{ mode?: string | string[]; season?: string | string[] }>;
};

function parameter(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function leaderboardHref(mode: LeaderboardMode, seasonId?: string) {
  const query = new URLSearchParams();
  if (mode !== "all") query.set("mode", mode);
  if (seasonId) query.set("season", seasonId);
  return query.size ? `/leaderboard?${query}` : "/leaderboard";
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const parameters = await searchParams;
  const mode = parseLeaderboardMode(parameters.mode);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/leaderboard");

  const seasonsResult = await supabase.from("seasons").select("id,name,starts_at,ends_at,is_active").order("starts_at", { ascending: false });
  const seasons = (seasonsResult.data ?? []) as Season[];
  const requestedSeasonId = parameter(parameters.season);
  const selectedSeason = seasons.find((season) => season.id === requestedSeasonId)
    ?? seasons.find((season) => season.is_active)
    ?? seasons[0];
  const historicalSeasonId = selectedSeason?.is_active ? undefined : selectedSeason?.id;
  const { data, error } = selectedSeason
    ? await supabase.rpc("get_leaderboard", { p_mode: leaderboardModeParameter(mode), p_season_id: selectedSeason.id })
    : { data: null, error: seasonsResult.error };
  const entries = (data ?? []) as LeaderboardEntry[];
  const podium = entries.slice(0, 3);

  return (
    <div>
      <Link href="/" className="text-sm font-bold text-[var(--muted)]">← Accueil</Link>

      <header className="mt-10">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">{selectedSeason?.is_active ? "Saison actuelle" : "Archives"}</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Classement</h1>
        <p className="mt-3 text-[var(--muted)]">{selectedSeason ? `Année civile ${selectedSeason.name} · seuls les matchs confirmés comptent.` : "Seuls les matchs confirmés comptent dans les statistiques."}</p>
      </header>

      {seasons.length > 1 ? (
        <nav className="mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Saison du classement">
          {seasons.map((season) => (
            <Link key={season.id} href={leaderboardHref(mode, season.is_active ? undefined : season.id)} aria-current={season.id === selectedSeason?.id ? "page" : undefined} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${season.id === selectedSeason?.id ? "bg-white text-black" : "bg-[var(--surface)] text-[var(--muted)]"}`}>{season.name}</Link>
          ))}
        </nav>
      ) : null}

      <nav className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-[var(--surface)] p-1.5" aria-label="Mode du classement">
        {MODE_TABS.map((tab) => (
          <Link
            key={tab.mode}
            href={leaderboardHref(tab.mode, historicalSeasonId)}
            aria-current={mode === tab.mode ? "page" : undefined}
            className={`grid min-h-11 place-items-center rounded-xl px-2 text-center text-sm font-bold ${mode === tab.mode ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--muted)]"}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {error ? (
        <section className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/10 p-5">
          <h2 className="font-black text-red-200">Classement indisponible</h2>
          <p className="mt-2 text-sm text-red-200/70">La migration du classement doit être appliquée dans Supabase.</p>
        </section>
      ) : entries.length === 0 ? (
        <section className="mt-8 rounded-3xl bg-[var(--surface)] p-8 text-center">
          <div aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--surface-raised)] text-3xl">🏆</div>
          <h2 className="mt-5 text-xl font-black">Le podium est encore libre</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Termine et confirme un premier match pour inaugurer le classement.</p>
          <Link href="/match/new" className="mt-6 flex min-h-14 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 font-black text-[var(--accent-contrast)]">Créer un match</Link>
        </section>
      ) : (
        <>
          <section className="mt-8 grid grid-cols-3 items-end gap-2" aria-label="Podium">
            {[podium[1], podium[0], podium[2]].map((entry, index) => {
              if (!entry) return <div key={`empty-${index}`} />;
              const isFirst = entry.rank === 1;
              return (
                <div key={entry.player_id} className={`rounded-3xl bg-[var(--surface)] px-2 py-5 text-center ${isFirst ? "pb-8 pt-7" : ""}`}>
                  <div className={`mx-auto grid place-items-center rounded-full font-black text-[var(--accent-contrast)] ${isFirst ? "size-16 bg-[var(--accent)] text-xl" : "size-12 bg-[var(--muted)]"}`}>{initials(entry.display_name)}</div>
                  <p className="mt-3 truncate text-sm font-black">{entry.display_name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{entry.wins} victoire{entry.wins === 1 ? "" : "s"}</p>
                  <span className="mt-3 inline-grid size-7 place-items-center rounded-full bg-[var(--surface-raised)] text-xs font-black">{entry.rank}</span>
                </div>
              );
            })}
          </section>

          <section className="mt-8" aria-labelledby="general-ranking">
            <div className="mb-3 flex items-end justify-between">
              <h2 id="general-ranking" className="text-lg font-black">Tous les joueurs</h2>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">V · M · Diff.</span>
            </div>
            <ol className="space-y-2">
              {entries.map((entry) => (
                <li key={entry.player_id} className={`flex min-h-20 items-center gap-3 rounded-2xl px-4 ${entry.player_id === auth.user.id ? "bg-[var(--surface-raised)] ring-1 ring-[var(--accent)]/30" : "bg-[var(--surface)]"}`}>
                  <span className="w-6 text-center font-black text-[var(--muted)]">{entry.rank}</span>
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--surface-raised)] text-sm font-black">{initials(entry.display_name)}</span>
                  <Link href={entry.player_id === auth.user.id ? "/profile" : `/profile/${entry.player_id}`} className="min-w-0 flex-1 rounded-lg focus-visible:outline-offset-4">
                    <span className="block truncate font-black">{entry.display_name}{entry.player_id === auth.user.id ? " · toi" : ""}</span>
                    <span className="mt-1 block text-xs text-[var(--muted)]">{entry.win_rate}% de victoires</span>
                  </Link>
                  <span className="text-right text-sm font-black">
                    {entry.wins} · {entry.matches_played} · <span className={entry.goal_difference >= 0 ? "text-[var(--accent)]" : "text-red-300"}>{entry.goal_difference > 0 ? "+" : ""}{entry.goal_difference}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
