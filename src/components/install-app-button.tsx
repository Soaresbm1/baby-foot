"use client";

export function InstallAppButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("pwa-install-request"))}
      className="install-app-button mt-4 min-h-14 w-full rounded-2xl bg-[var(--surface)] px-5 font-bold"
    >
      Installer l’application
    </button>
  );
}
