import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type PlayerDirectoryEntry = {
  player_id: string;
  display_name: string;
  avatar_url: string | null;
  matches_played: number;
  wins: number;
};

type PlayersPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const rawQuery = (await searchParams).q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim().slice(0, 80) ?? "";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(query ? `/players?q=${query}` : "/players")}`);

  const { data, error } = await supabase.rpc("get_player_directory", { p_search: query || null });
  const players = (data ?? []) as PlayerDirectoryEntry[];

  return (
    <div>
      <Link href="/" className="text-sm font-bold text-[var(--muted)]">← Accueil</Link>
      <header className="mt-10">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Communauté</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Joueurs</h1>
        <p className="mt-3 text-[var(--muted)]">Retrouve un collègue et consulte vos confrontations.</p>
      </header>

      <form action="/players" method="get" role="search" className="mt-6 flex gap-2 rounded-2xl bg-[var(--surface)] p-2">
        <label htmlFor="directory-search" className="sr-only">Rechercher un joueur</label>
        <input id="directory-search" name="q" type="search" defaultValue={query} maxLength={80} placeholder="Nom du joueur" className="min-h-12 min-w-0 flex-1 rounded-xl bg-[var(--surface-raised)] px-4 text-base outline-none placeholder:text-[var(--muted)]" />
        <button className="min-h-12 rounded-xl bg-[var(--accent)] px-4 text-sm font-black text-[var(--accent-contrast)]">Rechercher</button>
      </form>
      {query ? <Link href="/players" className="mt-3 inline-block text-sm font-bold text-[var(--muted)]">Effacer la recherche</Link> : null}

      {error ? (
        <section className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/10 p-5"><h2 className="font-black text-red-200">Annuaire indisponible</h2><p className="mt-2 text-sm text-red-200/70">La migration de l’annuaire doit être appliquée dans Supabase.</p></section>
      ) : players.length === 0 ? (
        <section className="mt-8 rounded-3xl bg-[var(--surface)] p-8 text-center"><h2 className="text-xl font-black">Aucun joueur trouvé</h2><p className="mt-2 text-sm text-[var(--muted)]">Essaie avec une autre partie du nom.</p></section>
      ) : (
        <section className="mt-8" aria-labelledby="player-list">
          <div className="mb-3 flex items-end justify-between"><h2 id="player-list" className="text-lg font-black">{query ? "Résultats" : "Tous les joueurs"}</h2><span className="text-xs font-bold text-[var(--muted)]">{players.length} joueur{players.length === 1 ? "" : "s"}</span></div>
          <ul className="space-y-2">
            {players.map((player) => (
              <li key={player.player_id}>
                <Link href={player.player_id === auth.user.id ? "/profile" : `/profile/${player.player_id}`} className={`flex min-h-20 items-center gap-3 rounded-2xl px-4 ${player.player_id === auth.user.id ? "bg-[var(--surface-raised)] ring-1 ring-[var(--accent)]/30" : "bg-[var(--surface)]"}`}>
                  <span aria-label={`Avatar de ${player.display_name}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--surface-raised)] bg-cover bg-center text-sm font-black" style={player.avatar_url ? { backgroundImage: `url(${JSON.stringify(player.avatar_url)})` } : undefined}>{player.avatar_url ? <span className="sr-only">{initials(player.display_name)}</span> : initials(player.display_name)}</span>
                  <span className="min-w-0 flex-1"><strong className="block truncate">{player.display_name}{player.player_id === auth.user.id ? " · toi" : ""}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{player.matches_played} match{player.matches_played === 1 ? "" : "s"} · {player.wins} victoire{player.wins === 1 ? "" : "s"}</span></span>
                  <span aria-hidden="true" className="text-xl text-[var(--muted)]">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
