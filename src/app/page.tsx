import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { MenuLink } from "@/components/menu-link";

export default function HomePage() {
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

