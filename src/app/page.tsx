import Link from "next/link";

import { MenuLink } from "@/components/menu-link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name").eq("id", user.id).single()
    : { data: null };

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
            Baby-foot
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Prêt à jouer{profile?.display_name ? `, ${profile.display_name}` : ""} ?
          </h1>
        </div>
        <form action="/auth/signout" method="post">
          <button
            className="grid size-12 place-items-center rounded-full bg-[var(--surface-raised)] text-lg text-[var(--muted)]"
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            ↗
          </button>
        </form>
      </header>

      <section className="space-y-4" aria-label="Actions de match">
        <Link
          href="/match/new"
          className="flex min-h-24 items-center justify-between rounded-3xl bg-[var(--accent)] px-6 text-xl font-black text-[#102006] shadow-[0_12px_40px_rgb(183_243_74_/_18%)] transition active:scale-[0.98]"
        >
          Créer un match
          <span aria-hidden="true" className="text-3xl">
            +
          </span>
        </Link>
        <MenuLink href="/join" label="Rejoindre un match" detail="Scanner un QR code" icon="⌁" />
      </section>

      <nav className="mt-auto grid grid-cols-3 gap-3 pt-12" aria-label="Navigation principale">
        <MenuLink compact href="/leaderboard" label="Classement" icon="🏆" />
        <MenuLink compact href="/history" label="Historique" icon="↺" />
        <MenuLink compact href="/profile" label="Profil" icon="●" />
      </nav>
    </div>
  );
}
