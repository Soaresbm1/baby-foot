import { describe, expect, it } from "vitest";

import { ACTIVE_MATCH_STATUSES, activeMatchAction } from "@/lib/match-status";

describe("activeMatchAction", () => {
  it.each([
    ["waiting_for_players", "Partager l’invitation"],
    ["waiting_for_ready", "Reprendre la préparation"],
    ["in_progress", "Reprendre le match"],
    ["awaiting_confirmation", "Confirmer le résultat"],
  ] as const)("associe %s à l’action %s", (status, expected) => {
    expect(activeMatchAction(status)).toBe(expected);
  });

  it("couvre tous les états non terminaux", () => {
    expect(ACTIVE_MATCH_STATUSES).toHaveLength(4);
  });
});
