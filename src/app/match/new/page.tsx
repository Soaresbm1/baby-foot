import Link from "next/link";
import { redirect } from "next/navigation";

import { NewMatchForm } from "@/components/new-match-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewMatchPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/match/new");

  return (
    <div>
      <Link href="/" className="text-sm font-bold text-[var(--muted)]">← Accueil</Link>
      <p className="mt-10 text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Nouveau match</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Prépare la table</h1>
      <p className="mt-3 text-[var(--muted)]">Commence en 1 contre 1. Tu pourras inviter ton adversaire juste après.</p>
      <NewMatchForm />
    </div>
  );
}
