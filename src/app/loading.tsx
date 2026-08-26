export default function Loading() {
  return (
    <div className="grid min-h-[70dvh] place-items-center" role="status">
      <span className="size-8 animate-spin rounded-full border-4 border-[var(--surface-raised)] border-t-[var(--accent)]" />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

