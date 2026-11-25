import type { NextRequest } from "next/server";
import { apiError, numberParam } from "@/lib/http";
import { getAirData, isValidCoordinate, UpstreamError } from "@/lib/air";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

/** Display metadata is cosmetic: strip control characters and cap length before echoing it. */
function display(value: string | null, max: number, fallback = "") {
  const clean = (value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
  return clean || fallback;
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const limit = rateLimit(`air:${clientIp(request)}`, 30);
  if (!limit.ok) {
    return apiError(
      429,
      "rate_limited",
      "Too many reading requests. Wait a minute and try again.",
      { "Retry-After": String(limit.retryAfter) },
    );
  }

  const lat = numberParam(params, "lat");
  const lon = numberParam(params, "lon");
  const name = display(params.get("name"), 80, "Selected location");

  if (lat == null || lon == null || !isValidCoordinate(lat, lon)) {
    return apiError(
      400,
      "invalid_location",
      "Latitude and longitude are required and must be valid.",
    );
  }

  // Explicit refreshes and precise device locations must never enter a shared cache.
  const privateReading = params.has("refresh") || name === "Your location";

  try {
    const data = await getAirData(lat, lon, {
      name,
      admin: display(params.get("admin"), 80),
      country: display(params.get("country"), 80),
      countryCode: display(params.get("countryCode"), 4),
      latitude: lat,
      longitude: lon,
    });

    return Response.json(data, {
      headers: {
        "Cache-Control": privateReading
          ? "private, no-store"
          : "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    if (error instanceof UpstreamError) {
      const status = error.status === 400 ? 400 : 502;
      return apiError(
        status,
        "upstream",
        status === 400
          ? "Coordinates are outside the valid range."
          : "Air quality data is temporarily unavailable.",
      );
    }
    return apiError(500, "unknown", "Could not load air quality data.");
  }
}
