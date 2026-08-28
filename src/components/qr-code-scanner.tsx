"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import QrScanner from "qr-scanner";

function invitationToken(value: string) {
  let candidate = value.trim();
  try { candidate = new URL(candidate).pathname.split("/").filter(Boolean).at(-1) ?? ""; }
  catch { candidate = candidate.split("/").filter(Boolean).at(-1) ?? ""; }
  return /^[a-f0-9]{64}$/i.test(candidate) ? candidate.toLowerCase() : null;
}

export function QrCodeScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => () => scannerRef.current?.destroy(), []);

  function accept(value: string) {
    const token = invitationToken(value);
    if (!token) { setError("Ce QR code ne contient pas une invitation Baby-foot valide."); return false; }
    scannerRef.current?.destroy(); router.push(`/join/${token}`); return true;
  }
  async function start() {
    if (!videoRef.current) return;
    setStarting(true); setError(undefined);
    try {
      const scanner = new QrScanner(videoRef.current, (result) => { accept(result.data); }, {
        preferredCamera: "environment", highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true,
      });
      scannerRef.current = scanner; await scanner.start(); setActive(true);
    } catch {
      scannerRef.current?.destroy();
      setError("La caméra n’est pas accessible. Autorise-la dans les réglages du navigateur ou choisis une image.");
    } finally { setStarting(false); }
  }
  function stop() { scannerRef.current?.destroy(); scannerRef.current = null; setActive(false); }
  async function scanImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setError(undefined);
    try { const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true }); accept(result.data); }
    catch { setError("Aucun QR code lisible n’a été trouvé dans cette image."); }
    event.target.value = "";
  }
  return <section className="mt-8 overflow-hidden rounded-3xl bg-[var(--surface)] p-5">
    <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#030706]">
      <video ref={videoRef} muted playsInline className={`size-full object-cover ${active ? "block" : "hidden"}`} />
      {!active ? <div className="absolute inset-0 grid place-items-center text-center"><div><span aria-hidden="true" className="text-5xl">⌗</span><p className="mt-3 text-sm text-[var(--muted)]">Place le QR code face à la caméra</p></div></div> : null}
      {active ? <div aria-hidden="true" className="pointer-events-none absolute inset-[15%] rounded-3xl border-2 border-[var(--accent)] shadow-[0_0_0_999px_rgb(0_0_0_/_25%)]" /> : null}
    </div>
    {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
    {!active ? <button type="button" onClick={start} disabled={starting} className="mt-5 min-h-14 w-full rounded-2xl bg-[var(--accent)] px-5 font-black text-[var(--accent-contrast)] disabled:opacity-60">{starting ? "Ouverture…" : "Ouvrir la caméra"}</button>
      : <button type="button" onClick={stop} className="mt-5 min-h-12 w-full rounded-2xl bg-[var(--surface-raised)] px-5 font-bold">Fermer la caméra</button>}
    <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-[var(--surface-raised)] px-5 text-sm font-bold">Choisir une photo du QR code<input type="file" accept="image/*" onChange={scanImage} className="sr-only" /></label>
  </section>;
}
