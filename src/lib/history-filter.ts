export type HistoryMode = "all" | "one_v_one" | "two_v_two";
export type HistoryResult = "all" | "won" | "lost";

export type HistoryFilters = {
  mode: HistoryMode;
  result: HistoryResult;
};

function first(value: string | readonly string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseHistoryFilters(values: { mode?: string | readonly string[]; result?: string | readonly string[] }): HistoryFilters {
  const modeValue = first(values.mode);
  const resultValue = first(values.result);
  return {
    mode: modeValue === "one_v_one" || modeValue === "two_v_two" ? modeValue : "all",
    result: resultValue === "won" || resultValue === "lost" ? resultValue : "all",
  };
}

export function historyFilterHref(filters: HistoryFilters) {
  const query = new URLSearchParams();
  if (filters.mode !== "all") query.set("mode", filters.mode);
  if (filters.result !== "all") query.set("result", filters.result);
  const suffix = query.toString();
  return suffix ? `/history?${suffix}` : "/history";
}
