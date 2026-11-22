import { computeCpcbAqi, POLLUTANT_KEYS, POLLUTANT_META, usBand, windCompass } from "./aqi";
import type { AirData, Place, PollutantKey, PollutantReading, Weather } from "./types";

const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

const UPSTREAM_TIMEOUT_MS = 9000;

export class UpstreamError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new UpstreamError(504, "Air quality provider did not respond in time.");
  }
  if (!response.ok) {
    throw new UpstreamError(
      response.status === 400 ? 400 : 502,
      `Air quality provider returned ${response.status}.`,
    );
  }
  return (await response.json()) as T;
}

type OpenMeteoAir = {
  timezone?: string;
  utc_offset_seconds?: number;
  current?: Record<string, number | string | null>;
  hourly?: { time?: string[]; pm2_5?: (number | null)[] };
};

type OpenMeteoWeather = {
  current?: Record<string, number | null>;
};

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function isValidCoordinate(lat: number, lon: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

const CURRENT_FIELDS = [
  "us_aqi",
  "us_aqi_pm2_5",
  "us_aqi_pm10",
  "us_aqi_nitrogen_dioxide",
  "us_aqi_sulphur_dioxide",
  "us_aqi_carbon_monoxide",
  "us_aqi_ozone",
  "pm2_5",
  "pm10",
  "nitrogen_dioxide",
  "sulphur_dioxide",
  "carbon_monoxide",
  "ozone",
].join(",");

export async function getAirData(lat: number, lon: number, place: Place): Promise<AirData> {
  if (!isValidCoordinate(lat, lon)) {
    throw new UpstreamError(400, "Coordinates are outside the valid range.");
  }

  const airUrl =
    `${AIR_URL}?latitude=${lat}&longitude=${lon}` +
    `&current=${CURRENT_FIELDS}` +
    `&hourly=pm2_5&past_days=7&forecast_days=0&timezone=auto`;

  const weatherUrl =
    `${WEATHER_URL}?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&timezone=auto`;

  const [airResult, weatherResult] = await Promise.allSettled([
    getJson<OpenMeteoAir>(airUrl),
    getJson<OpenMeteoWeather>(weatherUrl),
  ]);

  if (airResult.status === "rejected") throw airResult.reason;

  const air = airResult.value;
  const current = air.current ?? {};

  const pollutants = {} as Record<PollutantKey, PollutantReading>;
  for (const key of POLLUTANT_KEYS) {
    pollutants[key] = {
      value: num(current[key]),
      unit: POLLUTANT_META[key].unit,
      usSubIndex: num(current[`us_aqi_${key}`]),
    };
  }

  const usAqi = num(current.us_aqi);
  const offsetSeconds = air.utc_offset_seconds ?? 0;
  const observedAt = typeof current.time === "string" ? current.time : new Date().toISOString();
  const observedUtc =
    typeof current.time === "string"
      ? Date.parse(`${current.time}Z`) - offsetSeconds * 1000
      : Date.now();

  let weather: Weather | null = null;
  if (weatherResult.status === "fulfilled") {
    const w = weatherResult.value.current ?? {};
    weather = {
      temperatureC: num(w.temperature_2m),
      humidityPct: num(w.relative_humidity_2m),
      windKph: num(w.wind_speed_10m),
      windDeg: num(w.wind_direction_10m),
      windCompass: windCompass(num(w.wind_direction_10m)),
    };
  }

  return {
    place,
    observedAt,
    timezone: air.timezone ?? "UTC",
    usAqi,
    usBand: usAqi == null ? null : usBand(usAqi),
    cpcb: computeCpcbAqi(pollutants),
    pollutants,
    weather,
    history: {
      time: air.hourly?.time ?? [],
      pm25: air.hourly?.pm2_5 ?? [],
    },
    stale: Date.now() - observedUtc > 3 * 60 * 60 * 1000,
    fetchedAt: new Date().toISOString(),
  };
}

type GeocodeResponse = {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    country_code?: string;
    admin1?: string;
    population?: number;
  }>;
};

export type CityResult = {
  id: string;
  name: string;
  admin?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  population?: number;
};

export async function searchCities(query: string): Promise<CityResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `${GEOCODE_URL}?name=${encodeURIComponent(trimmed)}&count=8&language=en&format=json`;
  const data = await getJson<GeocodeResponse>(url);

  return (data.results ?? []).map((r) => ({
    id: `${r.latitude},${r.longitude}`,
    name: r.name,
    admin: r.admin1,
    country: r.country,
    countryCode: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
    population: r.population,
  }));
}
