"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type ChallengeAction = "decline_challenge" | "withdraw_challenge";

export function ReceivedChallengeActions({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline">();
  const [error, setError] = useState<string>();

  async function accept() {
    setBusy("accept");
    setError(undefined);
    const { data, error: rpcError } = await createClient().rpc("accept_challenge", { p_match_id: matchId });
    if (rpcError || !data) {
      setBusy(undefined);
      setError("Ce défi n’est plus disponible.");
      return;
    }
    router.replace(`/match/${data}`);
    router.refresh();
  }

  async function decline() {
    setBusy("decline");
    setError(undefined);
    const { error: rpcError } = await createClient().rpc("decline_challenge", { p_match_id: matchId });
    if (rpcError) {
      setBusy(undefined);
      setError("Impossible de refuser ce défi.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4">
      {error ? <p role="alert" className="mb-3 text-sm text-red-300">{error}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={decline} disabled={Boolean(busy)} className="min-h-12 rounded-2xl bg-[var(--surface-raised)] px-4 font-black disabled:opacity-60">{busy === "decline" ? "Refus…" : "Refuser"}</button>
        <button type="button" onClick={accept} disabled={Boolean(busy)} className="min-h-12 rounded-2xl bg-[var(--accent)] px-4 font-black text-[var(--accent-contrast)] disabled:opacity-60">{busy === "accept" ? "Acceptation…" : "Accepter"}</button>
      </div>
    </div>
  );
}

export function WithdrawChallengeButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function withdraw(action: ChallengeAction = "withdraw_challenge") {
    setBusy(true);
    setError(undefined);
    const { error: rpcError } = await createClient().rpc(action, { p_match_id: matchId });
    if (rpcError) {
      setBusy(false);
      setError("Impossible de retirer ce défi.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4">
      {error ? <p role="alert" className="mb-3 text-sm text-red-300">{error}</p> : null}
      <button type="button" onClick={() => withdraw()} disabled={busy} className="min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] px-4 font-black disabled:opacity-60">{busy ? "Retrait…" : "Retirer le défi"}</button>
    </div>
  );
}
