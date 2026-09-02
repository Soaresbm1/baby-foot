import Link from "next/link";
import { redirect } from "next/navigation";

import { AcceptChallengeButton } from "@/components/accept-challenge-button";
import { createClient } from "@/lib/supabase/server";

type PendingChallenge = {
  match_id: string;
  challenger_id: string;
  challenger_name: string;
  challenger_avatar_url: string | null;
  target_score: number;
  created_at: string;
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default async function ChallengesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/challenges");

  const { data, error } = await supabase.rpc("get_my_pending_challenges");
  const challenges = (data ?? []) as PendingChallenge[];

  return (
    <div>
      <Link href="/" className="text-sm font-bold text-[var(--muted)]">← Accueil</Link>
      <header className="mt-10">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">À toi de jouer</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Défis reçus</h1>
        <p className="mt-3 text-[var(--muted)]">Accepte un duel puis confirme que tu es prêt.</p>
      </header>

      {error ? (
        <section className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/10 p-5"><h2 className="font-black text-red-200">Défis indisponibles</h2><p className="mt-2 text-sm text-red-200/70">La migration de la boîte de réception doit être appliquée dans Supabase.</p></section>
      ) : challenges.length === 0 ? (
        <section className="mt-8 rounded-3xl bg-[var(--surface)] p-8 text-center"><div aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--surface-raised)] text-3xl">⚔</div><h2 className="mt-5 text-xl font-black">Aucun défi en attente</h2><p className="mt-2 text-sm text-[var(--muted)]">Les invitations privées reçues apparaîtront ici.</p><Link href="/players" className="mt-6 flex min-h-14 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 font-black text-[var(--accent-contrast)]">Trouver un adversaire</Link></section>
      ) : (
        <ol className="mt-8 space-y-4">
          {challenges.map((challenge) => (
            <li key={challenge.match_id} className="rounded-3xl bg-[var(--surface)] p-5">
              <div className="flex items-center gap-4">
                <span aria-label={`Avatar de ${challenge.challenger_name}`} className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--surface-raised)] bg-cover bg-center font-black" style={challenge.challenger_avatar_url ? { backgroundImage: `url(${JSON.stringify(challenge.challenger_avatar_url)})` } : undefined}>{challenge.challenger_avatar_url ? <span className="sr-only">{initials(challenge.challenger_name)}</span> : initials(challenge.challenger_name)}</span>
                <div className="min-w-0 flex-1"><Link href={`/profile/${challenge.challenger_id}`} className="block truncate text-lg font-black">{challenge.challenger_name}</Link><p className="mt-1 text-xs text-[var(--muted)]">Premier à {challenge.target_score} · {formatDate(challenge.created_at)}</p></div>
                <span aria-hidden="true" className="text-2xl">⚔</span>
              </div>
              <AcceptChallengeButton matchId={challenge.match_id} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
