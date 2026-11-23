import { z } from "zod";
import { POLLUTANT_KEYS, POLLUTANT_META } from "./aqi";
import { mean, pmSeries } from "./history";
import type { AirData, DecisionExplanation, RecommendationSet } from "./types";
import type { DecisionId, DecisionReport } from "./decision-engine";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
// Both IDs are stable on the Gemini Developer API v1beta (checked against the
// published model list) and accept generateContent with structured output.
const DEFAULT_MODEL = "gemini-3.8-flash";
const FALLBACK_MODELS = ["gemini-3.5-flash-lite"];
const BACKOFF_BASE_MS = 500;
const MAX_BACKOFF_MS = 2_000;

export type AiErrorCode =
  | "missing_key"
  | "busy"
  | "timeout"
  | "bad_output"
  | "invalid_request"
  | "model_unavailable"
  | "upstream";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
    /** Server-hinted wait before retrying a 429/503, capped by the caller. */
    public retryAfterMs?: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export function aiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function activeModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

const recommendationSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slot: { type: "string" },
          action: { type: "string" },
          why: { type: "string" },
          benefit: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "moderate", "hard"] },
          limitations: { type: "string" },
        },
        required: ["slot", "action", "why", "benefit", "difficulty", "limitations"],
      },
    },
  },
  required: ["summary", "items"],
};

const recommendationValidator = z.object({
  summary: z.string().min(1),
  items: z
    .array(
      z.object({
        slot: z.string().min(1),
        action: z.string().min(1),
        why: z.string().min(1),
        benefit: z.string().min(1),
        difficulty: z.enum(["easy", "moderate", "hard"]),
        limitations: z.string().min(1),
      }),
    )
    .min(1),
});

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  promptFeedback?: { blockReason?: string };
};

/** Honour Retry-After when present, but never let a hint exceed the call budget. */
function retryHint(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.min(MAX_BACKOFF_MS, Math.max(0, seconds * 1000));
  }
  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    return Math.min(MAX_BACKOFF_MS, Math.max(0, date - Date.now()));
  }
  return undefined;
}

async function callGemini(
  model: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("missing_key", "GEMINI_API_KEY is not configured on the server.");

  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new AiError(
      timedOut ? "timeout" : "upstream",
      timedOut ? "The AI model took too long to respond." : "Could not reach the AI model.",
    );
  }

  if (response.status === 429 || response.status === 503) {
    throw new AiError("busy", "The AI model is busy right now.", retryHint(response));
  }
  if (response.status === 404) {
    // A retired model name. Worth trying the next model in the chain, not the same one.
    throw new AiError("model_unavailable", `Model ${model} is not available for this API key.`);
  }
  if (response.status >= 400 && response.status < 500) {
    // Retrying a malformed request just burns quota.
    throw new AiError("invalid_request", `The AI model rejected the request (${response.status}).`);
  }
  if (!response.ok) {
    throw new AiError("upstream", `The AI model returned ${response.status}.`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new AiError(
      "bad_output",
      data.promptFeedback?.blockReason
        ? "The AI model declined to answer this request."
        : "The AI model returned an empty answer.",
    );
  }
  return text;
}

function retryable(error: unknown) {
  return (
    error instanceof AiError &&
    // A timeout means we already burned the whole per-call budget; retrying doubles it.
    ["busy", "upstream", "model_unavailable"].includes(error.code)
  );
}

async function withFallback<T>(run: (model: string) => Promise<T>): Promise<T> {
  // At most three calls: primary, one bounded retry, then the fallback model.
  // 429/503 waits use exponential backoff (500ms then 1000ms), or a capped
  // Retry-After hint from the server. Timeout and 400 are never retried.
  const primary = activeModel();
  const sequence = [primary, primary, ...FALLBACK_MODELS.filter((m) => m !== primary)].slice(0, 3);
  let lastError: unknown = new AiError("busy", "The AI model is busy right now.");

  for (const [index, model] of sequence.entries()) {
    try {
      return await run(model);
    } catch (error) {
      lastError = error;
      if (!retryable(error) || index === sequence.length - 1) break;
      console.warn(`[ai] ${model} failed (${(error as AiError).code ?? "error"}), retrying`);
      const backoff = Math.min(MAX_BACKOFF_MS, BACKOFF_BASE_MS * 2 ** index);
      const wait =
        error instanceof AiError && error.code === "busy" && error.retryAfterMs != null
          ? error.retryAfterMs
          : backoff;
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw lastError;
}

export async function generateText(system: string, prompt: string): Promise<string> {
  return withFallback((model) =>
    callGemini(
      model,
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 900 },
      },
      20_000,
    ),
  );
}

export async function generateRecommendations(
  system: string,
  prompt: string,
): Promise<RecommendationSet> {
  const text = await withFallback((model) =>
    callGemini(
      model,
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 1400,
          responseMimeType: "application/json",
          responseSchema: recommendationSchema,
        },
      },
      30_000,
    ),
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AiError("bad_output", "The AI model returned malformed JSON.");
  }

  const validated = recommendationValidator.safeParse(parsed);
  if (!validated.success) {
    throw new AiError("bad_output", "The AI model returned an unexpected shape.");
  }
  return validated.data;
}

const SHARED_RULES = `You are Aeris, an air-quality assistant for households in India and other polluted cities.

Ground rules:
- Use ONLY the measurements in the CONTEXT block. Never invent readings, forecasts, station names, health statistics or regulations.
- Never claim that a personal action will lower citywide AQI. Personal actions lower personal exposure and personal emissions only.
- Cite the pollutant that drives the current reading when you explain risk.
- Explain in plain language a non-specialist can act on. No medical diagnoses.
- If the context is missing something you need, say what is missing instead of guessing.
- Keep every recommendation feasible for a normal household budget.`;

export function buildContext(air: AirData): string {
  const lines: string[] = [];
  const place = [air.place.name, air.place.admin, air.place.country].filter(Boolean).join(", ");
  lines.push(`Location: ${place}`);
  lines.push(`Observation time: ${air.observedAt} (${air.timezone})`);
  lines.push(
    `US AQI: ${air.usAqi ?? "unavailable"}${
      air.usBand ? ` (${air.usBand.label})` : ""
    } — from CAMS modelled data, not an official CPCB station reading.`,
  );
  if (air.cpcb) {
    lines.push(
      `CPCB AQI computed from these concentrations: ${air.cpcb.aqi} (${air.cpcb.band.label}), driven by ${
        air.cpcb.dominant ? POLLUTANT_META[air.cpcb.dominant].label : "particulates"
      }; ${air.cpcb.sampleSize} pollutants available.`,
    );
  } else {
    lines.push("CPCB AQI: not enough pollutants were available to compute it.");
  }

  lines.push("Concentrations:");
  for (const key of POLLUTANT_KEYS) {
    const reading = air.pollutants[key];
    if (reading?.value == null) continue;
    lines.push(`- ${POLLUTANT_META[key].label}: ${reading.value} ${reading.unit}`);
  }

  if (air.weather) {
    const w = air.weather;
    lines.push(
      `Weather: ${w.temperatureC ?? "?"}°C, humidity ${w.humidityPct ?? "?"}%, wind ${
        w.windKph ?? "?"
      } km/h ${w.windCompass ?? ""}`.trim(),
    );
  } else {
    lines.push("Weather: unavailable.");
  }

  const recent = pmSeries(air.history).slice(-24);
  const recentAvg = mean(recent);
  if (recent.length >= 6 && recentAvg != null) {
    lines.push(
      `PM2.5 average over the last ${recent.length} hours: ${recentAvg.toFixed(1)} µg/m³.`,
    );
  }

  if (air.stale) lines.push("Note: the reading is older than three hours and may be stale.");
  return lines.join("\n");
}

const DISCLAIMER =
  "Measurements are modelled, not from a regulatory monitor, and can differ from a station near you.";

export async function chatReply(air: AirData, message: string, history: Array<{ role: "user" | "assistant"; content: string }>) {
  const context = buildContext(air);
  const transcript = history
    .slice(-6)
    .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
    .join("\n");

  const prompt = `CONTEXT
${context}

${transcript ? `CONVERSATION SO FAR\n${transcript}\n\n` : ""}USER QUESTION
${message}

Answer in under 180 words. Use short paragraphs or a tight list. End with one line starting "Limits:" that names the main assumption. ${DISCLAIMER}`;

  return generateText(SHARED_RULES, prompt);
}

export type PlanProfile = {
  routine: string;
  outdoorActivity: string;
  transport: string;
  household: string;
  concerns: string;
};

export async function dailyPlan(air: AirData, profile: PlanProfile) {
  const context = buildContext(air);
  const prompt = `CONTEXT
${context}

HOUSEHOLD PROFILE
- Typical day: ${profile.routine}
- Outdoor activity: ${profile.outdoorActivity}
- Getting around: ${profile.transport}
- Home environment: ${profile.household}
- Main concern: ${profile.concerns}

TASK
Build a one-day action plan for today in this location. Produce exactly 5 items in chronological order covering: morning, travel, outdoor activity, indoor time, and evening.
For each item fill slot (e.g. "Morning, 6–9am"), action (specific and doable today), why (tie it to the measured pollutants above), benefit (expected personal benefit, no invented numbers unless you compute it from the context), difficulty, and limitations (be honest about what it will not fix). Keep why, benefit and limitations to one sentence each.
The summary must be two sentences that name the dominant pollutant and the single most important action today.`;

  return generateRecommendations(SHARED_RULES, prompt);
}

const explanationSchema = {
  type: "object",
  properties: {
    headline: { type: "string" },
    why: { type: "string" },
    whatToDo: { type: "string" },
    uncertainty: { type: "string" },
  },
  required: ["headline", "why", "whatToDo", "uncertainty"],
};

const explanationValidator = z.object({
  headline: z.string().min(1),
  why: z.string().min(1),
  whatToDo: z.string().min(1),
  uncertainty: z.string().min(1),
});

const EXPLAIN_RULES = `${SHARED_RULES}
Additional rule for this mode: a deterministic engine has already made the verdict. You may only explain its rule and evidence. Never override the verdict, change a number, or add a reading that is not in the CONTEXT.`;

/**
 * Explains one engine decision. The model never decides and never computes —
 * it receives the exact rule, evidence and verdict produced by `buildDecisions`.
 */
export async function explainDecision(
  air: AirData,
  report: DecisionReport,
  decisionId: DecisionId,
): Promise<DecisionExplanation> {
  const decision = report.decisions.find((item) => item.id === decisionId);
  if (!decision) throw new AiError("invalid_request", "Unknown decision.");

  const prompt = `CONTEXT
${buildContext(air)}

DETERMINISTIC DECISION (do not change it)
${JSON.stringify(decision, null, 2)}

TASK
Explain this decision in plain language. Fill:
- headline: one short sentence that repeats the verdict without softening or strengthening it.
- why: two sentences naming the rule that fired and the measurements that support it, using only the evidence above.
- whatToDo: the action, kept practical and within a normal household budget.
- uncertainty: what is missing, modelled or unknown. Do not invent limitations that are not in the decision.`;

  const text = await withFallback((model) =>
    callGemini(
      model,
      {
        systemInstruction: { parts: [{ text: EXPLAIN_RULES }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 700,
          responseMimeType: "application/json",
          responseSchema: explanationSchema,
        },
      },
      30_000,
    ),
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AiError("bad_output", "The AI model returned malformed JSON.");
  }
  const validated = explanationValidator.safeParse(parsed);
  if (!validated.success) throw new AiError("bad_output", "The AI model returned an unexpected shape.");
  return validated.data;
}

export async function indoorGuidance(air: AirData, household: string) {
  const context = buildContext(air);
  const prompt = `CONTEXT
${context}

HOUSEHOLD
${household}

TASK
Give exactly 5 indoor air recommendations for this household today, given the outdoor pollution above. Cover, where relevant to this home: ventilation timing, cooking smoke, dust, purifier use, candles and incense, and cleaning.
For each item fill slot (e.g. "Ventilation", "Kitchen"), action, why, benefit, difficulty, and limitations. Keep why, benefit and limitations to one sentence each. Be explicit that indoor filtration does not remove outdoor pollution and that a purifier is not a substitute for reducing sources.
The summary must state whether today is a day to ventilate or to keep windows closed in this location, and say which measurement led you to that call.`;

  return generateRecommendations(SHARED_RULES, prompt);
}
