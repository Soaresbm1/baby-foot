import { describe, expect, it } from "vitest";

import { getAchievements } from "@/lib/achievements";

describe("getAchievements", () => {
  it("verrouille les trophées d’un nouveau joueur", () => {
    expect(getAchievements({ matchesPlayed: 0, wins: 0, totalGoals: 0, bestWinStreak: 0 }).every((item) => !item.unlocked)).toBe(true);
  });

  it("débloque exactement les objectifs atteints", () => {
    const achievements = getAchievements({ matchesPlayed: 5, wins: 5, totalGoals: 24, bestWinStreak: 3 });
    expect(achievements.filter((item) => item.unlocked).map((item) => item.id)).toEqual([
      "first-match",
      "five-wins",
      "winning-streak",
    ]);
  });
});
