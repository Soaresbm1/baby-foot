"use client";

import { useEffect, useState } from "react";

import { MenuLink } from "@/components/menu-link";
import { createClient } from "@/lib/supabase/client";

export function ChallengeInboxLink({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    async function refreshCount() {
      const { data, error } = await supabase.rpc("get_my_pending_challenge_count");
      if (active && !error) setCount(Number(data ?? 0));
    }

    async function subscribe() {
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;

      channel = supabase
        .channel(`challenge-inbox-${data.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "matches",
            filter: `invited_user_id=eq.${data.user.id}`,
          },
          () => void refreshCount(),
        )
        .subscribe();

      await refreshCount();
    }

    void subscribe();
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <MenuLink
      href="/challenges"
      label="Défis reçus"
      detail={count > 0 ? `${count} invitation${count > 1 ? "s" : ""} en attente` : "Voir les invitations privées"}
      icon="⚔"
      badge={count > 0 ? (count > 99 ? "99+" : String(count)) : undefined}
    />
  );
}
