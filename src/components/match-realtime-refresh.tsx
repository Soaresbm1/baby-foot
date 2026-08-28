"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type ConnectionState = "connecting" | "live" | "offline" | "error";

const DETAILS: Record<ConnectionState, { color: string; label: string }> = {
  connecting: { color: "bg-amber-300", label: "Connexion…" },
  live: { color: "bg-[var(--accent)]", label: "Synchronisé" },
  offline: { color: "bg-red-400", label: "Hors ligne" },
  error: { color: "bg-red-400", label: "Reconnexion…" },
};

export function MatchRealtimeRefresh({ matchId }: { matchId: string }) {
  const router = useRouter();
  const refreshTimer = useRef<number | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => {
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => router.refresh(), 120);
    };
    const channel = supabase.channel(`match-${matchId}-${attempt}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_participants", filter: `match_id=eq.${matchId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_confirmations", filter: `match_id=eq.${matchId}` }, refresh)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setConnection("live"); refresh(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConnection(navigator.onLine ? "error" : "offline");
      });

    const reconcile = () => {
      if (document.visibilityState === "visible" && navigator.onLine) refresh();
    };
    const online = () => { setConnection("connecting"); setAttempt((value) => value + 1); refresh(); };
    const offline = () => setConnection("offline");
    const poll = window.setInterval(reconcile, 20_000);
    document.addEventListener("visibilitychange", reconcile);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", reconcile);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      void supabase.removeChannel(channel);
    };
  }, [attempt, matchId, router]);

  const details = DETAILS[connection];
  return <button
    type="button"
    aria-live="polite"
    onClick={() => { setConnection("connecting"); setAttempt((value) => value + 1); }}
    className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 flex min-h-10 items-center gap-2 rounded-full border border-white/5 bg-[var(--surface)]/95 px-3 text-xs font-bold shadow-xl backdrop-blur"
    title="Toucher pour resynchroniser"
  >
    <span aria-hidden="true" className={`size-2.5 rounded-full ${details.color} ${connection === "connecting" || connection === "error" ? "animate-pulse" : ""}`} />
    {details.label}
  </button>;
}
