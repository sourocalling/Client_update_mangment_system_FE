import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const cookieKey = "cums_access_token";

const publicRoutes = new Set(["/login", "/signup"]);

function isPublicPath(pathname: string): boolean {
  if (publicRoutes.has(pathname)) return true;
  // Only allow exact sub-paths (e.g. /login/reset) — prevents matching /login-admin
  for (const route of publicRoutes) {
    if (pathname.startsWith(`${route}/`)) return true;
  }
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(cookieKey)?.value;

  const isPublic = isPublicPath(pathname);

  // Unauthenticated user trying to access a protected route → send to login
  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated user visiting /login → send to dashboard
  if (token && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();

  // Security headers on every response
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
