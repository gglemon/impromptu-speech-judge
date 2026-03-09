const LIMIT = 5;
const WINDOW_MS = 60_000;

const timestamps: number[] = [];

export function checkRateLimit(): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  // Drop timestamps outside the window
  while (timestamps.length > 0 && timestamps[0] < now - WINDOW_MS) {
    timestamps.shift();
  }
  if (timestamps.length >= LIMIT) {
    const retryAfterMs = WINDOW_MS - (now - timestamps[0]);
    return { allowed: false, retryAfterMs };
  }
  timestamps.push(now);
  return { allowed: true, retryAfterMs: 0 };
}
