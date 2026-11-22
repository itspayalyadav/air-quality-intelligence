import { describe, expect, it } from "vitest";
import { computeImpact, formatKg, weeklyDistance } from "@/lib/impact";

describe("weeklyDistance", () => {
  it("doubles the one-way distance", () => {
    expect(weeklyDistance({ oneWayKm: 5, tripsPerWeek: 10, mode: "car" })).toBe(100);
  });

  it("clamps nonsense input instead of returning NaN", () => {
    expect(weeklyDistance({ oneWayKm: Number.NaN, tripsPerWeek: 4, mode: "car" })).toBe(0);
    expect(weeklyDistance({ oneWayKm: -10, tripsPerWeek: 4, mode: "car" })).toBe(0);
    expect(weeklyDistance({ oneWayKm: 9999, tripsPerWeek: 4, mode: "car" })).toBe(500 * 2 * 4);
  });
});

describe("computeImpact", () => {
  const rows = computeImpact({ oneWayKm: 8, tripsPerWeek: 10, mode: "car" });

  it("returns every travel mode", () => {
    expect(rows).toHaveLength(8);
  });

  it("puts walking last in savings terms and the car at zero saving", () => {
    const car = rows.find((row) => row.mode.id === "car");
    const walk = rows.find((row) => row.mode.id === "cycle");
    expect(car?.savedVersusCarGrams).toBe(0);
    expect(walk?.weeklyGrams).toBe(0);
    expect(walk?.savedVersusCarGrams).toBeGreaterThan(0);
  });

  it("scales linearly with distance", () => {
    const short = computeImpact({ oneWayKm: 4, tripsPerWeek: 10, mode: "car" });
    const long = computeImpact({ oneWayKm: 8, tripsPerWeek: 10, mode: "car" });
    const shortCar = short.find((row) => row.mode.id === "car")!.weeklyGrams;
    const longCar = long.find((row) => row.mode.id === "car")!.weeklyGrams;
    expect(longCar).toBe(shortCar * 2);
  });

  it("reports the car as 100% of the car baseline", () => {
    const car = rows.find((row) => row.mode.id === "car");
    expect(car?.percentOfCar).toBe(100);
  });
});

describe("formatKg", () => {
  it("uses grams below a tenth of a kilogram", () => {
    expect(formatKg(50)).toBe("50 g");
  });

  it("uses kilograms above that", () => {
    expect(formatKg(12_000)).toBe("12 kg");
    expect(formatKg(1_500)).toBe("1.5 kg");
  });
});
