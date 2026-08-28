import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[75dvh] place-content-center text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]">Erreur 404</p>
      <h1 className="mt-3 text-3xl font-black">Cette page n’existe pas.</h1>
      <Link className="mt-8 rounded-2xl bg-[var(--accent)] px-6 py-4 font-bold text-[var(--accent-contrast)]" href="/">
        Revenir à l’accueil
      </Link>
    </div>
  );
}

