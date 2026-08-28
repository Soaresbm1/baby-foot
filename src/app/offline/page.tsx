"use client";

export default function OfflinePage() {
  return (
    <div className="grid min-h-[75dvh] place-content-center text-center">
      <div aria-hidden="true" className="mx-auto grid size-20 place-items-center rounded-full bg-[var(--surface)] text-4xl">⌁</div>
      <p className="mt-8 text-sm font-black uppercase tracking-[0.22em] text-[var(--accent)]">Hors ligne</p>
      <h1 className="mt-3 text-3xl font-black">Connexion interrompue</h1>
      <p className="mx-auto mt-3 max-w-sm text-[var(--muted)]">Les scores ne sont jamais enregistrés hors ligne. Reconnecte-toi pour continuer le match sans risque de compter un but deux fois.</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-8 min-h-14 rounded-2xl bg-[var(--accent)] px-6 font-black text-[var(--accent-contrast)]">Réessayer</button>
    </div>
  );
}
