import type { AirData, Band } from "../lib/types";
import { usBand } from "../lib/aqi";

export const FIXED_NOW = "2026-11-17T18:30";

const CPCB_BAND = {
  key: "poor",
  label: "Poor",
  min: 201,
  max: 300,
  color: "#b91c1c",
  soft: "#fef2f2",
  border: "#fecaca",
  guidance: "Breathing discomfort on prolonged exposure.",
  activity: "Avoid outdoor exercise.",
} satisfies Band;

export function airFixture(overrides: Partial<AirData> = {}): AirData {
  const history = Array.from({ length: 168 }, (_, index) => ({
    time: new Date(Date.UTC(2026, 10, 10) + index * 3_600_000).toISOString(),
    value: 40 + Math.round(40 * Math.abs(Math.sin(index / 9))),
  }));

  return {
    place: {
      name: "New Delhi",
      admin: "National Capital Territory of Delhi",
      country: "India",
      countryCode: "IN",
      latitude: 28.6139,
      longitude: 77.209,
    },
    observedAt: FIXED_NOW,
    timezone: "Asia/Kolkata",
    usAqi: 172,
    usBand: usBand(172),
    cpcb: {
      aqi: 284,
      band: CPCB_BAND,
      subIndices: { pm2_5: 284, pm10: 78, nitrogen_dioxide: 104 },
      sampleSize: 6,
      dominant: "pm2_5",
    },
    pollutants: {
      pm2_5: { value: 104.4, unit: "µg/m³", usSubIndex: 172 },
      pm10: { value: 96.2, unit: "µg/m³", usSubIndex: 78 },
      nitrogen_dioxide: { value: 83.7, unit: "µg/m³", usSubIndex: 41 },
      sulphur_dioxide: { value: 37.8, unit: "µg/m³", usSubIndex: 21 },
      carbon_monoxide: { value: 2372, unit: "µg/m³", usSubIndex: 10 },
      ozone: { value: 34, unit: "µg/m³", usSubIndex: 58 },
    },
    weather: {
      temperatureC: 20.6,
      humidityPct: 61,
      windKph: 5.1,
      windDeg: 247,
      windCompass: "WSW",
    },
    history: {
      time: history.map((point) => point.time),
      pm25: history.map((point) => point.value),
    },
    stale: false,
    fetchedAt: new Date().toISOString(),
    ...overrides,
  };
}
