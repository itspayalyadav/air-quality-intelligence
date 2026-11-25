import type { NextRequest } from "next/server";

/**
 * Only the platform-written forwarding header is trusted. Vercel overwrites
 * `x-vercel-forwarded-for` at the edge; `x-forwarded-for` and `x-real-ip` can
 * be supplied by the caller and must never be used as a rate-limit identity.
 */
export function clientIp(request: NextRequest): string {
  const trusted = request.headers.get("x-vercel-forwarded-for");
  const value = trusted?.split(",")[0]?.trim();
  return value && value.length <= 64 && /^[\d.:a-fA-F]+$/.test(value) ? value : "local";
}
