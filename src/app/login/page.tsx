import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";

  if (data.user) redirect(next);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col justify-center">
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Baby-foot</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Entre dans la partie</h1>
      <p className="mt-3 text-[var(--muted)]">Connecte-toi ou crée ton compte en quelques secondes.</p>
      <AuthForm nextPath={next} />
    </div>
  );
}
