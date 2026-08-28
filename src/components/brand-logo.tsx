import Image from "next/image";

export function BrandLogo({ compact = false, priority = false }: { compact?: boolean; priority?: boolean }) {
  if (compact) {
    return <span className="inline-grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-white/10">
      <Image src="/icon-192.png" width={48} height={48} alt="Institut Suisse de Police" priority={priority} />
    </span>;
  }
  return <span className="relative flex w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_18px_45px_rgb(0_0_0_/_32%)] ring-1 ring-white/10">
    <span aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-1 bg-[var(--accent)]" />
    <Image src="/logo-isp.jpg" width={735} height={300} alt="Institut Suisse de Police" priority={priority} className="h-auto w-full" />
  </span>;
}
