"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { InviteQrCode } from "@/components/invite-qr-code";
import { createClient } from "@/lib/supabase/client";

type Props = {
  confirmed: boolean; matchId: string; myName: string; myScore: number; myTeamId: string;
  opponentName: string; opponentScore: number; status: "in_progress" | "awaiting_confirmation" | "completed" | "cancelled";
  targetScore: number; winnerTeamId: string | null;
};

export function ScoreCounter(props: Props) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [undoSeconds, setUndoSeconds] = useState(0);
  const [rematch, setRematch] = useState<{ match_id: string; join_token: string }>();
  const won = props.winnerTeamId === props.myTeamId || (props.status === "awaiting_confirmation" && props.myScore > props.opponentScore);

  useEffect(() => {
    if (undoSeconds <= 0) return;
    const timer = window.setTimeout(() => setUndoSeconds((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [undoSeconds]);

  async function addGoal() {
    if (sending) return;
    setSending(true); setError(undefined);
    const { error: rpcError } = await createClient().rpc("add_goal", {
      p_match_id: props.matchId, p_request_id: crypto.randomUUID(), p_team_id: props.myTeamId,
    });
    setSending(false);
    if (rpcError) { setError("Le but n’a pas été enregistré. Vérifie la connexion."); return; }
    setUndoSeconds(3); navigator.vibrate?.(40); router.refresh();
  }

  async function undoGoal() {
    setSending(true); setError(undefined);
    const { error: rpcError } = await createClient().rpc("cancel_my_last_goal", {
      p_match_id: props.matchId, p_request_id: crypto.randomUUID(),
    });
    setSending(false); setUndoSeconds(0);
    if (rpcError) { setError("Le délai d’annulation est dépassé."); return; }
    router.refresh();
  }

  async function confirm() {
    setSending(true); setError(undefined);
    const { error: rpcError } = await createClient().rpc("confirm_result", { p_match_id: props.matchId });
    setSending(false);
    if (rpcError) { setError("La confirmation n’a pas été enregistrée."); return; }
    router.refresh();
  }

  async function reject() {
    setSending(true); setError(undefined);
    const { error: rpcError } = await createClient().rpc("reject_result", { p_match_id: props.matchId });
    setSending(false);
    if (rpcError) { setError("Le résultat n’a pas pu être refusé."); return; }
    router.refresh();
  }

  async function createRematch() {
    setSending(true); setError(undefined);
    const { data, error: rpcError } = await createClient().rpc("create_rematch", { p_match_id: props.matchId });
    setSending(false);
    if (rpcError) { setError("La revanche n’a pas pu être créée."); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setRematch(row as { match_id: string; join_token: string });
  }

  if (rematch) {
    const path = `/join/${rematch.join_token}`;
    const url = `${window.location.origin}${path}`;
    return <section className="mt-8 rounded-3xl bg-[var(--surface)] p-5 text-center">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--accent)]">Revanche créée</p>
      <InviteQrCode value={url} />
      <p className="mt-3 text-sm text-[var(--muted)]">Fais scanner ce code à ton adversaire.</p>
      <button type="button" onClick={() => navigator.clipboard.writeText(url)} className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] font-bold">Copier le lien</button>
      <button type="button" onClick={() => router.push(`/match/${rematch.match_id}`)} className="mt-3 min-h-14 w-full rounded-2xl bg-[var(--accent)] font-black text-[#102006]">Ouvrir la revanche</button>
    </section>;
  }

  if (props.status === "completed" || props.status === "cancelled") return (
    <section className="mt-8 rounded-3xl bg-[var(--surface)] p-7 text-center">
      <div aria-hidden="true" className="text-5xl">{props.status === "cancelled" ? "↺" : won ? "🏆" : "👏"}</div>
      <h2 className="mt-4 text-3xl font-black">{props.status === "cancelled" ? "Résultat refusé" : won ? "Victoire !" : "Match terminé"}</h2>
      <p className="mt-3 text-xl text-[var(--muted)]">{props.myScore} – {props.opponentScore}</p>
      {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
      <button type="button" onClick={createRematch} disabled={sending} className="mt-6 min-h-14 w-full rounded-2xl bg-[var(--accent)] font-black text-[#102006] disabled:opacity-60">{sending ? "Création…" : "Faire une revanche"}</button>
    </section>
  );

  if (props.status === "awaiting_confirmation") return (
    <section className="mt-8 rounded-3xl bg-[var(--surface)] p-6 text-center">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--accent)]">Score final proposé</p>
      <p className="mt-4 text-6xl font-black tabular-nums">{props.myScore}<span className="mx-3 text-[var(--muted)]">–</span>{props.opponentScore}</p>
      <p className="mt-4 text-[var(--muted)]">{won ? "Tu as atteint le score cible." : `${props.opponentName} a atteint le score cible.`}</p>
      {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
      <button type="button" onClick={confirm} disabled={sending || props.confirmed} className="mt-6 min-h-16 w-full rounded-2xl bg-[var(--accent)] px-5 text-lg font-black text-[#102006] disabled:opacity-60">
        {props.confirmed ? "Confirmé · attente de l’adversaire" : sending ? "Confirmation…" : "Confirmer le résultat"}
      </button>
      {undoSeconds > 0 ? <button type="button" onClick={undoGoal} disabled={sending} className="mt-3 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] font-bold">Annuler mon but · {undoSeconds}s</button> : null}
      <button type="button" onClick={reject} disabled={sending || props.confirmed} className="mt-3 min-h-12 w-full text-sm font-bold text-red-300 disabled:opacity-50">Le score est incorrect</button>
    </section>
  );

  const scores = Array.from({ length: props.targetScore + 1 }, (_, score) => score);
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between px-1">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Ton compteur</p><h2 className="mt-1 text-xl font-black">{props.myName}</h2></div>
        <p className="text-right text-sm text-[var(--muted)]">{props.opponentName}<br /><strong className="text-xl text-white">{props.opponentScore}</strong></p>
      </div>
      <div className="mt-5 rounded-3xl bg-[var(--surface)] p-4 shadow-[inset_0_2px_10px_rgb(0_0_0_/_25%)]">
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-center gap-1 rounded-full bg-[#050907] p-2" role="img" aria-label={`Ton score : ${props.myScore} sur ${props.targetScore}`}>
            {scores.map((score) => <span key={score} className={`grid size-10 place-items-center rounded-full text-sm font-black transition ${score === props.myScore ? "scale-110 bg-[var(--accent)] text-[#102006] shadow-[0_0_20px_rgb(183_243_74_/_45%)]" : "text-[var(--muted)]"}`}>{score}</span>)}
          </div>
        </div>
        <button type="button" onClick={addGoal} disabled={sending} className="mt-4 min-h-24 w-full rounded-2xl bg-[var(--accent)] px-5 text-xl font-black text-[#102006] transition active:scale-[0.98] disabled:opacity-60">
          <span className="block text-3xl">+1</span><span className="mt-1 block text-sm">{sending ? "Enregistrement…" : "J’ai marqué"}</span>
        </button>
        {undoSeconds > 0 ? <button type="button" onClick={undoGoal} disabled={sending} className="mt-3 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] font-bold">Annuler le dernier but · {undoSeconds}s</button> : null}
      </div>
      {error ? <p role="alert" className="mt-3 text-center text-sm text-red-300">{error}</p> : null}
      <p className="mt-4 text-center text-xs text-[var(--muted)]">Seul ton compteur peut être avancé depuis cet appareil.</p>
    </section>
  );
}
