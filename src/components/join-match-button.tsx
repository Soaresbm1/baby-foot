"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function JoinMatchButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function join() {
    setBusy(true);
    setError(undefined);
    const { data, error: rpcError } = await createClient().rpc("join_match", { p_token: token });
    if (rpcError) { setBusy(false); setError(rpcError.message); return; }
    router.replace(`/match/${data}`);
    router.refresh();
  }

  return (
    <div className="mt-8">
      {error ? <p role="alert" className="mb-4 rounded-2xl bg-[var(--surface)] p-4 text-sm text-red-300">Invitation invalide, expirée ou match déjà complet.</p> : null}
      <button onClick={join} disabled={busy} className="min-h-16 w-full rounded-2xl bg-[var(--accent)] px-5 text-lg font-black text-[var(--accent-contrast)] disabled:opacity-60">
        {busy ? "Connexion au match…" : "Rejoindre le match"}
      </button>
    </div>
  );
}
