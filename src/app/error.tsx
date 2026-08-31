"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Page rendering failed", error);
  }, [error]);

  return (
    <div className="grid min-h-[75dvh] place-content-center text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]">
        Un problème est survenu
      </p>
      <h1 className="mt-3 text-3xl font-black">La page n’a pas pu être chargée.</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">
        Vérifie ta connexion, puis réessaie. Ton match et ton score restent enregistrés.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={reset}
          className="min-h-14 rounded-2xl bg-[var(--accent)] px-6 font-black text-[var(--accent-contrast)]"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="grid min-h-14 place-items-center rounded-2xl bg-[var(--surface-raised)] px-6 font-bold"
        >
          Revenir à l’accueil
        </Link>
      </div>
    </div>
  );
}
