import { describe, it, expect, beforeEach, vi } from "vitest";

// Re-import fresh module state before each test to avoid cross-test pollution
// (rateLimiter uses module-level state)
async function freshCheckRateLimit() {
  vi.resetModules();
  const mod = await import("../rateLimiter");
  return mod.checkRateLimit;
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request", async () => {
    const checkRateLimit = await freshCheckRateLimit();
    const result = checkRateLimit();
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBe(0);
  });

  it("allows up to 5 requests within the window", async () => {
    const checkRateLimit = await freshCheckRateLimit();
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit().allowed).toBe(true);
    }
  });

  it("blocks the 6th request within the window", async () => {
    const checkRateLimit = await freshCheckRateLimit();
    for (let i = 0; i < 5; i++) checkRateLimit();
    const result = checkRateLimit();
    expect(result.allowed).toBe(false);
  });

  it("returns a positive retryAfterMs when blocked", async () => {
    const checkRateLimit = await freshCheckRateLimit();
    for (let i = 0; i < 5; i++) checkRateLimit();
    const result = checkRateLimit();
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it("allows requests again after the window expires", async () => {
    vi.useFakeTimers();
    const checkRateLimit = await freshCheckRateLimit();

    for (let i = 0; i < 5; i++) checkRateLimit();
    expect(checkRateLimit().allowed).toBe(false);

    // Advance time past the 60s window
    vi.advanceTimersByTime(61_000);

    expect(checkRateLimit().allowed).toBe(true);
    vi.useRealTimers();
  });
});
