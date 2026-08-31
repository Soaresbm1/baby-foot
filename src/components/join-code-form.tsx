"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { parseInvitationToken } from "@/lib/invitation";

export function JoinCodeForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = parseInvitationToken(String(new FormData(event.currentTarget).get("invitation") ?? ""));
    if (!token) {
      setError("Ce code d’invitation n’est pas valide.");
      return;
    }
    router.push(`/join/${token}`);
  }

  return (
    <form onSubmit={submit} className="mt-8 rounded-3xl bg-[var(--surface)] p-5">
      <label className="block text-sm font-bold">
        Lien ou code
        <input name="invitation" required autoCapitalize="none" autoCorrect="off" className="mt-2 min-h-14 w-full rounded-2xl bg-[var(--surface-raised)] px-4 font-mono text-sm outline-none" placeholder="https://…/join/…" />
      </label>
      {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
      <button className="mt-5 min-h-14 w-full rounded-2xl bg-[var(--accent)] px-5 font-black text-[var(--accent-contrast)]">Continuer</button>
    </form>
  );
}
