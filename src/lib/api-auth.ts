import type { NextRequest } from "next/server";

/**
 * Extract and validate the Bearer token from an API route request.
 * Returns the token string if valid, or a 401 Response if missing/malformed.
 */
export function requireAuth(
  request: NextRequest
): { token: string } | { error: Response } {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: Response.json(
        { error: "unauthorized" },
        { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
      )
    };
  }

  const token = authHeader.slice(7).trim();

  if (!token || token.length < 10) {
    return {
      error: Response.json(
        { error: "invalid_token" },
        { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
      )
    };
  }

  return { token };
}

/**
 * Derive a rate-limit key from the request.
 * Uses the Bearer token hash for authenticated requests, IP as fallback.
 */
export function rateLimitKey(request: NextRequest, prefix: string): string {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    // Use first 16 chars of the token as a key (enough for uniqueness)
    const token = authHeader.slice(7).trim();
    return `${prefix}:tok:${token.slice(0, 16)}`;
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return `${prefix}:ip:${ip}`;
}
