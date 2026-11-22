import type { NextRequest } from "next/server";
import { apiError, numberParam } from "@/lib/http";
import { getAirData, isValidCoordinate, UpstreamError } from "@/lib/air";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const lat = numberParam(params, "lat");
  const lon = numberParam(params, "lon");
  const name = (params.get("name") ?? "Selected location").slice(0, 80);

  if (lat == null || lon == null || !isValidCoordinate(lat, lon)) {
    return apiError(
      400,
      "invalid_location",
      "Latitude and longitude are required and must be valid.",
    );
  }

  try {
    const data = await getAirData(lat, lon, {
      name,
      admin: params.get("admin")?.slice(0, 80) ?? undefined,
      country: params.get("country")?.slice(0, 80) ?? undefined,
      countryCode: params.get("countryCode")?.slice(0, 4) ?? undefined,
      latitude: lat,
      longitude: lon,
    });

    return Response.json(data, {
      headers: {
        // Modelled readings update hourly upstream; ten minutes keeps the dashboard lively
        // without hammering the free tier.
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    if (error instanceof UpstreamError) {
      return apiError(error.status, "upstream", error.message);
    }
    return apiError(500, "unknown", "Could not load air quality data.");
  }
}
