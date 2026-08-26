import Link from "next/link";

import { JoinCodeForm } from "@/components/join-code-form";

export default function JoinIndexPage() {
  return (
    <div>
      <Link href="/" className="text-sm font-bold text-[var(--muted)]">← Accueil</Link>
      <p className="mt-10 text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Rejoindre</p>
      <h1 className="mt-2 text-4xl font-black">Colle ton invitation</h1>
      <p className="mt-3 text-[var(--muted)]">Utilise le lien reçu ou colle ici le code d’invitation.</p>
      <JoinCodeForm />
    </div>
  );
}
