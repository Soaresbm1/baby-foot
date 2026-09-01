import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminCancelMatchButton } from "@/components/admin-cancel-match-button";
import { AdminRoleButton } from "@/components/admin-role-button";
import { createClient } from "@/lib/supabase/server";

type AdminStatistics = {
  players: number;
  matches: number;
  completed_matches: number;
  active_matches: number;
};

type AdminPlayer = {
  id: string;
  display_name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  matches_played: number;
};

type AdminMatch = {
  id: string;
  mode: "one_v_one" | "two_v_two";
  status: string;
  team_a_score: number;
  team_b_score: number;
  target_score: number;
  created_at: string;
  creator_name: string;
  participant_count: number;
};

type AdminDashboard = {
  statistics: AdminStatistics;
  players: AdminPlayer[];
  matches: AdminMatch[];
};

type AdminAuditEntry = {
  id: string;
  action: "admin_granted" | "admin_revoked" | "match_cancelled";
  created_at: string;
  actor: { display_name: string } | { display_name: string }[] | null;
  target: { display_name: string } | { display_name: string }[] | null;
};

const statusLabels: Record<string, string> = {
  waiting_for_players: "En attente de joueurs",
  waiting_for_ready: "En attente de validation",
  in_progress: "En cours",
  awaiting_confirmation: "Résultat à confirmer",
  completed: "Terminé",
  cancelled: "Annulé",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function relatedName(value: AdminAuditEntry["actor"]) {
  const profile = Array.isArray(value) ? value[0] : value;
  return profile?.display_name ?? "Utilisateur inconnu";
}

type AdminPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const rawQuery = (await searchParams).q;
  const playerQuery = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim().slice(0, 80) ?? "";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/admin");

  const { data: isAdmin, error: roleError } = await supabase.rpc("current_user_is_admin");
  if (roleError || !isAdmin) notFound();

  const [{ data, error }, { data: auditData, error: auditError }, { data: playerData, error: playerSearchError }] = await Promise.all([
    supabase.rpc("get_admin_dashboard"),
    supabase
      .from("admin_audit_log")
      .select("id,action,created_at,actor:profiles!admin_audit_log_actor_id_fkey(display_name),target:profiles!admin_audit_log_target_user_id_fkey(display_name)")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.rpc("get_admin_players", { p_search: playerQuery || null }),
  ]);
  const dashboard = data as AdminDashboard | null;
  const auditEntries = (auditData ?? []) as AdminAuditEntry[];
  const players = playerSearchError ? (dashboard?.players ?? []) : (playerData ?? []) as AdminPlayer[];

  return (
    <div>
      <Link href="/" className="text-sm font-bold text-[var(--muted)]">← Accueil</Link>

      <header className="mt-10">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Administration</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Tableau de bord</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Vue d’ensemble de l’activité de l’application.</p>
      </header>

      {error || !dashboard ? (
        <section className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/10 p-5">
          <h2 className="font-black text-red-200">Administration indisponible</h2>
          <p className="mt-2 text-sm text-red-200/70">Vérifie que la migration d’administration est appliquée dans Supabase.</p>
        </section>
      ) : (
        <>
          <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Résumé de l’application">
            {[
              ["Joueurs", dashboard.statistics.players],
              ["Matchs", dashboard.statistics.matches],
              ["Terminés", dashboard.statistics.completed_matches],
              ["Actifs", dashboard.statistics.active_matches],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[var(--surface)] p-4 text-center">
                <strong className="block text-2xl font-black">{value}</strong>
                <span className="mt-1 block text-xs text-[var(--muted)]">{label}</span>
              </div>
            ))}
          </section>

          <section className="mt-10" aria-labelledby="admin-matches">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Activité</p><h2 id="admin-matches" className="mt-1 text-xl font-black">Matchs récents</h2></div>
              <span className="text-xs font-bold text-[var(--muted)]">20 derniers</span>
            </div>
            <ol className="mt-4 space-y-3">
              {dashboard.matches.map((match) => (
                <li key={match.id} className="flex min-h-24 items-center gap-4 rounded-3xl bg-[var(--surface)] p-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--surface-raised)] font-black tabular-nums">{match.team_a_score}–{match.team_b_score}</span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate">{match.creator_name}</strong>
                      <span className="mt-1 block text-xs text-[var(--muted)]">{statusLabels[match.status] ?? match.status} · {match.mode === "one_v_one" ? "1 contre 1" : "2 contre 2"}</span>
                      <span className="mt-1 block text-xs text-[var(--muted)]">{formatDate(match.created_at)} · {match.participant_count} joueur{match.participant_count === 1 ? "" : "s"}</span>
                    </span>
                    {match.status !== "completed" && match.status !== "cancelled" ? <AdminCancelMatchButton matchId={match.id} /> : null}
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-10" aria-labelledby="admin-players">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Communauté</p><h2 id="admin-players" className="mt-1 text-xl font-black">Joueurs</h2></div>
              <span className="text-xs font-bold text-[var(--muted)]">{players.length} résultat{players.length === 1 ? "" : "s"}</span>
            </div>
            <form action="/admin" method="get" className="mt-4 flex gap-2 rounded-2xl bg-[var(--surface)] p-2" role="search">
              <label htmlFor="player-search" className="sr-only">Rechercher un joueur</label>
              <input id="player-search" name="q" type="search" defaultValue={playerQuery} maxLength={80} placeholder="Nom ou adresse e-mail" className="min-h-12 min-w-0 flex-1 rounded-xl bg-[var(--surface-raised)] px-4 text-sm outline-none placeholder:text-[var(--muted)]" />
              <button type="submit" className="min-h-12 rounded-xl bg-[var(--accent)] px-4 text-sm font-black text-[var(--accent-contrast)]">Rechercher</button>
            </form>
            {playerQuery ? <Link href="/admin" className="mt-3 inline-block text-sm font-bold text-[var(--muted)]">Effacer la recherche</Link> : null}
            {playerSearchError ? <p className="mt-3 text-xs text-amber-200">Applique la migration de recherche pour afficher plus de 20 joueurs.</p> : null}
            {players.length === 0 ? (
              <p className="mt-4 rounded-3xl bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">Aucun joueur ne correspond à cette recherche.</p>
            ) : <ul className="mt-4 divide-y divide-white/5 overflow-hidden rounded-3xl bg-[var(--surface)]">
              {players.map((player) => (
                <li key={player.id} className="flex min-h-20 items-center gap-3 px-4 py-3">
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--surface-raised)] font-black">{player.display_name.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{player.display_name}{player.is_admin ? " · Admin" : ""}</strong><span className="mt-1 block truncate text-xs text-[var(--muted)]">{player.email}</span></span>
                  <span className="shrink-0 text-right"><strong className="block text-sm">{player.matches_played}</strong><span className="text-[10px] text-[var(--muted)]">matchs</span></span>
                  {player.id === auth.user.id ? (
                    <span className="shrink-0 rounded-xl bg-[var(--accent)]/15 px-3 py-2 text-xs font-black text-[var(--accent)]">Vous</span>
                  ) : (
                    <AdminRoleButton isAdmin={player.is_admin} playerId={player.id} playerName={player.display_name} />
                  )}
                </li>
              ))}
            </ul>}
          </section>

          <section className="mt-10" aria-labelledby="admin-audit">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Sécurité</p><h2 id="admin-audit" className="mt-1 text-xl font-black">Journal des actions</h2></div>
              <span className="text-xs font-bold text-[var(--muted)]">20 derniers</span>
            </div>
            {auditError ? (
              <p className="mt-4 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">Applique la migration de gestion des administrateurs pour activer le journal.</p>
            ) : auditEntries.length === 0 ? (
              <p className="mt-4 rounded-3xl bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">Aucun changement de droits enregistré.</p>
            ) : (
              <ol className="mt-4 divide-y divide-white/5 overflow-hidden rounded-3xl bg-[var(--surface)]">
                {auditEntries.map((entry) => (
                  <li key={entry.id} className="flex min-h-20 items-center gap-3 px-4 py-3">
                    <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-full font-black ${entry.action === "admin_granted" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "bg-red-400/10 text-red-300"}`}>{entry.action === "admin_granted" ? "+" : entry.action === "admin_revoked" ? "−" : "×"}</span>
                    <span className="min-w-0 flex-1 text-sm">
                      <strong>{relatedName(entry.actor)}</strong>
                      <span className="text-[var(--muted)]"> {entry.action === "admin_granted" ? "a donné les droits à" : entry.action === "admin_revoked" ? "a retiré les droits de" : "a annulé le match créé par"} </span>
                      <strong>{relatedName(entry.target)}</strong>
                      <span className="mt-1 block text-xs text-[var(--muted)]">{formatDate(entry.created_at)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
