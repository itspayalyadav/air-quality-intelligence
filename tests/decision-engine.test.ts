import { describe, expect, it } from "vitest";
import { cpcbBand, usBand } from "@/lib/aqi";
import { airFixture } from "../e2e/fixture";
import { buildDecisions, DEFAULT_PROFILE, type DecisionProfile } from "@/lib/decision-engine";
import type { AirData, History } from "@/lib/types";

const NOW = new Date("2026-11-17T12:00:00.000Z");

function steadyHistory(value = 40): History {
  return {
    time: Array.from({ length: 72 }, (_, index) => String(index)),
    pm25: Array.from({ length: 72 }, () => value),
  };
}

function withAqi(aqi: number, overrides: Partial<AirData> = {}): AirData {
  return airFixture({
    usAqi: aqi,
    usBand: usBand(aqi),
    cpcb: {
      aqi,
      band: cpcbBand(aqi),
      subIndices: { pm2_5: aqi },
      sampleSize: 6,
      dominant: "pm2_5",
    },
    history: steadyHistory(),
    ...overrides,
  });
}

function stance(air: AirData, id: string, profile: DecisionProfile = DEFAULT_PROFILE) {
  return buildDecisions(air, profile, NOW).decisions.find((item) => item.id === id)?.stance;
}

describe("decision engine — grounding", () => {
  it("prefers CPCB and reports the standard, band and dominant pollutant", () => {
    const report = buildDecisions(withAqi(284), DEFAULT_PROFILE, NOW);
    expect(report.standard).toBe("CPCB");
    expect(report.aqi).toBe(284);
    expect(report.band).toBe("Poor");
    expect(report.dominant).toBe("PM2.5");
    expect(report.generatedAt).toBe(NOW.toISOString());
  });

  it("falls back to US EPA when CPCB cannot be computed", () => {
    const report = buildDecisions(withAqi(172, { cpcb: null }), DEFAULT_PROFILE, NOW);
    expect(report.standard).toBe("US EPA");
    expect(report.aqi).toBe(172);
  });

  it("never invents a verdict or top action when both indices are missing", () => {
    const air = withAqi(0, { usAqi: null, usBand: null, cpcb: null });
    const report = buildDecisions(air, DEFAULT_PROFILE, NOW);
    expect(report.aqi).toBeNull();
    expect(report.decisions).toHaveLength(4);
    expect(report.decisions.every((item) => item.stance === "unknown")).toBe(true);
    expect(report.topAction).toContain("advisory");
  });
});

describe("decision engine — deterministic rules", () => {
  it("gives a favourable verdict in good air", () => {
    const air = withAqi(30, { weather: { ...airFixture().weather!, temperatureC: 22 } });
    const report = buildDecisions(air, DEFAULT_PROFILE, NOW);
    expect(report.decisions.every((item) => item.stance === "go")).toBe(true);
  });

  it("moves every decision to avoid in poor air", () => {
    const report = buildDecisions(withAqi(284), DEFAULT_PROFILE, NOW);
    expect(report.decisions.every((item) => item.stance === "avoid")).toBe(true);
    expect(report.topAction).toMatch(/indoors|closed|essentials|sealed|recirculation|transit/i);
  });

  it("raises the outdoor verdict by one step for a sensitive user", () => {
    const air = withAqi(150);
    expect(stance(air, "outdoor")).toBe("caution");
    expect(stance(air, "outdoor", { ...DEFAULT_PROFILE, sensitive: true })).toBe("avoid");
  });

  it("raises the outdoor verdict by one step for intense activity", () => {
    const air = withAqi(150);
    expect(stance(air, "outdoor", { ...DEFAULT_PROFILE, intensity: "intense" })).toBe("avoid");
  });

  it("adds a heat caution to exercise but not to general outdoor time", () => {
    const hot = {
      temperatureC: 36,
      humidityPct: 50,
      windKph: 5,
      windDeg: 0,
      windCompass: "N",
    };
    const air = withAqi(75, { weather: hot });
    expect(stance(air, "outdoor")).toBe("go");
    expect(stance(air, "exercise")).toBe("caution");
  });

  it("lets a falling PM2.5 trend allow ventilation and a rising trend close windows", () => {
    const base = withAqi(30);
    const rising: History = {
      time: steadyHistory().time,
      pm25: Array.from({ length: 72 }, (_, index) => (index < 48 ? 15 : 70)),
    };
    const falling: History = {
      time: steadyHistory().time,
      pm25: Array.from({ length: 72 }, (_, index) => (index < 48 ? 70 : 15)),
    };
    expect(stance(base, "ventilate")).toBe("go");
    expect(stance(withAqi(30, { history: rising }), "ventilate")).toBe("caution");
    expect(stance(withAqi(30, { history: falling }), "ventilate")).toBe("go");
  });

  it("states the emission assumption in the commute evidence", () => {
    const decision = buildDecisions(withAqi(30), DEFAULT_PROFILE, NOW).decisions.find(
      (item) => item.id === "commute",
    );
    expect(decision?.evidence.some((item) => /g CO₂\/passenger-km/.test(item.value))).toBe(true);
    expect(decision?.uncertainty).toContain("No route-level pollution measurements");
  });

  it("marks a stale reading in every decision's evidence", () => {
    const report = buildDecisions(withAqi(30, { stale: true }), DEFAULT_PROFILE, NOW);
    expect(
      report.decisions.every((item) =>
        item.evidence.some((entry) => entry.label === "Reading age" && /older than three hours/.test(entry.value)),
      ),
    ).toBe(true);
  });

  it("exposes the fired rule for every decision so a verdict can be audited", () => {
    const report = buildDecisions(withAqi(284), DEFAULT_PROFILE, NOW);
    for (const decision of report.decisions) {
      expect(decision.rule.length).toBeGreaterThan(10);
      expect(decision.reason.length).toBeGreaterThan(10);
      expect(decision.action.length).toBeGreaterThan(10);
    }
  });
});
