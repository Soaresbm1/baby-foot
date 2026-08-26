import Link from "next/link";

type MenuLinkProps = {
  compact?: boolean;
  detail?: string;
  href: string;
  icon: string;
  label: string;
};

export function MenuLink({ compact = false, detail, href, icon, label }: MenuLinkProps) {
  if (compact) {
    return (
      <Link
        href={href}
        className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--surface)] px-2 text-center text-xs font-bold text-[var(--muted)] transition active:scale-[0.97]"
      >
        <span aria-hidden="true" className="text-xl text-[var(--foreground)]">
          {icon}
        </span>
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="flex min-h-20 items-center gap-4 rounded-3xl bg-[var(--surface)] px-5 transition active:scale-[0.98]"
    >
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-full bg-[var(--surface-raised)] text-2xl text-[var(--accent)]"
      >
        {icon}
      </span>
      <span>
        <span className="block font-bold">{label}</span>
        {detail ? <span className="mt-1 block text-sm text-[var(--muted)]">{detail}</span> : null}
      </span>
      <span aria-hidden="true" className="ml-auto text-xl text-[var(--muted)]">
        ›
      </span>
    </Link>
  );
}

