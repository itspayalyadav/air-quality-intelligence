import { describe, expect, it } from "vitest";
import { ApiRequestError, numberParam, readJson } from "@/lib/http";

describe("numberParam", () => {
  const params = (query: string) => new URLSearchParams(query);

  it("keeps a missing parameter distinct from zero", () => {
    expect(numberParam(params(""), "lat")).toBeNull();
    expect(numberParam(params("lat="), "lat")).toBeNull();
    expect(numberParam(params("lat=0"), "lat")).toBe(0);
  });

  it("parses decimals and rejects text", () => {
    expect(numberParam(params("lon=77.209"), "lon")).toBe(77.209);
    expect(numberParam(params("lat=abc"), "lat")).toBeNull();
    expect(numberParam(params("lat=Infinity"), "lat")).toBeNull();
  });
});

describe("readJson", () => {
  it("returns the parsed body on success", async () => {
    const response = Response.json({ results: [1, 2] });
    await expect(readJson<{ results: number[] }>(response, "fallback")).resolves.toEqual({
      results: [1, 2],
    });
  });

  it("throws the upstream code and message from the error envelope", async () => {
    const response = Response.json(
      { error: { code: "invalid_location", message: "Bad coordinates." } },
      { status: 400 },
    );

    const failure = await readJson(response, "fallback").catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiRequestError);
    expect(failure).toMatchObject({ code: "invalid_location", message: "Bad coordinates." });
  });

  it("uses the caller fallback when the error body has no envelope", async () => {
    const failure = await readJson(Response.json({}, { status: 502 }), "Could not load air quality data.").catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiRequestError);
    expect(failure).toMatchObject({ code: "unknown", message: "Could not load air quality data." });
  });

  it("treats an unreadable body as a plain error so callers keep their network copy", async () => {
    const gatewayError = () => new Response("<html>gateway error</html>", { status: 502 });

    await expect(readJson(gatewayError(), "fallback")).rejects.toThrow(
      "The server returned an unreadable response.",
    );
    await expect(readJson(gatewayError(), "fallback")).rejects.not.toBeInstanceOf(ApiRequestError);
  });
});
