import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import { InstallAppButton } from "@/components/install-app-button";
import { SignOutButton } from "@/components/sign-out-button";
import { getAchievements } from "@/lib/achievements";
import { createClient } from "@/lib/supabase/server";

type PlayerStatistics = {
  player_id: string;
  matches_played: number;
  wins: number;
  losses: number;
  goal_difference: number;
  win_rate: number;
  rank: number;
};

type AdvancedStatistics = {
  total_goals: number;
  average_goals: number;
  current_win_streak: number;
  best_win_streak: number;
  favorite_opponent_name: string | null;
  favorite_opponent_matches: number;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/profile");

  const [{ data: profile }, { data: leaderboard }, { data: advancedData }] = await Promise.all([
    supabase.from("profiles").select("display_name,email,avatar_url,created_at").eq("id", auth.user.id).single(),
    supabase.rpc("get_leaderboard", { p_mode: null }),
    supabase.rpc("get_my_advanced_statistics"),
  ]);

  if (!profile) redirect("/login");
  const statistics = ((leaderboard ?? []) as PlayerStatistics[]).find((entry) => entry.player_id === auth.user.id);
  const advanced = ((advancedData ?? []) as AdvancedStatistics[])[0];
  const achievements = getAchievements({
    matchesPlayed: statistics?.matches_played ?? 0,
    wins: statistics?.wins ?? 0,
    totalGoals: advanced?.total_goals ?? 0,
    bestWinStreak: advanced?.best_win_streak ?? 0,
  });
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length;
  const memberSince = new Intl.DateTimeFormat("fr-CH", { month: "long", year: "numeric" }).format(new Date(profile.created_at));

  return (
    <div>
      <Link href="/" className="text-sm font-bold text-[var(--muted)]">← Accueil</Link>

      <header className="mt-10 flex items-center gap-5">
        <div
          aria-label={`Avatar de ${profile.display_name}`}
          className="grid size-20 shrink-0 place-items-center rounded-full bg-[var(--accent)] bg-cover bg-center text-2xl font-black text-[var(--accent-contrast)]"
          style={profile.avatar_url ? { backgroundImage: `url(${JSON.stringify(profile.avatar_url)})` } : undefined}
        >
          {profile.avatar_url ? <span className="sr-only">{initials(profile.display_name)}</span> : initials(profile.display_name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Mon profil</p>
          <h1 className="mt-1 truncate text-3xl font-black tracking-tight">{profile.display_name}</h1>
          <p className="mt-1 truncate text-sm text-[var(--muted)]">{profile.email}</p>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-3 gap-3" aria-label="Statistiques personnelles">
        <div className="rounded-2xl bg-[var(--surface)] p-4 text-center">
          <strong className="block text-2xl font-black">{statistics?.rank ? `#${statistics.rank}` : "—"}</strong>
          <span className="mt-1 block text-xs text-[var(--muted)]">Classement</span>
        </div>
        <div className="rounded-2xl bg-[var(--surface)] p-4 text-center">
          <strong className="block text-2xl font-black text-[var(--accent)]">{statistics?.wins ?? 0}</strong>
          <span className="mt-1 block text-xs text-[var(--muted)]">Victoires</span>
        </div>
        <div className="rounded-2xl bg-[var(--surface)] p-4 text-center">
          <strong className="block text-2xl font-black">{statistics?.win_rate ?? 0}%</strong>
          <span className="mt-1 block text-xs text-[var(--muted)]">Réussite</span>
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <span className="text-sm text-[var(--muted)]">Matchs joués</span>
          <strong>{statistics?.matches_played ?? 0}</strong>
        </div>
        <div className="flex items-center justify-between border-b border-white/5 py-4">
          <span className="text-sm text-[var(--muted)]">Différence de buts</span>
          <strong className={(statistics?.goal_difference ?? 0) >= 0 ? "text-[var(--accent)]" : "text-red-300"}>{(statistics?.goal_difference ?? 0) > 0 ? "+" : ""}{statistics?.goal_difference ?? 0}</strong>
        </div>
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-[var(--muted)]">Membre depuis</span>
          <strong className="capitalize">{memberSince}</strong>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="advanced-statistics">
        <div className="flex items-end justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Performances</p><h2 id="advanced-statistics" className="mt-1 text-xl font-black">En quelques chiffres</h2></div>
          <Link href="/history" className="text-sm font-bold text-[var(--muted)]">Voir les matchs →</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-[var(--surface)] p-5"><span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Buts marqués</span><strong className="mt-3 block text-3xl font-black">{advanced?.total_goals ?? 0}</strong></div>
          <div className="rounded-3xl bg-[var(--surface)] p-5"><span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Moyenne</span><strong className="mt-3 block text-3xl font-black">{advanced?.average_goals ?? 0}</strong><span className="text-xs text-[var(--muted)]">par match</span></div>
          <div className="rounded-3xl bg-[var(--surface)] p-5"><span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Série actuelle</span><strong className="mt-3 block text-3xl font-black text-[var(--accent)]">{advanced?.current_win_streak ?? 0}</strong><span className="text-xs text-[var(--muted)]">victoire{advanced?.current_win_streak === 1 ? "" : "s"}</span></div>
          <div className="rounded-3xl bg-[var(--surface)] p-5"><span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Meilleure série</span><strong className="mt-3 block text-3xl font-black">{advanced?.best_win_streak ?? 0}</strong><span className="text-xs text-[var(--muted)]">victoire{advanced?.best_win_streak === 1 ? "" : "s"}</span></div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-3xl bg-[var(--surface)] p-5">
          <div><span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Adversaire le plus rencontré</span><strong className="mt-2 block text-lg font-black">{advanced?.favorite_opponent_name ?? "Pas encore d’adversaire"}</strong></div>
          {advanced?.favorite_opponent_name ? <span className="rounded-full bg-[var(--surface-raised)] px-3 py-2 text-sm font-black">{advanced.favorite_opponent_matches} match{advanced.favorite_opponent_matches === 1 ? "" : "s"}</span> : null}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="achievements-title">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Progression</p><h2 id="achievements-title" className="mt-1 text-xl font-black">Trophées</h2></div>
          <span className="rounded-full bg-[var(--surface)] px-3 py-2 text-xs font-black">{unlockedAchievements}/{achievements.length}</span>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {achievements.map((achievement) => (
            <li key={achievement.id} className={`rounded-3xl border p-4 ${achievement.unlocked ? "border-[var(--accent)]/30 bg-[var(--surface)]" : "border-white/5 bg-[var(--surface)]/55 opacity-65"}`}>
              <span aria-hidden="true" className={`grid size-11 place-items-center rounded-2xl text-xl ${achievement.unlocked ? "bg-[var(--accent)]" : "bg-[var(--surface-raised)] grayscale"}`}>{achievement.unlocked ? achievement.icon : "🔒"}</span>
              <strong className="mt-3 block text-sm">{achievement.name}</strong>
              <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{achievement.description}</span>
              {!achievement.unlocked ? <span className="mt-2 block text-xs font-bold text-[var(--muted)]">{Math.min(achievement.current, achievement.target)}/{achievement.target}</span> : <span className="mt-2 block text-xs font-black text-[var(--accent)]">Débloqué</span>}
            </li>
          ))}
        </ul>
      </section>

      <ProfileForm initialAvatarUrl={profile.avatar_url ?? ""} initialDisplayName={profile.display_name} />
      <ChangePasswordForm email={profile.email} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/history" className="flex min-h-14 items-center justify-center rounded-2xl bg-[var(--surface)] px-4 font-bold">Historique</Link>
        <Link href="/leaderboard" className="flex min-h-14 items-center justify-center rounded-2xl bg-[var(--surface)] px-4 font-bold">Classement</Link>
      </div>
      <InstallAppButton />
      <SignOutButton />
    </div>
  );
}
