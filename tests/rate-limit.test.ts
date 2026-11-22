import { describe, expect, it } from "vitest";
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
});
