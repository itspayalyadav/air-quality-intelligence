import { describe, expect, it } from "vitest";
import { cpcbBand, usBand } from "@/lib/aqi";
import { healthTierFor, splitActivity, TIER_COPY } from "@/lib/health-guidance";

const US_CASES: [number, string][] = [
  [25, "good"],
  [75, "mild"],
  [120, "elevated"],
  [172, "high"],
  [250, "veryHigh"],
  [400, "emergency"],
];

const CPCB_CASES: [number, string][] = [
  [25, "good"],
  [75, "mild"],
  [150, "elevated"],
  [284, "high"],
  [350, "veryHigh"],
  [450, "emergency"],
];

describe("health tiers", () => {
  it("maps every US band to a tier", () => {
    for (const [value, tier] of US_CASES) {
      expect(healthTierFor(usBand(value), value)).toBe(tier);
    }
  });

  it("maps every CPCB band to a tier", () => {
    for (const [value, tier] of CPCB_CASES) {
      expect(healthTierFor(cpcbBand(value), value)).toBe(tier);
    }
  });

  it("splits the shared moderate key by value, since US 51-100 is milder than CPCB 101-200", () => {
    expect(healthTierFor(usBand(75), 75)).toBe("mild");
    expect(healthTierFor(cpcbBand(150), 150)).toBe("elevated");
    expect(healthTierFor(cpcbBand(150), null)).toBe("mild");
  });

  it("falls back to a cautious tier for an unknown key", () => {
    expect(healthTierFor({ ...usBand(25), key: "future" }, 10)).toBe("high");
  });

  it("gives every tier a status, sensitive-groups line and action", () => {
    for (const [tier, copy] of Object.entries(TIER_COPY)) {
      expect(copy.status, tier).toBeTruthy();
      expect(copy.sensitive, tier).toBeTruthy();
      expect(copy.action, tier).toBeTruthy();
    }
  });

  it("adds an extra precaution only from the elevated tier upward", () => {
    expect(TIER_COPY.good.precaution).toBeUndefined();
    expect(TIER_COPY.mild.precaution).toBeUndefined();
    for (const tier of ["elevated", "high", "veryHigh", "emergency"] as const) {
      expect(TIER_COPY[tier].precaution, tier).toBeTruthy();
    }
  });
});

describe("splitActivity", () => {
  it("treats the first sentence as the activity verdict and the rest as actions", () => {
    expect(splitActivity("Reduce exertion. Move workouts indoors. Keep windows closed.")).toEqual({
      outdoor: "Reduce exertion.",
      actions: ["Move workouts indoors.", "Keep windows closed."],
    });
  });

  it("returns no actions for the short CPCB strings", () => {
    expect(splitActivity("Avoid outdoor exercise.")).toEqual({
      outdoor: "Avoid outdoor exercise.",
      actions: [],
    });
  });

  it("copes with empty and space-free input", () => {
    expect(splitActivity("")).toEqual({ outdoor: "", actions: [] });
    expect(splitActivity("Stay indoors")).toEqual({ outdoor: "Stay indoors", actions: [] });
  });
});
