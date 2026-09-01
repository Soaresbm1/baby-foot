"use client";

import { useState } from "react";

import { InviteQrCode } from "@/components/invite-qr-code";
import { createClient } from "@/lib/supabase/client";

export function MatchInvitation({ matchId }: { matchId: string }) {
  const [invitationUrl, setInvitationUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();

  async function generateInvitation() {
    setBusy(true);
    setError(undefined);
    setFeedback(undefined);
    const { data, error: rpcError } = await createClient().rpc("refresh_match_invitation", {
      p_match_id: matchId,
    });
    setBusy(false);

    if (rpcError || typeof data !== "string") {
      setError("Le nouveau QR code n’a pas pu être généré.");
      return;
    }

    setInvitationUrl(`${window.location.origin}/join/${data}`);
  }

  async function shareInvitation() {
    if (!invitationUrl) return;
    setFeedback(undefined);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Match de baby-foot", text: "Rejoins mon match de baby-foot", url: invitationUrl });
        setFeedback("Invitation partagée.");
      } else {
        await navigator.clipboard.writeText(invitationUrl);
        setFeedback("Lien copié.");
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setFeedback("Le partage a été annulé. Tu peux faire scanner le QR code.");
    }
  }

  return (
    <section className="mt-6 rounded-3xl bg-[var(--surface)] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Invitation</p>
      {invitationUrl ? (
        <>
          <h2 className="mt-2 text-xl font-black">Fais scanner ce QR code</h2>
          <InviteQrCode value={invitationUrl} />
          <button type="button" onClick={shareInvitation} className="mt-4 min-h-14 w-full rounded-2xl bg-[var(--accent)] px-5 font-black text-[var(--accent-contrast)]">
            Partager l’invitation
          </button>
          {feedback ? <p role="status" className="mt-3 text-center text-sm text-[var(--muted)]">{feedback}</p> : null}
        </>
      ) : (
        <>
          <h2 className="mt-2 text-xl font-black">Besoin d’un nouveau QR code ?</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Le nouveau lien remplacera immédiatement l’ancienne invitation.</p>
          {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
          <button type="button" onClick={generateInvitation} disabled={busy} className="mt-4 min-h-14 w-full rounded-2xl bg-[var(--surface-raised)] px-5 font-bold disabled:opacity-60">
            {busy ? "Génération…" : "Générer un nouveau QR"}
          </button>
        </>
      )}
    </section>
  );
}
