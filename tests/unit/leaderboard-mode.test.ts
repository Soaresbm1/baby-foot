import { describe, expect, it } from "vitest";

import { leaderboardModeParameter, parseLeaderboardMode } from "@/lib/leaderboard-mode";

describe("parseLeaderboardMode", () => {
  it.each([
    [undefined, "all"],
    ["unknown", "all"],
    ["one_v_one", "one_v_one"],
    [["two_v_two", "one_v_one"], "two_v_two"],
  ] as const)("transforme %s en %s", (value, expected) => {
    expect(parseLeaderboardMode(value)).toBe(expected);
  });

  it("convertit le filtre général en paramètre SQL nul", () => {
    expect(leaderboardModeParameter("all")).toBeNull();
    expect(leaderboardModeParameter("one_v_one")).toBe("one_v_one");
  });
});
