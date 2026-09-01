import { describe, expect, it } from "vitest";

import { buildMatchShareText } from "@/lib/share-result";

describe("buildMatchShareText", () => {
  it("produit un résumé compact du résultat", () => {
    expect(buildMatchShareText({
      teamA: "Alice & Bob",
      teamAScore: 10,
      teamB: "Chloé & David",
      teamBScore: 7,
    })).toBe("Baby-foot · Alice & Bob 10–7 Chloé & David");
  });
});
