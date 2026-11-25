import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows twelve requests in a window", () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      expect(rateLimit("window-test").ok).toBe(true);
    }
  });

  it("blocks the thirteenth and reports a retry delay", () => {
    const key = "block-test";
    for (let attempt = 0; attempt < 12; attempt += 1) rateLimit(key);

    const blocked = rateLimit(key);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(60);
  });

  it("keeps separate buckets per client", () => {
    for (let attempt = 0; attempt < 12; attempt += 1) rateLimit("client-a");
    expect(rateLimit("client-b").ok).toBe(true);
  });

  it("honours a custom limit for non-AI endpoints", () => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      expect(rateLimit("air-test", 30).ok).toBe(true);
    }
    expect(rateLimit("air-test", 30).ok).toBe(false);
  });

  it("evicts only expired entries, never live buckets", () => {
    vi.useFakeTimers();
    try {
      const start = new Date("2026-11-25T10:00:00Z").getTime();
      vi.setSystemTime(start);
      for (let index = 0; index < 5_100; index += 1) rateLimit(`old-${index}`);
      vi.setSystemTime(start + 61_000);
      const key = "live-after-eviction";
      for (let attempt = 0; attempt < 12; attempt += 1) {
        expect(rateLimit(key).ok).toBe(true);
      }
      // The 13th call would have been erased by the old clear() path.
      expect(rateLimit(key).ok).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

afterEach(() => vi.useRealTimers());
