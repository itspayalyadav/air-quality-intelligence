import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AiError,
  aiConfigured,
  buildContext,
  chatReply,
  generateRecommendations,
  generateText,
} from "@/lib/ai";
import type { AirData } from "@/lib/types";
import { usBand } from "@/lib/aqi";

const ORIGINAL_KEY = process.env.GEMINI_API_KEY;

function mockAir(overrides: Partial<AirData> = {}): AirData {
  return {
    place: {
      name: "New Delhi",
      admin: "NCT of Delhi",
      country: "India",
      latitude: 28.6139,
      longitude: 77.209,
    },
    observedAt: "2026-11-17T18:30",
    timezone: "Asia/Kolkata",
    usAqi: 150,
    usBand: usBand(150),
    cpcb: {
      aqi: 264,
      band: usBand(264),
      subIndices: { pm2_5: 264 },
      sampleSize: 6,
      dominant: "pm2_5",
    },
    pollutants: {
      pm2_5: { value: 75.7, unit: "µg/m³", usSubIndex: 150 },
      pm10: { value: 77.8, unit: "µg/m³", usSubIndex: 53 },
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
    history: { time: ["a", "b", "c", "d", "e", "f"], pm25: [70, 72, 74, 76, 78, 80] },
    stale: false,
    fetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

function geminiResponse(text: string) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function capacityError() {
  return new Response(
    JSON.stringify({ error: { code: 503, message: "high demand", status: "UNAVAILABLE" } }),
    { status: 503 },
  );
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.GEMINI_MODEL;
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (ORIGINAL_KEY === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = ORIGINAL_KEY;
});

describe("configuration", () => {
  it("reports the key as missing when it is not set", () => {
    delete process.env.GEMINI_API_KEY;
    expect(aiConfigured()).toBe(false);
  });

  it("throws a typed error instead of calling the API without a key", async () => {
    delete process.env.GEMINI_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateText("system", "prompt")).rejects.toMatchObject({ code: "missing_key" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("capacity errors", () => {
  it("falls back to the second model when the first returns 503 twice", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(capacityError())
      .mockResolvedValueOnce(capacityError())
      .mockResolvedValueOnce(geminiResponse("answer from fallback"));
    vi.stubGlobal("fetch", fetchMock);

    const text = await generateText("system", "prompt");
    expect(text).toBe("answer from fallback");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain("gemini-flash-lite-latest");
    expect(String(fetchMock.mock.calls[2][0])).toContain("gemini-flash-latest");
  });

  it("recovers when the retry of the same model succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(capacityError())
      .mockResolvedValueOnce(geminiResponse("answer after retry"));
    vi.stubGlobal("fetch", fetchMock);

    expect(await generateText("system", "prompt")).toBe("answer after retry");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("moves on to the next model when a configured model has been retired", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 404 }))
      .mockResolvedValueOnce(new Response("{}", { status: 404 }))
      .mockResolvedValueOnce(geminiResponse("answer from fallback"));
    vi.stubGlobal("fetch", fetchMock);

    const text = await generateText("system", "prompt");
    expect(text).toBe("answer from fallback");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2][0])).toContain("gemini-flash-latest");
  });

  it("raises a busy error when every model is overloaded", async () => {
    const fetchMock = vi.fn().mockResolvedValue(capacityError());
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateText("system", "prompt")).rejects.toMatchObject({ code: "busy" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a non-retryable client error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const error = await generateText("system", "prompt").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).code).toBe("invalid_request");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("structured recommendations", () => {
  const valid = {
    summary: "Keep windows closed until the evening.",
    items: [
      {
        slot: "Morning",
        action: "Delay the walk to 6am",
        why: "PM2.5 is the dominant pollutant today.",
        benefit: "Lower inhaled dose during exercise.",
        difficulty: "easy",
        limitations: "Early mornings can still be above the standard.",
      },
    ],
  };

  it("parses a well-formed structured answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(valid))));

    const set = await generateRecommendations("system", "prompt");
    expect(set.items[0].difficulty).toBe("easy");
  });

  it("rejects JSON that does not match the schema", async () => {
    const broken = { summary: "x", items: [{ slot: "Morning" }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(broken))));

    await expect(generateRecommendations("system", "prompt")).rejects.toMatchObject({
      code: "bad_output",
    });
  });

  it("rejects malformed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiResponse("{not json")));

    await expect(generateRecommendations("system", "prompt")).rejects.toMatchObject({
      code: "bad_output",
    });
  });
});

describe("grounding", () => {
  it("puts the measured values and the CPCB caveat into the prompt context", () => {
    const context = buildContext(mockAir());
    expect(context).toContain("US AQI: 150");
    expect(context).toContain("PM2.5: 75.7");
    expect(context).toContain("not an official CPCB station reading");
    expect(context).toContain("wind 5.1 km/h WSW");
  });

  it("says a value is unavailable rather than omitting the gap silently", () => {
    const context = buildContext(
      mockAir({
        cpcb: null,
        weather: null,
        usAqi: null,
        usBand: null,
        pollutants: {
          ...mockAir().pollutants,
          pm2_5: { value: null, unit: "µg/m³", usSubIndex: null },
        },
      }),
    );
    expect(context).toContain("not enough pollutants");
    expect(context).toContain("Weather: unavailable");
    expect(context).toContain("US AQI: unavailable");
  });

  it("warns the model when the reading is stale", () => {
    expect(buildContext(mockAir({ stale: true }))).toContain("older than three hours");
  });

  it("sends the conversation history to the model", async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await chatReply(mockAir(), "Is it safe to run?", [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ]);

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    const prompt = body.contents[0].parts[0].text as string;
    expect(prompt).toContain("Is it safe to run?");
    expect(prompt).toContain("Assistant: hi");
    expect(prompt).toContain("CONTEXT");
  });
});
