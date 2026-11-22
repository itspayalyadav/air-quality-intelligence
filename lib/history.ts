import type { History } from "./types";

/** Mean of the values that are actually present, or null when none are. */
export function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** PM2.5 readings without the nulls the provider leaves for missing hours. */
export function pmSeries(history: History): number[] {
  return history.pm25.filter((value): value is number => value != null);
}

export type PmTrend = {
  last24: number | null;
  previous48: number | null;
  direction: "rising" | "falling" | "steady" | null;
};

/**
 * Last 24 hours against the two days before. A 10% deadband keeps ordinary
 * hour-to-hour noise labelled "steady".
 */
export function pmTrend(history: History): PmTrend {
  const hourly = pmSeries(history);
  const last24 = mean(hourly.slice(-24));
  const previous48 = mean(hourly.slice(-72, -24));

  let direction: PmTrend["direction"] = null;
  if (last24 != null && previous48 != null) {
    direction =
      last24 > previous48 * 1.1 ? "rising" : last24 < previous48 * 0.9 ? "falling" : "steady";
  }

  return { last24, previous48, direction };
}
