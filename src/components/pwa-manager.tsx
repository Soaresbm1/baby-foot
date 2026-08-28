"use client";

import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaManager() {
  const [prompt, setPrompt] = useState<InstallPromptEvent>();
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js");
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (standalone || localStorage.getItem("pwa-install-dismissed") === "true") return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const iosTimer = ios ? window.setTimeout(() => { setShowIosHelp(true); setVisible(true); }, 0) : null;
    const onPrompt = (event: Event) => {
      event.preventDefault(); setPrompt(event as InstallPromptEvent); setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      if (iosTimer !== null) window.clearTimeout(iosTimer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  function dismiss() {
    localStorage.setItem("pwa-install-dismissed", "true"); setVisible(false);
  }
  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
  }

  if (!visible) return null;
  return (
    <aside className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] mx-auto max-w-lg rounded-3xl border border-white/10 bg-[var(--surface)]/95 p-4 shadow-2xl backdrop-blur" aria-label="Installer l’application">
      <div className="flex items-start gap-3">
        <BrandLogo compact />
        <div className="min-w-0 flex-1"><p className="font-black">Installer Baby-foot</p><p className="mt-1 text-sm text-[var(--muted)]">{showIosHelp ? "Dans Safari, touche Partager puis « Sur l’écran d’accueil »." : "Accède aux matchs comme à une vraie application."}</p></div>
        <button type="button" onClick={dismiss} aria-label="Fermer" className="grid size-10 shrink-0 place-items-center text-xl text-[var(--muted)]">×</button>
      </div>
      {!showIosHelp && prompt ? <button type="button" onClick={install} className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-contrast)]">Installer</button> : null}
    </aside>
  );
}
