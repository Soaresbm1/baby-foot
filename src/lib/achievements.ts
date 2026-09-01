export type AchievementStatistics = {
  matchesPlayed: number;
  wins: number;
  totalGoals: number;
  bestWinStreak: number;
};

const ACHIEVEMENTS = [
  { id: "first-match", icon: "⚽", name: "Premier engagement", description: "Terminer un premier match", metric: "matchesPlayed", target: 1 },
  { id: "five-wins", icon: "🏅", name: "Compétiteur", description: "Remporter 5 matchs", metric: "wins", target: 5 },
  { id: "goal-scorer", icon: "🎯", name: "Buteur", description: "Marquer 25 buts", metric: "totalGoals", target: 25 },
  { id: "winning-streak", icon: "🔥", name: "Inarrêtable", description: "Enchaîner 3 victoires", metric: "bestWinStreak", target: 3 },
  { id: "veteran", icon: "🏆", name: "Habitué de la table", description: "Terminer 20 matchs", metric: "matchesPlayed", target: 20 },
] as const;

export function getAchievements(statistics: AchievementStatistics) {
  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    current: statistics[achievement.metric],
    unlocked: statistics[achievement.metric] >= achievement.target,
  }));
}
