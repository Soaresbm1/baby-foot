import Link from "next/link";

type MenuLinkProps = {
  badge?: string;
  compact?: boolean;
  detail?: string;
  href: string;
  icon: string;
  label: string;
};

export function MenuLink({ badge, compact = false, detail, href, icon, label }: MenuLinkProps) {
  if (compact) {
    return (
      <Link
        href={href}
        className="group flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl px-2 text-center text-[11px] font-bold text-[var(--muted)] transition active:scale-[0.97]"
      >
        <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-[var(--surface-raised)] text-lg text-[var(--foreground)] group-hover:text-[var(--accent)]">
          {icon}
        </span>
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group flex min-h-20 items-center gap-4 rounded-3xl border border-white/5 bg-[var(--surface)] px-5 shadow-[0_12px_30px_rgb(0_0_0_/_14%)] transition active:scale-[0.98]"
    >
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-2xl bg-[var(--surface-raised)] text-2xl text-[var(--accent)] transition group-hover:scale-105"
      >
        {icon}
      </span>
      <span>
        <span className="block font-bold">{label}</span>
        {detail ? <span className="mt-1 block text-sm text-[var(--muted)]">{detail}</span> : null}
      </span>
      {badge ? <span aria-label={`${badge} invitation${badge === "1" ? "" : "s"} en attente`} className="ml-auto grid min-h-8 min-w-8 place-items-center rounded-full bg-[var(--accent)] px-2 text-xs font-black text-[var(--accent-contrast)]">{badge}</span> : null}
      <span aria-hidden="true" className={`${badge ? "" : "ml-auto"} grid size-9 place-items-center rounded-full bg-[var(--surface-raised)] text-xl text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-white`}>
        ›
      </span>
    </Link>
  );
}

