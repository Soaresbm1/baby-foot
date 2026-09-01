"use client";

import { useState } from "react";

import { buildMatchShareText } from "@/lib/share-result";

type ShareMatchResultProps = {
  teamA: string;
  teamAScore: number;
  teamB: string;
  teamBScore: number;
};

export function ShareMatchResult(props: ShareMatchResultProps) {
  const [feedback, setFeedback] = useState<string>();

  async function share() {
    const text = buildMatchShareText(props);
    const url = window.location.origin;
    setFeedback(undefined);

    try {
      if (navigator.share) {
        await navigator.share({ title: "Résultat du match", text, url });
        setFeedback("Résultat partagé.");
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setFeedback("Résultat copié.");
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setFeedback("Le partage n’a pas pu être ouvert.");
    }
  }

  return (
    <>
      <button type="button" onClick={share} className="mt-3 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] px-5 font-bold">
        Partager le résultat
      </button>
      {feedback ? <p role="status" className="mt-2 text-center text-sm text-[var(--muted)]">{feedback}</p> : null}
    </>
  );
}
