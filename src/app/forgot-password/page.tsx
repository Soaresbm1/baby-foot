import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md flex-col justify-center py-8">
      <header className="mb-9 flex flex-col items-center text-center">
        <BrandLogo priority />
        <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-[var(--accent)]">Récupération</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Mot de passe oublié ?</h1>
        <p className="mt-3 text-[var(--muted)]">Saisis ton adresse e-mail pour recevoir un lien sécurisé.</p>
      </header>
      <ForgotPasswordForm />
      <Link href="/login" className="mt-6 grid min-h-12 place-items-center text-sm font-bold text-[var(--muted)]">← Revenir à la connexion</Link>
    </div>
  );
}
