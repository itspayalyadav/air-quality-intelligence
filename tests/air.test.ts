import { afterEach, describe, expect, it, vi } from "vitest";
import { getAirData, isValidCoordinate, searchCities, UpstreamError } from "@/lib/air";

const PLACE = { name: "New Delhi", latitude: 28.6139, longitude: 77.209 };

function istNow() {
  return new Date(Date.now() + 19_800_000).toISOString().slice(0, 16);
}

function airPayload(overrides: Record<string, unknown> = {}) {
  return {
    timezone: "Asia/Kolkata",
    utc_offset_seconds: 19_800,
    current: {
      time: istNow(),
      us_aqi: 150,
      us_aqi_pm2_5: 150,
      us_aqi_pm10: 53,
      us_aqi_nitrogen_dioxide: 41,
      us_aqi_sulphur_dioxide: 21,
      us_aqi_carbon_monoxide: 10,
      us_aqi_ozone: 58,
      pm2_5: 75.7,
      pm10: 77.8,
      nitrogen_dioxide: 83.7,
      sulphur_dioxide: 37.8,
      carbon_monoxide: 2372,
      ozone: 34,
      ...overrides,
    },
    hourly: {
      time: ["2026-11-17T00:00", "2026-11-17T01:00"],
      pm2_5: [70.2, 74.1],
    },
  };
}

const weatherPayload = {
  current: {
    temperature_2m: 20.6,
    relative_humidity_2m: 61,
    wind_speed_10m: 5.1,
    wind_direction_10m: 247,
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isValidCoordinate", () => {
  it("accepts real coordinates", () => {
    expect(isValidCoordinate(28.61, 77.2)).toBe(true);
    expect(isValidCoordinate(-90, 180)).toBe(true);
  });

  it("rejects out of range and non-numeric input", () => {
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(0, 181)).toBe(false);
    expect(isValidCoordinate(Number.NaN, 0)).toBe(false);
  });
});

describe("getAirData", () => {
  it("maps an upstream reading into the app payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(jsonResponse(url.includes("air-quality") ? airPayload() : weatherPayload)),
      ),
    );

    const data = await getAirData(28.6139, 77.209, PLACE);

    expect(data.usAqi).toBe(150);
    expect(data.usBand?.label).toBe("Unhealthy for sensitive groups");
    expect(data.pollutants.pm2_5.value).toBe(75.7);
    expect(data.pollutants.pm2_5.usSubIndex).toBe(150);
    expect(data.cpcb?.aqi).toBe(151);
    expect(data.weather?.windCompass).toBe("WSW");
    expect(data.history.pm25).toHaveLength(2);
    expect(data.stale).toBe(false);
  });

  it("still returns air data when the weather call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          url.includes("air-quality") ? jsonResponse(airPayload()) : jsonResponse({}, 500),
        ),
      ),
    );

    const data = await getAirData(28.6139, 77.209, PLACE);
    expect(data.weather).toBeNull();
    expect(data.usAqi).toBe(150);
  });

  it("flags readings older than three hours as stale", async () => {
    const old = new Date(Date.now() - 6 * 60 * 60 * 1000 + 19_800_000).toISOString().slice(0, 16);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          url.includes("air-quality")
            ? jsonResponse(airPayload({ time: old }))
            : jsonResponse(weatherPayload),
        ),
      ),
    );

    const data = await getAirData(28.6139, 77.209, PLACE);
    expect(data.stale).toBe(true);
  });

  it("throws an upstream error when the provider returns a server error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({ error: true }, 500))));

    await expect(getAirData(28.6139, 77.209, PLACE)).rejects.toMatchObject({
      name: "UpstreamError",
      status: 502,
    });
  });

  it("throws a gateway timeout when the provider hangs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("fetch failed"))),
    );

    await expect(getAirData(28.6139, 77.209, PLACE)).rejects.toBeInstanceOf(UpstreamError);
    await expect(getAirData(28.6139, 77.209, PLACE)).rejects.toMatchObject({ status: 504 });
  });

  it("rejects coordinates outside the valid range before calling out", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(getAirData(120, 77, PLACE)).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("searchCities", () => {
  it("ignores queries shorter than two characters", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await searchCities("d")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps geocoder results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({
            results: [
              {
                name: "Delhi",
                latitude: 28.65195,
                longitude: 77.23149,
                country: "India",
                country_code: "IN",
                admin1: "National Capital Territory of Delhi",
              },
            ],
          }),
        ),
      ),
    );

    const results = await searchCities("delhi");
    expect(results[0]).toMatchObject({ name: "Delhi", countryCode: "IN" });
  });
});
