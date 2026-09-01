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

const EVENT_NOTIFICATIONS: Record<string, { icon: string; message: string }> = {
  player_joined: { icon: "👋", message: "Un joueur a rejoint le match" },
  player_left: { icon: "←", message: "Un joueur a quitté le match" },
  player_ready: { icon: "✓", message: "Un joueur a modifié sa préparation" },
  match_started: { icon: "▶", message: "Tous les joueurs sont prêts. Le match commence !" },
  goal: { icon: "+1", message: "Le score vient de changer" },
  goal_cancelled: { icon: "↺", message: "Un but vient d’être annulé" },
  result_proposed: { icon: "🏁", message: "Le score final attend ta confirmation" },
  result_confirmed: { icon: "✓", message: "Un joueur a confirmé le résultat" },
  result_rejected: { icon: "!", message: "Le résultat a été refusé" },
  match_finished: { icon: "🏆", message: "Le résultat du match est validé" },
};

export function MatchRealtimeRefresh({ currentUserId, matchId }: { currentUserId: string; matchId: string }) {
  const router = useRouter();
  const refreshTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [attempt, setAttempt] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [toast, setToast] = useState<{ icon: string; message: string }>();

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => {
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => router.refresh(), 120);
    };
    const announce = (event: { actor_id?: string; type?: string }) => {
      if (!event.type || event.actor_id === currentUserId) return;
      const notification = EVENT_NOTIFICATIONS[event.type];
      if (!notification) return;
      setToast(notification);
      navigator.vibrate?.(event.type === "goal" ? 45 : 25);
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(undefined), 3500);
      if (document.visibilityState !== "visible" && "Notification" in window && Notification.permission === "granted") {
        const options = { body: notification.message, icon: "/icon-192.png", badge: "/icon-192.png", tag: `match-${matchId}` };
        if ("serviceWorker" in navigator) void navigator.serviceWorker.ready.then((registration) => registration.showNotification("Baby-foot", options));
        else new Notification("Baby-foot", options);
      }
    };
    const channel = supabase.channel(`match-${matchId}-${attempt}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_participants", filter: `match_id=eq.${matchId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_confirmations", filter: `match_id=eq.${matchId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` }, (payload) => {
        refresh(); announce(payload.new);
      })
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
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", reconcile);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      void supabase.removeChannel(channel);
    };
  }, [attempt, currentUserId, matchId, router]);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setToast({ icon: "!", message: "Les notifications système ne sont pas disponibles sur ce navigateur" });
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
    setToast(permission === "granted"
      ? { icon: "✓", message: "Notifications activées pour ce navigateur" }
      : { icon: "!", message: "Autorisation de notification refusée" });
  }

  const details = DETAILS[connection];
  return <>
    <div className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 flex items-center gap-2">
      <button type="button" onClick={enableNotifications} aria-label="Activer les notifications" className={`grid min-h-10 min-w-10 place-items-center rounded-full border border-white/5 bg-[var(--surface)]/95 text-sm shadow-xl backdrop-blur ${notificationsEnabled ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} title="Activer les notifications">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      </button>
      <button
        type="button"
        aria-live="polite"
        onClick={() => { setConnection("connecting"); setAttempt((value) => value + 1); }}
        className="flex min-h-10 items-center gap-2 rounded-full border border-white/5 bg-[var(--surface)]/95 px-3 text-xs font-bold shadow-xl backdrop-blur"
        title="Toucher pour resynchroniser"
      >
        <span aria-hidden="true" className={`size-2.5 rounded-full ${details.color} ${connection === "connecting" || connection === "error" ? "animate-pulse" : ""}`} />
        {details.label}
      </button>
    </div>
    {toast ? <div role="status" className="fixed left-1/2 top-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))] z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-[var(--surface)]/95 p-4 shadow-2xl backdrop-blur"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-sm font-black text-[var(--accent-contrast)]">{toast.icon}</span><p className="text-sm font-bold">{toast.message}</p></div> : null}
  </>;
}
