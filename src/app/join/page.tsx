import Link from "next/link";

import { JoinCodeForm } from "@/components/join-code-form";
import { QrCodeScanner } from "@/components/qr-code-scanner";

export default function JoinIndexPage() {
  return <div>
    <Link href="/" className="text-sm font-bold text-[var(--muted)]">← Accueil</Link>
    <p className="mt-10 text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Rejoindre</p>
    <h1 className="mt-2 text-4xl font-black">Scanne l’invitation</h1>
    <p className="mt-3 text-[var(--muted)]">Vise le QR code affiché par le créateur du match.</p>
    <QrCodeScanner />
    <div className="my-8 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[var(--muted)]"><span className="h-px flex-1 bg-[var(--surface-raised)]" />ou<span className="h-px flex-1 bg-[var(--surface-raised)]" /></div>
    <JoinCodeForm />
  </div>;
}
