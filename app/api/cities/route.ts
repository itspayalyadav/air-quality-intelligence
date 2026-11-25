import type { NextRequest } from "next/server";
import { searchCities, UpstreamError } from "@/lib/air";
import { apiError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = rateLimit(`cities:${clientIp(request)}`, 20);
  if (!limit.ok) {
    return apiError(
      429,
      "rate_limited",
      "Too many location searches. Wait a minute and try again.",
      { "Retry-After": String(limit.retryAfter) },
    );
  }

  const query = (new URL(request.url).searchParams.get("q") ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 60);

  if (query.length < 2) {
    return Response.json({ results: [] });
  }

  try {
    const results = await searchCities(query);
    return Response.json(
      { results },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } },
    );
  } catch (error) {
    const status = error instanceof UpstreamError ? error.status : 502;
    return apiError(status, "upstream", "City search is unavailable right now.");
  }
}
