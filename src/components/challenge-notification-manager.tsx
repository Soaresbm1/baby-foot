"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const PREFERENCE_KEY = "challenge-notifications-enabled";
const PREFERENCE_EVENT = "challenge-notification-preference";

export function ChallengeNotificationManager() {
  const pathname = usePathname();
  const router = useRouter();
  const timer = useRef<number | null>(null);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    async function showSystemNotification() {
      if (localStorage.getItem(PREFERENCE_KEY) !== "true" || !("Notification" in window) || Notification.permission !== "granted") return;
      const options: NotificationOptions = {
        body: "Un joueur t’invite à disputer un match.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "new-challenge",
        data: { url: "/challenges" },
      };
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("Nouveau défi Baby-foot", options);
      } else {
        new Notification("Nouveau défi Baby-foot", options);
      }
    }

    function announceChallenge() {
      setMessage("Tu as reçu un nouveau défi !");
      navigator.vibrate?.([50, 40, 50]);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setMessage(undefined), 5000);
      void showSystemNotification();
    }

    async function subscribe() {
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;
      channel = supabase
        .channel(`global-challenges-${data.user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "matches", filter: `invited_user_id=eq.${data.user.id}` },
          () => {
            announceChallenge();
            if (pathname === "/" || pathname === "/challenges") router.refresh();
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "matches", filter: `invited_user_id=eq.${data.user.id}` },
          () => {
            if (pathname === "/" || pathname === "/challenges") router.refresh();
          },
        )
        .subscribe();
    }

    void subscribe();
    return () => {
      active = false;
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [pathname, router]);

  return message ? (
    <Link href="/challenges" role="status" className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[70] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-[var(--surface)]/95 p-4 shadow-2xl backdrop-blur">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-xl text-[var(--accent-contrast)]">⚔</span>
      <span className="min-w-0 flex-1"><span className="block font-black">Nouveau défi</span><span className="text-sm text-[var(--muted)]">{message}</span></span>
      <span aria-hidden="true" className="text-xl text-[var(--muted)]">›</span>
    </Link>
  ) : null;
}

export function ChallengeNotificationToggle() {
  const [supported, setSupported] = useState<boolean>();
  const [enabled, setEnabled] = useState(false);
  const [feedback, setFeedback] = useState<string>();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSupported("Notification" in window);
      setEnabled("Notification" in window && Notification.permission === "granted" && localStorage.getItem(PREFERENCE_KEY) === "true");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function toggle() {
    if (!("Notification" in window)) {
      setFeedback("Installe l’application sur l’écran d’accueil pour utiliser les notifications.");
      return;
    }
    if (enabled) {
      localStorage.removeItem(PREFERENCE_KEY);
      setEnabled(false);
      setFeedback("Notifications de défis désactivées sur cet appareil.");
      window.dispatchEvent(new Event(PREFERENCE_EVENT));
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem(PREFERENCE_KEY, "true");
      setEnabled(true);
      setFeedback("Notifications de défis activées sur cet appareil.");
      window.dispatchEvent(new Event(PREFERENCE_EVENT));
    } else {
      setFeedback("Autorisation refusée. Tu peux la modifier dans les réglages du navigateur.");
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-white/5 bg-[var(--surface)] p-5">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--surface-raised)] text-xl">🔔</span>
        <div className="min-w-0 flex-1"><h2 className="font-black">Notifications de défis</h2><p className="mt-1 text-sm text-[var(--muted)]">Sois averti dès qu’un joueur te défie.</p></div>
        <button type="button" onClick={toggle} aria-pressed={enabled} className={`min-h-11 rounded-2xl px-4 text-sm font-black ${enabled ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "bg-[var(--surface-raised)]"}`}>{enabled ? "Activées" : "Activer"}</button>
      </div>
      {supported === false ? <p className="mt-3 text-xs text-amber-200">Sur iPhone, installe d’abord le site sur l’écran d’accueil puis ouvre-le depuis son icône.</p> : null}
      {feedback ? <p role="status" className="mt-3 text-xs text-[var(--muted)]">{feedback}</p> : null}
    </section>
  );
}
