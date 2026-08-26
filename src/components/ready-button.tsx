"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function ReadyButton({ matchId, initialReady }: { matchId: string; initialReady: boolean }) {
  const router = useRouter();
  const [ready, setReady] = useState(initialReady);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !ready;
    const { error } = await createClient().rpc("set_ready", { p_match_id: matchId, p_ready: next });
    setBusy(false);
    if (!error) { setReady(next); router.refresh(); }
  }

  return <button onClick={toggle} disabled={busy} className="mt-6 min-h-16 w-full rounded-2xl bg-[var(--accent)] px-5 text-lg font-black text-[#102006] disabled:opacity-60">{ready ? "Je ne suis plus prêt" : "Je suis prêt"}</button>;
}
