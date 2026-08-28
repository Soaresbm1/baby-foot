import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type HistoryEntry = {
  match_id: string;
  played_at: string;
  mode: "one_v_one" | "two_v_two";
  target_score: number;
  my_score: number;
  opponent_score: number;
  opponent_names: string;
  result: "won" | "lost" | "cancelled";
  rematch_of: string | null;
};

const resultDetails = {
  won: { label: "Victoire", badge: "V", color: "bg-[var(--accent)] text-[var(--accent-contrast)]" },
  lost: { label: "Défaite", badge: "D", color: "bg-red-400/15 text-red-300" },
  cancelled: { label: "Annulé", badge: "—", color: "bg-[var(--surface-raised)] text-[var(--muted)]" },
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/history");

  const { data, error } = await supabase.rpc("get_my_match_history");
  const matches = (data ?? []) as HistoryEntry[];
  const completed = matches.filter((match) => match.result !== "cancelled");
  const wins = matches.filter((match) => match.result === "won").length;
  const winRate = completed.length ? Math.round((wins / completed.length) * 100) : 0;

  return (
    <div>
      <Link href="/" className="text-sm font-bold text-[var(--muted)]">← Accueil</Link>

      <header className="mt-10">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Tes performances</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Historique</h1>
      </header>

      {!error && matches.length > 0 ? (
        <section className="mt-8 grid grid-cols-3 gap-3" aria-label="Résumé personnel">
          <div className="rounded-2xl bg-[var(--surface)] p-4 text-center">
            <strong className="block text-2xl font-black">{completed.length}</strong>
            <span className="mt-1 block text-xs text-[var(--muted)]">Matchs</span>
          </div>
          <div className="rounded-2xl bg-[var(--surface)] p-4 text-center">
            <strong className="block text-2xl font-black text-[var(--accent)]">{wins}</strong>
            <span className="mt-1 block text-xs text-[var(--muted)]">Victoires</span>
          </div>
          <div className="rounded-2xl bg-[var(--surface)] p-4 text-center">
            <strong className="block text-2xl font-black">{winRate}%</strong>
            <span className="mt-1 block text-xs text-[var(--muted)]">Réussite</span>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/10 p-5">
          <h2 className="font-black text-red-200">Historique indisponible</h2>
          <p className="mt-2 text-sm text-red-200/70">La migration de l’historique doit être appliquée dans Supabase.</p>
        </section>
      ) : matches.length === 0 ? (
        <section className="mt-8 rounded-3xl bg-[var(--surface)] p-8 text-center">
          <div aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--surface-raised)] text-3xl">↺</div>
          <h2 className="mt-5 text-xl font-black">Aucun match terminé</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Tes résultats confirmés apparaîtront ici.</p>
          <Link href="/match/new" className="mt-6 flex min-h-14 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 font-black text-[var(--accent-contrast)]">Jouer maintenant</Link>
        </section>
      ) : (
        <section className="mt-8" aria-labelledby="match-list">
          <div className="mb-3 flex items-end justify-between">
            <h2 id="match-list" className="text-lg font-black">Derniers matchs</h2>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Plus récent</span>
          </div>
          <ol className="space-y-3">
            {matches.map((match) => {
              const details = resultDetails[match.result];
              return (
                <li key={match.match_id}>
                  <Link href={`/history/${match.match_id}`} className="flex min-h-24 items-center gap-4 rounded-3xl bg-[var(--surface)] p-4 transition active:scale-[0.99]">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-black ${details.color}`}>{details.badge}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-black">vs {match.opponent_names}</span>
                      <span className="mt-1 block text-xs text-[var(--muted)]">{formatDate(match.played_at)} · {match.mode === "one_v_one" ? "1 contre 1" : "2 contre 2"}</span>
                      <span className="mt-1 block text-xs font-bold text-[var(--muted)]">{details.label}{match.rematch_of ? " · Revanche" : ""}</span>
                    </span>
                    <span className="shrink-0 text-2xl font-black tabular-nums">{match.my_score}<span className="mx-1 text-[var(--muted)]">–</span>{match.opponent_score}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
