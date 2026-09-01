export type LeaderboardMode = "all" | "one_v_one" | "two_v_two";

export function parseLeaderboardMode(value: string | readonly string[] | undefined): LeaderboardMode {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "one_v_one" || candidate === "two_v_two" ? candidate : "all";
}

export function leaderboardModeParameter(mode: LeaderboardMode) {
  return mode === "all" ? null : mode;
}
