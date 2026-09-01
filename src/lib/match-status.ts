export const ACTIVE_MATCH_STATUSES = [
  "waiting_for_players",
  "waiting_for_ready",
  "in_progress",
  "awaiting_confirmation",
] as const;

export type ActiveMatchStatus = (typeof ACTIVE_MATCH_STATUSES)[number];

export function activeMatchAction(status: ActiveMatchStatus) {
  switch (status) {
    case "waiting_for_players":
      return "Partager l’invitation";
    case "waiting_for_ready":
      return "Reprendre la préparation";
    case "in_progress":
      return "Reprendre le match";
    case "awaiting_confirmation":
      return "Confirmer le résultat";
  }
}
