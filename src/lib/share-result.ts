type MatchSummary = {
  teamA: string;
  teamAScore: number;
  teamB: string;
  teamBScore: number;
};

export function buildMatchShareText(summary: MatchSummary) {
  return `Baby-foot · ${summary.teamA} ${summary.teamAScore}–${summary.teamBScore} ${summary.teamB}`;
}
