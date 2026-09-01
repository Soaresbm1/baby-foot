"use client";

import { useEffect, useState } from "react";

import { formatMatchDuration } from "@/lib/match-duration";

export function MatchTimer({ startedAt }: { startedAt: string }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startedAtMilliseconds = new Date(startedAt).getTime();
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAtMilliseconds) / 1000)));
    const initialTimer = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [startedAt]);

  return (
    <div className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--surface)] px-4 text-sm font-bold text-[var(--muted)]" role="timer" aria-label={`Durée du match : ${formatMatchDuration(elapsedSeconds)}`}>
      <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-[var(--accent)]" />
      <span>Temps de jeu</span>
      <time className="font-black tabular-nums text-white">{formatMatchDuration(elapsedSeconds)}</time>
    </div>
  );
}
