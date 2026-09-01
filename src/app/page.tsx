import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { MenuLink } from "@/components/menu-link";
import { ACTIVE_MATCH_STATUSES, activeMatchAction, type ActiveMatchStatus } from "@/lib/match-status";
import { createClient } from "@/lib/supabase/server";

type ActiveMatch = {
  id: string;
  mode: "one_v_one" | "two_v_two";
  status: ActiveMatchStatus;
  target_score: number;
  team_a_score: number;
  team_b_score: number;
};

async function getActiveMatch(): Promise<ActiveMatch | null> {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;

    const { data } = await supabase
      .from("matches")
      .select("id,mode,status,target_score,team_a_score,team_b_score")
      .in("status", ACTIVE_MATCH_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data as ActiveMatch | null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const activeMatch = await getActiveMatch();

  return (
    <div className="home-dashboard flex min-h-[calc(100dvh-4rem)] flex-col lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:content-center lg:gap-x-14 lg:gap-y-6">
      <header className="mb-8 lg:row-span-2 lg:mb-0 lg:flex lg:flex-col lg:justify-center">
        <BrandLogo priority />
        <div className="mt-7">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
            Baby-foot
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">Prêt à jouer ?</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Crée une partie, invite les joueurs et garde le score synchronisé en temps réel.</p>
        </div>
      </header>

      <section className="space-y-4" aria-label="Actions de match">
        {activeMatch ? (
          <Link
            href={`/match/${activeMatch.id}`}
            className="group flex min-h-28 items-center justify-between rounded-[2rem] border border-[var(--accent)]/35 bg-[var(--surface)] px-6 shadow-[0_18px_45px_rgb(0_0_0_/_22%)] transition active:scale-[0.98]"
          >
            <span>
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                Match en cours · {activeMatch.mode === "two_v_two" ? "2 contre 2" : "1 contre 1"}
              </span>
              <span className="mt-1 block text-xl font-black">{activeMatchAction(activeMatch.status)}</span>
              <span className="mt-1 block text-sm text-[var(--muted)]">
                Score {activeMatch.team_a_score}–{activeMatch.team_b_score} · Premier à {activeMatch.target_score}
              </span>
            </span>
            <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-2xl font-black text-[var(--accent-contrast)] transition group-hover:translate-x-1">
              →
            </span>
          </Link>
        ) : null}
        <Link
          href="/match/new"
          className="group flex min-h-28 items-center justify-between overflow-hidden rounded-[2rem] bg-[var(--accent)] px-6 text-xl font-black text-[var(--accent-contrast)] shadow-[0_18px_45px_rgb(228_0_43_/_24%)] transition active:scale-[0.98]"
        >
          <span><span className="block text-xs font-bold uppercase tracking-[0.18em] text-white">Nouvelle partie</span><span className="mt-1 block">Créer un match</span></span>
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-white/15 text-3xl transition group-hover:scale-105">
            +
          </span>
        </Link>
        <MenuLink href="/join" label="Rejoindre un match" detail="Scanner un QR code" icon="▦" />
      </section>

      <nav className="mt-auto grid grid-cols-3 gap-1 rounded-3xl border border-white/5 bg-[var(--surface)]/90 p-2 shadow-[0_18px_45px_rgb(0_0_0_/_22%)] backdrop-blur lg:col-start-2 lg:mt-0" aria-label="Navigation principale">
        <MenuLink compact href="/leaderboard" label="Classement" icon="🏆" />
        <MenuLink compact href="/history" label="Historique" icon="↺" />
        <MenuLink compact href="/profile" label="Profil" icon="●" />
      </nav>
    </div>
  );
}

