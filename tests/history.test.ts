import { describe, expect, it } from "vitest";
import { mean, pmSeries, pmTrend } from "@/lib/history";

describe("mean", () => {
  it("returns null for an empty series", () => {
    expect(mean([])).toBeNull();
  });

  it("averages the values it is given", () => {
    expect(mean([10, 20, 30])).toBe(20);
  });
});

describe("pmSeries", () => {
  it("drops the null hours the provider leaves behind", () => {
    expect(pmSeries({ time: ["a", "b", "c"], pm25: [12, null, 30] })).toEqual([12, 30]);
  });
});

describe("pmTrend", () => {
  const hours = (count: number, value: number) => Array<number | null>(count).fill(value);

  it("reports a rise when the last day is 10% above the two before", () => {
    const pm25 = [...hours(48, 50), ...hours(24, 80)];
    const trend = pmTrend({ time: [], pm25 });

    expect(trend.last24).toBe(80);
    expect(trend.previous48).toBe(50);
    expect(trend.direction).toBe("rising");
  });

  it("reports a fall when the last day is 10% below the two before", () => {
    const pm25 = [...hours(48, 100), ...hours(24, 60)];
    expect(pmTrend({ time: [], pm25 }).direction).toBe("falling");
  });

  it("keeps ordinary noise steady", () => {
    const pm25 = [...hours(48, 60), ...hours(24, 63)];
    expect(pmTrend({ time: [], pm25 }).direction).toBe("steady");
  });

  it("returns no direction without both windows", () => {
    const trend = pmTrend({ time: [], pm25: hours(24, 80) });

    expect(trend.last24).toBe(80);
    expect(trend.previous48).toBeNull();
    expect(trend.direction).toBeNull();
  });
});
