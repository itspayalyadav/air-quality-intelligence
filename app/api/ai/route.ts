import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAirData, isValidCoordinate, UpstreamError } from "@/lib/air";
import {
  AiError,
  type AiErrorCode,
  aiConfigured,
  activeModel,
  chatReply,
  dailyPlan,
  explainDecision,
  indoorGuidance,
} from "@/lib/ai";
import { buildDecisions, DEFAULT_PROFILE, type DecisionProfile } from "@/lib/decision-engine";
import { deterministicPlan } from "@/lib/plan-fallback";
import { apiError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";
// Three attempts (primary, retry, fallback) are bounded by this. Without it
// Vercel's default timeout could cut the request before the structured answer arrives.
export const maxDuration = 50;

const placeSchema = z.object({
  name: z.string().min(1).max(80),
  admin: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  countryCode: z.string().max(4).optional(),
});

/** Every mode is grounded in the same coordinates and place, so they are defined once. */
const groundingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  place: placeSchema,
});

const profileSchema = z.object({
  sensitive: z.boolean().default(false),
  intensity: z.enum(["light", "normal", "intense"]).default("normal"),
  commute: z.enum(["active", "transit", "car"]).default("transit"),
});

const bodySchema = z.discriminatedUnion("mode", [
  groundingSchema.extend({
    mode: z.literal("chat"),
    message: z.string().min(2).max(800),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(1500),
        }),
      )
      .max(10)
      .default([]),
  }),
  groundingSchema.extend({
    mode: z.literal("plan"),
    profile: z.object({
      routine: z.string().max(200).default("Standard weekday"),
      outdoorActivity: z.string().max(200).default("Walks and errands"),
      transport: z.string().max(200).default("Mixed"),
      household: z.string().max(200).default("Not specified"),
      concerns: z.string().max(200).default("General health"),
    }),
  }),
  groundingSchema.extend({
    mode: z.literal("indoor"),
    household: z.string().max(300).default("Typical urban apartment"),
  }),
  groundingSchema.extend({
    mode: z.literal("explain"),
    decisionId: z.enum(["outdoor", "exercise", "ventilate", "commute"]),
    profile: profileSchema.default(DEFAULT_PROFILE),
  }),
]);

const STATUS_BY_CODE: Record<AiErrorCode, number> = {
  missing_key: 503,
  busy: 503,
  model_unavailable: 503,
  timeout: 504,
  bad_output: 502,
  invalid_request: 400,
  upstream: 502,
};

/** Fixed public copy: internal model names, provider statuses and schema fields stay server-side. */
const PUBLIC_ERROR: Record<AiErrorCode, string> = {
  missing_key: "The AI assistant is not configured on this server.",
  busy: "The AI model is busy right now. Please try again shortly.",
  model_unavailable: "The configured AI model is unavailable. Please try again later.",
  timeout: "The AI model took too long to respond.",
  bad_output: "The AI model returned an unusable answer. Nothing was invented in its place.",
  invalid_request: "The AI request could not be accepted. Check the question and try again.",
  upstream: "The AI provider is unavailable right now.",
};

export async function POST(request: NextRequest) {
  if (!aiConfigured()) {
    return apiError(
      503,
      "missing_key",
      "The AI assistant is not configured on this server. Add GEMINI_API_KEY and redeploy.",
    );
  }

  const limit = rateLimit(`ai:${clientIp(request)}`);
  if (!limit.ok) {
    return apiError(
      429,
      "rate_limited",
      "That is a lot of questions at once. Wait a minute and try again.",
      { "Retry-After": String(limit.retryAfter) },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_body", "Request body must be JSON.");
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(400, "invalid_body", "The request contains invalid fields.");
  }

  const input = parsed.data;
  if (!isValidCoordinate(input.lat, input.lon)) {
    return apiError(400, "invalid_location", "Coordinates are outside the valid range.");
  }

  try {
    // The model is grounded in a server-side fetch, never in numbers sent by the browser.
    const air = await getAirData(input.lat, input.lon, {
      name: input.place.name,
      admin: input.place.admin,
      country: input.place.country,
      countryCode: input.place.countryCode,
      latitude: input.lat,
      longitude: input.lon,
    });

    let servedModel = activeModel();
    const recordModel = (model: string) => {
      servedModel = model;
    };

    if (input.mode === "chat") {
      const text = await chatReply(air, input.message, input.history, recordModel);
      return Response.json({ mode: "chat", text, model: servedModel, configured: true });
    }

    if (input.mode === "plan") {
      try {
        const data = await dailyPlan(air, input.profile, recordModel);
        return Response.json({ mode: "plan", data, model: servedModel, configured: true });
      } catch (error) {
        const unavailable =
          error instanceof AiError &&
          ["busy", "timeout", "model_unavailable", "upstream"].includes(error.code);
        if (unavailable) {
          // Only the Daily Plan has a complete deterministic rule set to fall back to.
          return Response.json({
            mode: "plan",
            data: deterministicPlan(air, input.profile),
            model: "deterministic",
            configured: true,
            fallback: "deterministic",
          });
        }
        throw error;
      }
    }

    if (input.mode === "indoor") {
      const data = await indoorGuidance(air, input.household, recordModel);
      return Response.json({ mode: "indoor", data, model: servedModel, configured: true });
    }

    // The engine runs here on freshly fetched readings; the browser cannot send a verdict.
    const profile: DecisionProfile = input.profile;
    const report = buildDecisions(air, profile);
    const data = await explainDecision(air, report, input.decisionId, recordModel);
    return Response.json({
      mode: "explain",
      decisionId: input.decisionId,
      data,
      model: servedModel,
      configured: true,
    });
  } catch (error) {
    if (error instanceof AiError) {
      // Detailed diagnostics stay in server logs; clients receive stable copy only.
      console.error(`[ai] ${error.code}: ${error.message}`);
      return apiError(STATUS_BY_CODE[error.code], error.code, PUBLIC_ERROR[error.code]);
    }
    if (error instanceof UpstreamError) {
      return apiError(
        502,
        "upstream",
        "Air quality data is unavailable, so the assistant cannot ground an answer.",
      );
    }
    return apiError(500, "unknown", "The assistant failed unexpectedly.");
  }
}
