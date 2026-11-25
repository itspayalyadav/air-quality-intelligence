import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAirData = vi.hoisted(() => vi.fn());
const aiMocks = vi.hoisted(() => ({
  dailyPlan: vi.fn(),
  indoorGuidance: vi.fn(),
  explainDecision: vi.fn(),
}));
vi.mock("@/lib/air", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/air")>();
  return { ...actual, getAirData };
});
vi.mock("@/lib/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai")>();
  return {
    ...actual,
    dailyPlan: aiMocks.dailyPlan,
    indoorGuidance: aiMocks.indoorGuidance,
    explainDecision: aiMocks.explainDecision,
  };
});

import { POST as aiPost } from "@/app/api/ai/route";
import { GET as airGet } from "@/app/api/air/route";
import { AiError } from "@/lib/ai";
import { airFixture } from "../e2e/fixture";

const ORIGINAL_KEY = process.env.GEMINI_API_KEY;
const place = { name: "New Delhi", admin: "Delhi", country: "India", countryCode: "IN" };
const body = { mode: "chat", lat: 28.6139, lon: 77.209, place, message: "Is it safe to walk?" };

function aiRequest(payload: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  getAirData.mockReset();
  aiMocks.dailyPlan.mockReset();
  aiMocks.indoorGuidance.mockReset();
  aiMocks.explainDecision.mockReset();
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = ORIGINAL_KEY;
});

describe("/api/ai contract", () => {
  it("rejects invalid fields without echoing schema details", async () => {
    const response = await aiPost(aiRequest({ mode: "chat", lat: 999, lon: 0, place, message: "hi" }));
    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe("invalid_body");
    expect(json.error.message).not.toMatch(/lat|lon|expected|zod/i);
  });

  it("rejects invalid coordinates before fetching any data", async () => {
    const response = await aiPost(
      aiRequest({ ...body, lat: 91, lon: 0 }, { "x-vercel-forwarded-for": "203.0.113.10" }),
    );
    expect(response.status).toBe(400);
    expect(getAirData).not.toHaveBeenCalled();
  });

  it("ignores spoofed forwarding headers when rate limiting", async () => {
    let blocked = false;
    for (let attempt = 0; attempt < 13; attempt += 1) {
      const response = await aiPost(
        aiRequest(
          { ...body, message: "Is it safe to walk today?" },
          {
            "x-vercel-forwarded-for": "203.0.113.77",
            "x-forwarded-for": `198.51.100.${attempt + 1}`,
          },
        ),
      );
      if (response.status === 429) {
        blocked = true;
        expect(response.headers.get("retry-after")).toBeTruthy();
        break;
      }
    }
    expect(blocked).toBe(true);
  });

  it("discloses a missing key without fabricating an answer", async () => {
    delete process.env.GEMINI_API_KEY;
    const response = await aiPost(aiRequest(body, { "x-vercel-forwarded-for": "203.0.113.20" }));
    expect(response.status).toBe(503);
    const json = (await response.json()) as { error: { code: string } };
    expect(json.error.code).toBe("missing_key");
  });
});

describe("consistent deterministic degradation", () => {
  const transient = () => new AiError("busy", "capacity");

  it("returns rule-based indoor guidance when both models are unavailable", async () => {
    getAirData.mockResolvedValue(airFixture());
    aiMocks.indoorGuidance.mockRejectedValue(transient());
    const response = await aiPost(
      aiRequest(
        { mode: "indoor", lat: 28.6139, lon: 77.209, place, household: "A city flat" },
        { "x-vercel-forwarded-for": "203.0.113.40" },
      ),
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      fallback?: string;
      model: string;
      data: { items: unknown[] };
    };
    expect(json.fallback).toBe("deterministic");
    expect(json.model).toBe("deterministic");
    expect(json.data.items).toHaveLength(5);
  });

  it("returns the existing deterministic decision when explanation is unavailable", async () => {
    getAirData.mockResolvedValue(airFixture());
    aiMocks.explainDecision.mockRejectedValue(transient());
    const response = await aiPost(
      aiRequest(
        {
          mode: "explain",
          lat: 28.6139,
          lon: 77.209,
          place,
          decisionId: "outdoor",
          profile: { sensitive: false, intensity: "normal", commute: "transit" },
        },
        { "x-vercel-forwarded-for": "203.0.113.41" },
      ),
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      fallback?: string;
      data: { headline: string; why: string };
    };
    expect(json.fallback).toBe("deterministic");
    expect(json.data.headline.length).toBeGreaterThan(0);
    expect(json.data.why).toContain("AQI");
  });

  it("keeps non-transient AI failures as errors instead of inventing a fallback", async () => {
    getAirData.mockResolvedValue(airFixture());
    aiMocks.indoorGuidance.mockRejectedValue(new AiError("bad_output", "broken"));
    const response = await aiPost(
      aiRequest(
        { mode: "indoor", lat: 28.6139, lon: 77.209, place, household: "A city flat" },
        { "x-vercel-forwarded-for": "203.0.113.42" },
      ),
    );
    expect(response.status).toBe(502);
    const json = (await response.json()) as { error: { code: string } };
    expect(json.error.code).toBe("bad_output");
  });
});

describe("/api/air contract", () => {
  it("rejects coordinates outside the valid range", async () => {
    const response = await airGet(
      new NextRequest("http://localhost/api/air?lat=999&lon=0&name=Bad", {
        headers: { "x-vercel-forwarded-for": "203.0.113.30" },
      }),
    );
    expect(response.status).toBe(400);
  });

  it("never puts an explicit refresh in a shared cache entry", async () => {
    getAirData.mockResolvedValue({ usAqi: 100, pollutants: {} });
    const response = await airGet(
      new NextRequest("http://localhost/api/air?lat=28.6&lon=77.2&name=Test&refresh=1", {
        headers: { "x-vercel-forwarded-for": "203.0.113.31" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
