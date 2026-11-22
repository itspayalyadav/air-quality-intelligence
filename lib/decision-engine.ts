import { POLLUTANT_META } from "./aqi";
import { healthTierFor, type HealthTier } from "./health-guidance";
import { pmTrend } from "./history";
import { TRAVEL_MODES } from "./impact";
import type { AirData } from "./types";

/**
 * The deterministic core of Aeris. Every verdict, threshold and tie-break lives
 * here. The AI receives this output as grounded input — it never invents a
 * reading or changes a verdict. A numeric score is derived only from published
 * AQI bands, the current modelled reading and the user's declared context.
 */

export type DecisionId = "outdoor" | "exercise" | "ventilate" | "commute";
export type Stance = "go" | "caution" | "avoid" | "unknown";

export type DecisionProfile = {
  /** Someone with a heart or lung condition, pregnant, a child or older adult. */
  sensitive: boolean;
  /** How hard the planned outdoor activity is. */
  intensity: "light" | "normal" | "intense";
  /** Usual way of getting around, used only for the commute comparison. */
  commute: "active" | "transit" | "car";
};

export const DEFAULT_PROFILE: DecisionProfile = {
  sensitive: false,
  intensity: "normal",
  commute: "transit",
};

export type Evidence = { label: string; value: string };

export type Decision = {
  id: DecisionId;
  title: string;
  stance: Stance;
  headline: string;
  rule: string;
  reason: string;
  action: string;
  evidence: Evidence[];
  uncertainty: string;
};

export type DecisionReport = {
  generatedAt: string;
  location: string;
  standard: "CPCB" | "US EPA" | null;
  aqi: number | null;
  band: string | null;
  dominant: string | null;
  decisions: Decision[];
  topAction: string;
  caveats: string[];
};

const SEVERITY: Record<HealthTier, number> = {
  good: 0,
  mild: 1,
  elevated: 2,
  high: 3,
  veryHigh: 4,
  emergency: 5,
};

const INTENSITY_BONUS: Record<DecisionProfile["intensity"], number> = {
  light: 0,
  normal: 0,
  intense: 1,
};

const STANCE_ORDER: Stance[] = ["avoid", "caution", "go", "unknown"];

function numeric(value: number | null | undefined, digits = 0): string {
  return value == null || !Number.isFinite(value) ? "unavailable" : value.toFixed(digits);
}

export function buildDecisions(
  air: AirData,
  profile: DecisionProfile = DEFAULT_PROFILE,
  now: Date = new Date(),
): DecisionReport {
  const useCpcb = air.cpcb != null;
  const aqi = useCpcb ? air.cpcb?.aqi ?? null : air.usAqi;
  const band = useCpcb ? air.cpcb?.band ?? null : air.usBand;
  const standard = useCpcb ? "CPCB" : air.usAqi != null ? "US EPA" : null;
  const dominant = useCpcb && air.cpcb?.dominant ? POLLUTANT_META[air.cpcb.dominant].label : null;
  const tier = band && aqi != null ? healthTierFor(band, aqi) : null;
  const base = tier ? SEVERITY[tier] : null;

  const trend = pmTrend(air.history);
  const temperature = air.weather?.temperatureC ?? null;
  const wind = air.weather?.windKph ?? null;
  const location = [air.place.name, air.place.admin, air.place.country].filter(Boolean).join(", ");
  const staleNote = air.stale
    ? "The reading is older than three hours, so these decisions may no longer match the air outside."
    : "The reading is current to within three hours.";

  const commonEvidence: Evidence[] = [
    { label: "Air quality index", value: aqi == null ? "unavailable" : `${aqi} (${standard})` },
    { label: "Band", value: band?.label ?? "unavailable" },
    { label: "Dominant pollutant", value: dominant ?? "not identified" },
    { label: "Reading age", value: staleNote },
  ];

  const unknown = (id: DecisionId, title: string): Decision => ({
    id,
    title,
    stance: "unknown",
    headline: "Not enough data to decide",
    rule: "No usable AQI was available, so no threshold was applied.",
    reason: "Without a current index the rules cannot compare the air against a safety band.",
    action: "Check a local air-quality advisory before making plans.",
    evidence: commonEvidence,
    uncertainty: "Both the US and CPCB indices are unavailable for this location.",
  });

  const decisions: Decision[] = [];

  // 1. Outdoor time — context raises severity, never lowers it.
  if (base == null) {
    decisions.push(unknown("outdoor", "Go outside"));
  } else {
    const sensitiveBonus = profile.sensitive ? 1 : 0;
    const intensityBonus = INTENSITY_BONUS[profile.intensity];
    const score = base + sensitiveBonus + intensityBonus;
    const stance: Stance = score <= 1 ? "go" : score === 2 ? "caution" : "avoid";
    const headline =
      stance === "go"
        ? "Outdoor time is fine"
        : stance === "caution"
          ? "Keep outdoor time short and easy"
          : "Move plans indoors";
    decisions.push({
      id: "outdoor",
      title: "Go outside",
      stance,
      headline,
      rule: `${standard} tier '${band?.label}' = ${base}; sensitive +${sensitiveBonus}; ${profile.intensity} activity +${intensityBonus}; score ${score}`,
      reason: `${standard} AQI ${aqi} sits in the '${band?.label}' band${dominant ? `, driven by ${dominant}` : ""}.`,
      action:
        stance === "go"
          ? "Normal outdoor plans can go ahead."
          : stance === "caution"
            ? "Keep trips brief and low-effort; favour early morning."
            : "Move plans indoors or keep outdoor trips to the essentials.",
      evidence: [
        ...commonEvidence,
        { label: "Sensitivity", value: profile.sensitive ? "Declared sensitive group" : "Not declared" },
        { label: "Planned exertion", value: profile.intensity },
        { label: "PM2.5 trend", value: trend.direction ?? "unavailable" },
      ],
      uncertainty: `${staleNote} Indoor air is not measured.`,
    });
  }

  // 2. Exercise — stricter than general outdoor time, and heat adds a caution.
  if (base == null) {
    decisions.push(unknown("exercise", "Exercise outside"));
  } else {
    const sensitiveBonus = profile.sensitive ? 1 : 0;
    const intensityBonus = INTENSITY_BONUS[profile.intensity];
    const heatBonus = temperature != null && temperature >= 35 ? 1 : 0;
    const score = base + sensitiveBonus + intensityBonus + heatBonus;
    const stance: Stance = score <= 1 ? "go" : score === 2 ? "caution" : "avoid";
    decisions.push({
      id: "exercise",
      title: "Exercise outside",
      stance,
      headline:
        stance === "go"
          ? "An outdoor workout is fine"
          : stance === "caution"
            ? "Train indoors if you can"
            : "Exercise indoors today",
      rule: `${standard} tier severity ${base}; sensitive +${sensitiveBonus}; exertion +${intensityBonus}; heat ≥35°C +${heatBonus}; score ${score}`,
      reason: `Exercise raises inhaled dose, so the same air gets a stricter verdict${dominant ? `; ${dominant} is the driver` : ""}.`,
      action:
        stance === "go"
          ? "Run or cycle outdoors at your usual time."
          : stance === "caution"
            ? "Choose an easy session or move it indoors."
            : "Take the workout indoors and keep the windows closed.",
      evidence: [
        ...commonEvidence,
        { label: "Temperature", value: `${numeric(temperature, 1)} °C` },
        { label: "Sensitivity", value: profile.sensitive ? "Declared sensitive group" : "Not declared" },
      ],
      uncertainty:
        temperature == null
          ? "Temperature is unavailable, so heat stress was not factored in. Indoor air is not measured."
          : "Indoor air is not measured. This is not medical advice.",
    });
  }

  // 3. Ventilation — the index sets the floor and the trend moves it one step.
  if (base == null) {
    decisions.push(unknown("ventilate", "Ventilate home"));
  } else {
    const trendBonus = trend.direction === "rising" ? 1 : trend.direction === "falling" ? -1 : 0;
    const score = Math.max(0, base + trendBonus);
    const stance: Stance = score <= 0 ? "go" : score === 1 ? "caution" : "avoid";
    decisions.push({
      id: "ventilate",
      title: "Ventilate home",
      stance,
      headline:
        stance === "go"
          ? "Open the windows"
          : stance === "caution"
            ? "A short early-morning flush only"
            : "Keep the windows closed",
      rule: `${standard} tier severity ${base}; PM2.5 trend ${trend.direction ?? "unavailable"} ${trendBonus >= 0 ? "+" : ""}${trendBonus}; score ${score}`,
      reason:
        trend.last24 != null && trend.previous48 != null
          ? `PM2.5 averaged ${numeric(trend.last24, 1)} µg/m³ over 24 h against ${numeric(trend.previous48, 1)} µg/m³ in the previous 48 h (${trend.direction ?? "steady"}).`
          : `Current AQI is ${aqi ?? "unavailable"}; not enough history to judge the trend.`,
      action:
        stance === "go"
          ? "Ventilate for 10–15 minutes now; cross-ventilate if you can."
          : stance === "caution"
            ? "Open briefly in the early morning and close again before traffic peaks."
            : "Seal gaps, keep windows shut and run a purifier if you have one.",
      evidence: [
        ...commonEvidence,
        { label: "PM2.5 last 24 h", value: `${numeric(trend.last24, 1)} µg/m³` },
        { label: "Previous 48 h", value: `${numeric(trend.previous48, 1)} µg/m³` },
        { label: "Wind", value: wind == null ? "unavailable" : `${numeric(wind, 0)} km/h` },
      ],
      uncertainty: `${
        trend.direction == null
          ? "The trend is unavailable, so this uses the current level only. "
          : ""
      }Indoor concentrations are never measured by this app.`,
    });
  }

  // 4. Commute — emissions are deterministic; street-level exposure is not.
  const cleanest = TRAVEL_MODES.reduce((best, mode) =>
    mode.gramsPerPassengerKm < best.gramsPerPassengerKm ? mode : best,
  );
  if (base == null) {
    decisions.push(unknown("commute", "Commute choice"));
  } else {
    const sensitivityBonus = profile.sensitive ? 1 : 0;
    const score = base + sensitivityBonus;
    const stance: Stance = score <= 1 ? "go" : score === 2 ? "caution" : "avoid";
    decisions.push({
      id: "commute",
      title: "Commute choice",
      stance,
      headline:
        stance === "go"
          ? "Walk or cycle is a good option"
          : stance === "caution"
            ? "Prefer transit over driving"
            : "Choose enclosed transit",
      rule: `${standard} tier severity ${base}; sensitive +${sensitivityBonus}; score ${score}`,
      reason: `With AQI ${aqi} in the '${band?.label}' band, exertion in traffic changes personal exposure${dominant ? `; ${dominant} is the main pollutant` : ""}.`,
      action:
        stance === "go"
          ? `Walk or cycle; the lowest-emission option is ${cleanest.label} (${cleanest.gramsPerPassengerKm} g CO₂/passenger-km).`
          : stance === "caution"
            ? "Take the metro or bus; if you cycle, keep it short and away from main roads."
            : "Use enclosed transit, or a car with windows up and recirculation; avoid cycling in traffic.",
      evidence: [
        ...commonEvidence,
        { label: "Lowest-emission mode", value: `${cleanest.label} — ${cleanest.gramsPerPassengerKm} g CO₂/passenger-km` },
        { label: "Usual commute", value: profile.commute },
      ],
      uncertainty:
        "No route-level pollution measurements exist here. Emission factors are published planning figures, not a lifecycle assessment; exposure on a specific street is unknown.",
    });
  }

  const ranked = [...decisions].sort(
    (a, b) => STANCE_ORDER.indexOf(a.stance) - STANCE_ORDER.indexOf(b.stance),
  );
  const top = ranked.find((decision) => decision.stance !== "unknown");

  return {
    generatedAt: now.toISOString(),
    location,
    standard,
    aqi,
    band: band?.label ?? null,
    dominant,
    decisions,
    topAction: top?.action ?? "Check a local air-quality advisory before making plans.",
    caveats: [
      "Readings are modelled CAMS data on an ~11 km grid, not a street-level monitor.",
      "CPCB values are computed by this app and are not official station readings.",
      "Indoor air is never measured; indoor advice is derived from outdoor conditions only.",
      "Nothing here is medical advice.",
    ],
  };
}
