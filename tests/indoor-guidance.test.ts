import { describe, expect, it } from "vitest";
import { deterministicIndoorPlan, INDOOR_BASICS } from "@/lib/indoor-guidance";
import { airFixture } from "../e2e/fixture";

function air(pm25: number | null) {
  return airFixture({
    pollutants: {
      ...airFixture().pollutants,
      pm2_5: { value: pm25, unit: "µg/m³", usSubIndex: null },
    },
  });
}

describe("deterministic indoor guidance", () => {
  it("produces five grounded recommendations from the standing rules", () => {
    const plan = deterministicIndoorPlan(air(80));
    expect(plan.items).toHaveLength(5);
    expect(plan.items.map((item) => item.slot)).toEqual(INDOOR_BASICS.map((item) => item.title));
    for (const item of plan.items) {
      expect(item.why).toContain("80 µg/m³");
      expect(item.limitations.length).toBeGreaterThan(10);
    }
  });

  it("makes a ventilate call only below the stated 30 µg/m³ guide", () => {
    expect(deterministicIndoorPlan(air(20)).summary).toContain("ventilation window");
    expect(deterministicIndoorPlan(air(90)).summary).toContain("keep windows closed");
  });

  it("admits a missing outdoor reading instead of inventing one", () => {
    const plan = deterministicIndoorPlan(air(null));
    expect(plan.summary).toContain("unavailable");
    expect(plan.summary).toContain("cannot make a ventilate-or-seal call");
  });
});
