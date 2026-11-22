import type { Band } from "./types";

/**
 * Severity tiers for the dashboard guidance panel. Both standards share tiers
 * so the copy stays consistent even though their band keys differ.
 */
export type HealthTier = "good" | "mild" | "elevated" | "high" | "veryHigh" | "emergency";

const TIER_BY_KEY: Record<string, HealthTier> = {
  good: "good",
  satisfactory: "mild",
  moderate: "mild",
  usg: "elevated",
  unhealthy: "high",
  poor: "high",
  "very-unhealthy": "veryHigh",
  "very-poor": "veryHigh",
  hazardous: "emergency",
  severe: "emergency",
};

export function healthTierFor(band: Band, value: number | null): HealthTier {
  // "moderate" is 51-100 under US EPA but 101-200 under CPCB; the value splits them.
  if (band.key === "moderate" && (value ?? 0) > 100) return "elevated";
  return TIER_BY_KEY[band.key] ?? "high";
}

type TierCopy = {
  status: string;
  sensitive: string;
  precaution?: string;
  action: string;
};

export const TIER_COPY: Record<HealthTier, TierCopy> = {
  good: {
    status: "Normal activity",
    sensitive:
      "No extra precautions needed. Children, older adults and people with heart or lung conditions can take part as usual.",
    action: "A good day to open windows and air out rooms.",
  },
  mild: {
    status: "Normal activity",
    sensitive:
      "Unusually sensitive people may notice mild effects. Children, older adults and people with heart or lung conditions are not generally affected at this level.",
    action: "If you have asthma, carry a reliever during long or intense outdoor exertion.",
  },
  elevated: {
    status: "Modify activity",
    sensitive:
      "Children, older adults, pregnant people and anyone with asthma, COPD or heart disease should shorten or soften prolonged outdoor exertion.",
    precaution: "Favour early-morning outdoor time; the afternoon peak is usually worse.",
    action: "Cut back on prolonged outdoor exertion, especially in the afternoon peak.",
  },
  high: {
    status: "Limit exertion",
    sensitive:
      "Sensitive groups should move exercise indoors. Children and older adults should keep outdoor time short and low-effort.",
    precaution: "Keep outdoor time short and low-effort, even for healthy adults.",
    action: "Keep windows closed and run a purifier in the room you use most.",
  },
  veryHigh: {
    status: "Stay indoors",
    sensitive:
      "Everyone should limit outdoor exertion. Children, older adults and people with heart or lung conditions are at the highest risk.",
    precaution: "Seal gaps where you can and keep windows closed.",
    action: "Stay indoors and keep outdoor trips short.",
  },
  emergency: {
    status: "Stay indoors",
    sensitive:
      "The whole population is at risk. Children, older adults and anyone with heart or lung conditions should stay indoors.",
    precaution: "Seek medical advice for chest pain, wheeze or unusual breathlessness.",
    action: "Stay indoors, seal gaps where you can, and follow local health authority advisories.",
  },
};

/** The band's activity string leads with the activity verdict, then concrete actions. */
export function splitActivity(activity: string): { outdoor: string; actions: string[] } {
  const sentences = activity
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const [outdoor = "", ...actions] = sentences;
  return { outdoor, actions };
}
