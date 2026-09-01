import { describe, expect, it } from "vitest";

import { formatMatchDuration } from "@/lib/match-duration";

describe("formatMatchDuration", () => {
  it.each([
    [0, "00:00"],
    [65, "01:05"],
    [3599, "59:59"],
    [3661, "1:01:01"],
    [-5, "00:00"],
  ])("formate %s secondes en %s", (seconds, expected) => {
    expect(formatMatchDuration(seconds)).toBe(expected);
  });
});
