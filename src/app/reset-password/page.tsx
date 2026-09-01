import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage() {
  const { data: auth } = await (await createClient()).auth.getUser();

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md flex-col justify-center py-8">
      <header className="mb-9 flex flex-col items-center text-center">
        <BrandLogo priority />
        <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-[var(--accent)]">Sécurité</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Nouveau mot de passe</h1>
        <p className="mt-3 text-[var(--muted)]">Choisis un mot de passe d’au moins 8 caractères.</p>
      </header>
      {auth.user ? <ResetPasswordForm /> : (
        <section className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-6 text-center">
          <h2 className="text-xl font-black text-amber-100">Lien invalide ou expiré</h2>
          <p className="mt-2 text-sm leading-6 text-amber-100/70">Demande un nouveau lien pour modifier ton mot de passe.</p>
          <Link href="/forgot-password" className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-4 font-black text-[var(--accent-contrast)]">Demander un nouveau lien</Link>
        </section>
      )}
    </div>
  );
}
