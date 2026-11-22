import { describe, expect, it } from "vitest";
import { computeCpcbAqi, cpcbBand, usBand, windCompass } from "@/lib/aqi";
import type { PollutantKey, PollutantReading } from "@/lib/types";

const EMPTY: Record<PollutantKey, PollutantReading> = {
  pm2_5: { value: null, unit: "µg/m³", usSubIndex: null },
  pm10: { value: null, unit: "µg/m³", usSubIndex: null },
  nitrogen_dioxide: { value: null, unit: "µg/m³", usSubIndex: null },
  sulphur_dioxide: { value: null, unit: "µg/m³", usSubIndex: null },
  carbon_monoxide: { value: null, unit: "µg/m³", usSubIndex: null },
  ozone: { value: null, unit: "µg/m³", usSubIndex: null },
};

function readings(values: Partial<Record<PollutantKey, number>>) {
  const copy = structuredClone(EMPTY);
  for (const [key, value] of Object.entries(values) as [PollutantKey, number][]) {
    copy[key] = { value, unit: "µg/m³", usSubIndex: null };
  }
  return copy;
}

describe("US AQI bands", () => {
  it("maps boundary values to the documented categories", () => {
    expect(usBand(0).key).toBe("good");
    expect(usBand(50).key).toBe("good");
    expect(usBand(51).key).toBe("moderate");
    expect(usBand(150).key).toBe("usg");
    expect(usBand(151).key).toBe("unhealthy");
    expect(usBand(300).key).toBe("very-unhealthy");
    expect(usBand(301).key).toBe("hazardous");
  });

  it("clamps out-of-range input instead of returning undefined", () => {
    expect(usBand(-20).key).toBe("good");
    expect(usBand(9999).key).toBe("hazardous");
  });
});

describe("CPCB AQI", () => {
  it("returns null when fewer than three pollutants are available", () => {
    expect(computeCpcbAqi(readings({ pm2_5: 80, pm10: 90 }))).toBeNull();
  });

  it("returns null when no particulate matter is present, even with four gases", () => {
    const result = computeCpcbAqi(
      readings({
        nitrogen_dioxide: 90,
        sulphur_dioxide: 90,
        carbon_monoxide: 3000,
        ozone: 90,
      }),
    );
    expect(result).toBeNull();
  });

  it("interpolates within a CPCB band", () => {
    // PM2.5 60 µg/m³ sits at the top of the 51-100 index band.
    const result = computeCpcbAqi(readings({ pm2_5: 60, pm10: 50, nitrogen_dioxide: 20 }));
    expect(result?.aqi).toBe(100);
    expect(result?.band.label).toBe("Satisfactory");
  });

  it("takes the worst sub-index as the overall AQI", () => {
    // PM2.5 120 is 300 (Poor); PM10 100 is 100; NO2 40 is 50.
    const result = computeCpcbAqi(
      readings({ pm2_5: 120, pm10: 100, nitrogen_dioxide: 40 }),
    );
    expect(result?.aqi).toBe(300);
    expect(result?.dominant).toBe("pm2_5");
    expect(result?.band.label).toBe("Poor");
  });

  it("converts carbon monoxide from µg/m³ to mg/m³ before scoring", () => {
    const result = computeCpcbAqi(
      readings({ pm2_5: 10, pm10: 20, carbon_monoxide: 2458 }),
    );
    expect(result?.subIndices.carbon_monoxide).toBe(105);
  });

  it("never reports an index above 500", () => {
    const result = computeCpcbAqi(readings({ pm2_5: 9000, pm10: 9000, ozone: 9000 }));
    expect(result?.aqi).toBe(500);
    expect(result?.band.label).toBe("Severe");
  });

  it("labels CPCB bands at their boundaries", () => {
    expect(cpcbBand(0).label).toBe("Good");
    expect(cpcbBand(50).label).toBe("Good");
    expect(cpcbBand(51).label).toBe("Satisfactory");
    expect(cpcbBand(101).label).toBe("Moderate");
    expect(cpcbBand(201).label).toBe("Poor");
    expect(cpcbBand(301).label).toBe("Very poor");
    expect(cpcbBand(401).label).toBe("Severe");
  });
});

describe("windCompass", () => {
  it("converts degrees to a compass point", () => {
    expect(windCompass(0)).toBe("N");
    expect(windCompass(90)).toBe("E");
    expect(windCompass(247)).toBe("WSW");
    expect(windCompass(359)).toBe("N");
  });

  it("returns null when the reading is missing", () => {
    expect(windCompass(null)).toBeNull();
  });
});
