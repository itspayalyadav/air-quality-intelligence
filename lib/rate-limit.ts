/**
 * shortcut: the bucket lives in instance memory, so on serverless it is a
 * per-instance speed bump rather than a global quota. Upgrade to Vercel KV or
 * Upstash if the AI endpoint ever needs a hard limit.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const LIMIT = 12;

export function rateLimit(key: string, limit = LIMIT): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    // Evict only expired buckets. Clearing the map would also erase active abusers.
    if (buckets.size > 5_000) {
      for (const [existing, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(existing);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}
