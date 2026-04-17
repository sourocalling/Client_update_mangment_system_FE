/**
 * In-memory sliding-window rate limiter.
 *
 * Designed for Next.js API routes in a single-process deployment.
 * For multi-instance production, swap the Map for Redis (e.g. @upstash/ratelimit).
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

const CLEANUP_INTERVAL_MS = 60_000;

// Periodically purge expired entries to prevent memory leaks
if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { __rateLimitCleanup?: ReturnType<typeof setInterval> };
  if (!g.__rateLimitCleanup) {
    g.__rateLimitCleanup = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
      }
    }, CLEANUP_INTERVAL_MS);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Check and consume one token for the given key.
 *
 * @param key    Unique identifier (e.g. IP address, user ID, or token hash).
 * @param limit  Maximum number of requests allowed in the window.
 * @param windowMs  Window duration in milliseconds.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  // Window expired or first request → start fresh
  if (!existing || now > existing.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  // Within window but over limit
  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  // Within window and under limit
  existing.count++;
  return { ok: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/**
 * Build a rate-limit Response (429 Too Many Requests) with standard headers.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
  return Response.json(
    { error: "rate_limit_exceeded" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, retryAfter)),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": new Date(result.resetAt).toISOString()
      }
    }
  );
}
