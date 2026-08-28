"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function JoinCodeForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("invitation") ?? "").trim();
    let token = value;
    try {
      const url = new URL(value);
      token = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    } catch {
      token = value.split("/").filter(Boolean).at(-1) ?? "";
    }
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      setError("Ce code d’invitation n’est pas valide.");
      return;
    }
    router.push(`/join/${token.toLowerCase()}`);
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
