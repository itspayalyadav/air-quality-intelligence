import { describe, expect, it } from "vitest";
import { deterministicPlan } from "@/lib/plan-fallback";
import { cpcbBand } from "@/lib/aqi";
import { airFixture } from "../e2e/fixture";

function air(aqi: number) {
  return airFixture({
    usAqi: aqi,
    cpcb: {
      aqi,
      band: cpcbBand(aqi),
      subIndices: { pm2_5: aqi },
      sampleSize: 6,
      dominant: "pm2_5",
    },
  });
}

describe("deterministic Daily Plan fallback", () => {
  it("produces five rule-based actions without calling Gemini", () => {
    const plan = deterministicPlan(air(284), { concerns: "General health" });
    expect(plan.items).toHaveLength(5);
    expect(plan.items.map((item) => item.slot)).toEqual([
      "Morning",
      "Travel",
      "Outdoor activity",
      "Indoor time",
      "Evening",
    ]);
    expect(plan.summary).toContain("deterministic decision engine");
    for (const item of plan.items) {
      expect(item.action.length).toBeGreaterThan(10);
      expect(item.why.length).toBeGreaterThan(10);
      expect(item.limitations.length).toBeGreaterThan(10);
    }
  });

  it("uses the measured dominant pollutant in its reasoning", () => {
    const plan = deterministicPlan(air(284), {});
    expect(plan.items.some((item) => /PM2\.5/.test(item.why))).toBe(true);
  });

  it("escalates the outdoor action for a sensitive profile", () => {
    const normal = deterministicPlan(air(150), { concerns: "General health" }).items[3].action;
    const sensitive = deterministicPlan(air(150), { concerns: "Asthma or allergies" }).items[3].action;
    expect(normal).not.toBe(sensitive);
  });
});
