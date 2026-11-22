import type { Band, CpcbResult, PollutantKey, PollutantReading } from "./types";

export const POLLUTANT_META: Record<
  PollutantKey,
  { label: string; name: string; unit: string }
> = {
  pm2_5: { label: "PM2.5", name: "Fine particles", unit: "µg/m³" },
  pm10: { label: "PM10", name: "Coarse particles", unit: "µg/m³" },
  nitrogen_dioxide: { label: "NO₂", name: "Nitrogen dioxide", unit: "µg/m³" },
  sulphur_dioxide: { label: "SO₂", name: "Sulphur dioxide", unit: "µg/m³" },
  carbon_monoxide: { label: "CO", name: "Carbon monoxide", unit: "µg/m³" },
  ozone: { label: "O₃", name: "Ozone", unit: "µg/m³" },
};

export const POLLUTANT_KEYS = Object.keys(POLLUTANT_META) as PollutantKey[];

/**
 * US EPA AQI bands. Categories only — the numeric AQI itself comes from the
 * upstream provider, which already applies the EPA breakpoint table.
 */
export const US_BANDS: Band[] = [
  {
    key: "good",
    label: "Good",
    min: 0,
    max: 50,
    color: "#15803d",
    soft: "#ecfdf5",
    border: "#bbf7d0",
    guidance: "Air quality is satisfactory and poses little risk to health.",
    activity:
      "Normal outdoor activity is fine for everyone. A good day to open windows for ventilation.",
  },
  {
    key: "moderate",
    label: "Moderate",
    min: 51,
    max: 100,
    color: "#b45309",
    soft: "#fffbeb",
    border: "#fde68a",
    guidance:
      "Acceptable for most people. A small number of unusually sensitive people may notice mild effects.",
    activity:
      "Outdoor activity is fine for most. If you have asthma or a heart condition, keep reliever medication with you during long or intense exertion.",
  },
  {
    key: "usg",
    label: "Unhealthy for sensitive groups",
    min: 101,
    max: 150,
    color: "#c2410c",
    soft: "#fff7ed",
    border: "#fed7aa",
    guidance:
      "Sensitive groups — children, older adults, pregnant people, and anyone with asthma, COPD or heart disease — may feel effects.",
    activity:
      "Sensitive groups should shorten or soften prolonged outdoor exertion. Everyone else can continue normal activity. Ventilate early morning when levels are usually lowest.",
  },
  {
    key: "unhealthy",
    label: "Unhealthy",
    min: 151,
    max: 200,
    color: "#b91c1c",
    soft: "#fef2f2",
    border: "#fecaca",
    guidance:
      "Everyone may begin to experience health effects. Sensitive groups are at higher risk.",
    activity:
      "Reduce prolonged or heavy outdoor exertion for everyone. Sensitive groups should move workouts indoors. Keep windows closed and use a purifier if you have one.",
  },
  {
    key: "very-unhealthy",
    label: "Very unhealthy",
    min: 201,
    max: 300,
    color: "#7e22ce",
    soft: "#faf5ff",
    border: "#e9d5ff",
    guidance: "Health alert: the whole population is likely to be affected.",
    activity:
      "Avoid outdoor exertion. Stay indoors with windows closed. Run a purifier in the room you use most. Call a doctor if you get chest pain, wheeze or unusual breathlessness.",
  },
  {
    key: "hazardous",
    label: "Hazardous",
    min: 301,
    max: 500,
    color: "#9f1239",
    soft: "#fff1f2",
    border: "#fecdd3",
    guidance: "Emergency conditions. Everyone is at risk of serious health effects.",
    activity:
      "Stay indoors and seal gaps where you can. No outdoor exercise. Seek medical advice for breathing difficulty. Follow local health authority advisories.",
  },
];

export function usBand(aqi: number): Band {
  const clamped = Math.max(0, Math.min(500, aqi));
  return US_BANDS.find((b) => clamped >= b.min && clamped <= b.max) ?? US_BANDS[5];
}

/** CPCB (India) national AQI bands. */
export const CPCB_BANDS: Band[] = [
  {
    key: "good",
    label: "Good",
    min: 0,
    max: 50,
    color: "#15803d",
    soft: "#ecfdf5",
    border: "#bbf7d0",
    guidance: "Minimal impact on health.",
    activity: "Normal outdoor activity for everyone.",
  },
  {
    key: "satisfactory",
    label: "Satisfactory",
    min: 51,
    max: 100,
    color: "#4d7c0f",
    soft: "#f7fee7",
    border: "#d9f99d",
    guidance: "Minor breathing discomfort for sensitive people.",
    activity:
      "Sensitive people should watch for coughing or eye irritation during long outdoor exertion.",
  },
  {
    key: "moderate",
    label: "Moderate",
    min: 101,
    max: 200,
    color: "#b45309",
    soft: "#fffbeb",
    border: "#fde68a",
    guidance: "Breathing discomfort for people with asthma, and for children and older adults.",
    activity: "Cut back on prolonged outdoor exertion, especially in the afternoon peak.",
  },
  {
    key: "poor",
    label: "Poor",
    min: 201,
    max: 300,
    color: "#b91c1c",
    soft: "#fef2f2",
    border: "#fecaca",
    guidance: "Breathing discomfort on prolonged exposure. Discomfort may be felt even by healthy people.",
    activity: "Avoid outdoor exercise. Keep windows closed and filter indoor air.",
  },
  {
    key: "very-poor",
    label: "Very poor",
    min: 301,
    max: 400,
    color: "#7e22ce",
    soft: "#faf5ff",
    border: "#e9d5ff",
    guidance: "Respiratory illness on prolonged exposure. Effects may be more serious in people with existing disease.",
    activity: "Stay indoors. No outdoor exertion. Use a purifier if available.",
  },
  {
    key: "severe",
    label: "Severe",
    min: 401,
    max: 500,
    color: "#9f1239",
    soft: "#fff1f2",
    border: "#fecdd3",
    guidance: "Affects healthy people and seriously impacts those with existing disease.",
    activity: "Remain indoors. Follow public health advisories. Seek care for breathing difficulty.",
  },
];

export function cpcbBand(aqi: number): Band {
  const clamped = Math.max(0, Math.min(500, aqi));
  return CPCB_BANDS.find((b) => clamped >= b.min && clamped <= b.max) ?? CPCB_BANDS[5];
}

/**
 * CPCB breakpoints: [concentration low, concentration high, index low, index high].
 * Concentrations in µg/m³ except CO, which is in mg/m³ (see `divisor`).
 */
const CPCB_TABLE: Record<
  PollutantKey,
  { divisor: number; bands: [number, number, number, number][] }
> = {
  pm2_5: {
    divisor: 1,
    bands: [
      [0, 30, 0, 50],
      [31, 60, 51, 100],
      [61, 90, 101, 200],
      [91, 120, 201, 300],
      [121, 250, 301, 400],
      [251, 500, 401, 500],
    ],
  },
  pm10: {
    divisor: 1,
    bands: [
      [0, 50, 0, 50],
      [51, 100, 51, 100],
      [101, 250, 101, 200],
      [251, 350, 201, 300],
      [351, 430, 301, 400],
      [431, 600, 401, 500],
    ],
  },
  nitrogen_dioxide: {
    divisor: 1,
    bands: [
      [0, 40, 0, 50],
      [41, 80, 51, 100],
      [81, 180, 101, 200],
      [181, 280, 201, 300],
      [281, 400, 301, 400],
      [401, 600, 401, 500],
    ],
  },
  sulphur_dioxide: {
    divisor: 1,
    bands: [
      [0, 40, 0, 50],
      [41, 80, 51, 100],
      [81, 380, 101, 200],
      [381, 800, 201, 300],
      [801, 1600, 301, 400],
      [1601, 2000, 401, 500],
    ],
  },
  carbon_monoxide: {
    divisor: 1000,
    bands: [
      [0, 1, 0, 50],
      [1.1, 2, 51, 100],
      [2.1, 10, 101, 200],
      [10.1, 17, 201, 300],
      [17.1, 34, 301, 400],
      [34.1, 50, 401, 500],
    ],
  },
  ozone: {
    divisor: 1,
    bands: [
      [0, 50, 0, 50],
      [51, 100, 51, 100],
      [101, 168, 101, 200],
      [169, 208, 201, 300],
      [209, 748, 301, 400],
      [749, 1000, 401, 500],
    ],
  },
};

function subIndex(concentration: number, bands: [number, number, number, number][]) {
  if (concentration <= 0) return 0;
  for (const [cLow, cHigh, iLow, iHigh] of bands) {
    if (concentration <= cHigh) {
      const value = concentration < cLow ? cLow : concentration;
      return iLow + ((iHigh - iLow) / (cHigh - cLow)) * (value - cLow);
    }
  }
  return 500;
}

/**
 * CPCB AQI requires at least three pollutants, one of which must be PM2.5 or PM10.
 * Returns null when the concentration set does not meet that rule, rather than
 * inventing a number.
 */
export function computeCpcbAqi(
  pollutants: Record<PollutantKey, PollutantReading>,
): CpcbResult | null {
  const subIndices: Partial<Record<PollutantKey, number>> = {};
  for (const key of POLLUTANT_KEYS) {
    const value = pollutants[key]?.value;
    if (value == null) continue;
    const { divisor, bands } = CPCB_TABLE[key];
    subIndices[key] = Math.round(subIndex(value / divisor, bands));
  }

  const measured = Object.keys(subIndices) as PollutantKey[];
  const hasParticulate = subIndices.pm2_5 != null || subIndices.pm10 != null;
  if (measured.length < 3 || !hasParticulate) return null;

  let aqi = 0;
  let dominant: PollutantKey | null = null;
  for (const key of measured) {
    const value = subIndices[key] ?? 0;
    if (value > aqi) {
      aqi = value;
      dominant = key;
    }
  }

  return {
    aqi: Math.min(500, Math.round(aqi)),
    band: cpcbBand(aqi),
    subIndices,
    sampleSize: measured.length,
    dominant,
  };
}

export function windCompass(deg: number | null): string | null {
  if (deg == null || Number.isNaN(deg)) return null;
  const points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return points[Math.round(((deg % 360) / 22.5)) % 16];
}

/** Share of a reading against a reference ceiling, used for the bar in each tile. */
export function pollutantScale(key: PollutantKey, value: number | null): number {
  if (value == null) return 0;
  const ceiling =
    key === "pm2_5" ? 150 : key === "pm10" ? 300 : key === "carbon_monoxide" ? 4000 : 200;
  return Math.max(0, Math.min(1, value / ceiling));
}
