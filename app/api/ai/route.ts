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
import { apiError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
// Two model attempts at 30s each is bounded by this. Without it Vercel's default
// function timeout would cut the request before the structured answer arrives.
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
  invalid_request: 502,
  upstream: 502,
};

export async function POST(request: NextRequest) {
  if (!aiConfigured()) {
    return apiError(
      503,
      "missing_key",
      "The AI assistant is not configured on this server. Add GEMINI_API_KEY and redeploy.",
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const limit = rateLimit(ip);
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
    return apiError(400, "invalid_body", parsed.error.issues[0]?.message ?? "Invalid request.");
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

    if (input.mode === "chat") {
      const text = await chatReply(air, input.message, input.history);
      return Response.json({ mode: "chat", text, model: activeModel(), configured: true });
    }

    if (input.mode === "plan") {
      const data = await dailyPlan(air, input.profile);
      return Response.json({ mode: "plan", data, model: activeModel(), configured: true });
    }

    if (input.mode === "indoor") {
      const data = await indoorGuidance(air, input.household);
      return Response.json({ mode: "indoor", data, model: activeModel(), configured: true });
    }

    // The engine runs here on freshly fetched readings; the browser cannot send a verdict.
    const profile: DecisionProfile = input.profile;
    const report = buildDecisions(air, profile);
    const data = await explainDecision(air, report, input.decisionId);
    return Response.json({
      mode: "explain",
      decisionId: input.decisionId,
      data,
      model: activeModel(),
      configured: true,
    });
  } catch (error) {
    if (error instanceof AiError) {
      return apiError(STATUS_BY_CODE[error.code], error.code, error.message);
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
