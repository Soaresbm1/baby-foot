"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <button type="button" onClick={signOut} disabled={busy} className="mt-8 min-h-12 w-full rounded-2xl text-sm font-bold text-red-300 disabled:opacity-60">{busy ? "Déconnexion…" : "Se déconnecter"}</button>;
}
