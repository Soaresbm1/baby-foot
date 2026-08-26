import { redirect } from "next/navigation";

import { JoinMatchButton } from "@/components/join-match-button";
import { createClient } from "@/lib/supabase/server";

type JoinPageProps = { params: Promise<{ token: string }> };

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent(`/join/${token}`)}`);

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col justify-center">
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Invitation</p>
      <h1 className="mt-3 text-4xl font-black">Une place t’attend</h1>
      <p className="mt-3 text-[var(--muted)]">Rejoins le match, puis indique quand tu es prêt à jouer.</p>
      <JoinMatchButton token={token} />
    </div>
  );
}
