import { describe, expect, it } from "vitest";

import { historyFilterHref, parseHistoryFilters } from "@/lib/history-filter";

describe("history filters", () => {
  it("ignore les valeurs inconnues", () => {
    expect(parseHistoryFilters({ mode: "solo", result: "draw" })).toEqual({ mode: "all", result: "all" });
  });

  it("conserve les filtres valides", () => {
    expect(parseHistoryFilters({ mode: "two_v_two", result: "won" })).toEqual({ mode: "two_v_two", result: "won" });
  });

  it("construit une URL compacte", () => {
    expect(historyFilterHref({ mode: "all", result: "all" })).toBe("/history");
    expect(historyFilterHref({ mode: "one_v_one", result: "lost" })).toBe("/history?mode=one_v_one&result=lost");
  });
});
