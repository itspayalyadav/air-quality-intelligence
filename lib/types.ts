export type PollutantKey =
  | "pm2_5"
  | "pm10"
  | "nitrogen_dioxide"
  | "sulphur_dioxide"
  | "carbon_monoxide"
  | "ozone";

export type Place = {
  name: string;
  admin?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
};

/** The place fields the AI request may carry; coordinates travel separately. */
export type AiPlace = Pick<Place, "name" | "admin" | "country" | "countryCode">;

export type AqiStandard = "us" | "cpcb";

export type History = { time: string[]; pm25: (number | null)[] };

export type PollutantReading = {
  value: number | null;
  unit: string;
  usSubIndex: number | null;
};

export type Band = {
  key: string;
  label: string;
  min: number;
  max: number;
  color: string;
  soft: string;
  border: string;
  guidance: string;
  activity: string;
};

export type CpcbResult = {
  aqi: number;
  band: Band;
  subIndices: Partial<Record<PollutantKey, number>>;
  sampleSize: number;
  dominant: PollutantKey | null;
};

export type Weather = {
  temperatureC: number | null;
  humidityPct: number | null;
  windKph: number | null;
  windDeg: number | null;
  windCompass: string | null;
};

export type AirData = {
  place: Place;
  observedAt: string;
  timezone: string;
  usAqi: number | null;
  usBand: Band | null;
  cpcb: CpcbResult | null;
  pollutants: Record<PollutantKey, PollutantReading>;
  weather: Weather | null;
  history: History;
  stale: boolean;
  fetchedAt: string;
};

export type Recommendation = {
  slot: string;
  action: string;
  why: string;
  benefit: string;
  difficulty: "easy" | "moderate" | "hard";
  limitations: string;
};

export type RecommendationSet = {
  summary: string;
  items: Recommendation[];
};

/** Responses from `/api/ai`, keyed by the mode that produced them. */
export type AiTextResponse = {
  mode: "chat";
  text: string;
  model: string;
  configured: boolean;
};

export type AiRecommendationsResponse<M extends "plan" | "indoor"> = {
  mode: M;
  data: RecommendationSet;
  model: string;
  configured: boolean;
  /** Set when rules answered because both Gemini models were unavailable. */
  fallback?: "deterministic";
};

/** Plain-language explanation of a verdict the deterministic engine already made. */
export type DecisionExplanation = {
  headline: string;
  why: string;
  whatToDo: string;
  uncertainty: string;
};

export type AiExplainResponse = {
  mode: "explain";
  decisionId: string;
  data: DecisionExplanation;
  model: string;
  configured: boolean;
};
