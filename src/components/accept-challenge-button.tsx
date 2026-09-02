"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function AcceptChallengeButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function accept() {
    setBusy(true);
    setError(undefined);
    const { data, error: rpcError } = await createClient().rpc("accept_challenge", { p_match_id: matchId });
    if (rpcError || !data) {
      setBusy(false);
      setError("Ce défi n’est plus disponible.");
      return;
    }
    router.replace(`/match/${data}`);
    router.refresh();
  }

  return (
    <div className="mt-4">
      {error ? <p role="alert" className="mb-3 text-sm text-red-300">{error}</p> : null}
      <button type="button" onClick={accept} disabled={busy} className="min-h-12 w-full rounded-2xl bg-[var(--accent)] px-4 font-black text-[var(--accent-contrast)] disabled:opacity-60">{busy ? "Acceptation…" : "Accepter le défi"}</button>
    </div>
  );
}
