import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { safeRedirectPath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: "Connexion",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md flex-col justify-center py-8">
      <header className="mb-9 text-center">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--accent)]">Baby-foot</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Entrez dans le jeu</h1>
        <p className="mt-3 text-[var(--muted)]">Connectez-vous pour créer ou rejoindre un match.</p>
      </header>

      {parameters.error === "oauth" ? (
        <p role="alert" className="mb-5 rounded-xl bg-red-950/60 px-4 py-3 text-sm text-red-200">
          La connexion Microsoft n’a pas abouti. Réessayez.
        </p>
      ) : null}
      <LoginForm nextPath={safeRedirectPath(parameters.next)} />
    </div>
  );
}

