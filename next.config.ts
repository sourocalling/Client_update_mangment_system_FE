import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const csp = [
  "default-src 'self'",
  // Next.js needs unsafe-inline/eval for dev HMR; tighten with nonce in production
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  // Allow backend API, GitLab, Groq, and dev WebSocket
  `connect-src 'self' ${apiUrl} ws://localhost:* https://gitlab.webskitters.com https://api.groq.com`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Only send HSTS in production (HTTPS)
  ...(!isDev
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload"
        }
      ]
    : []),
  { key: "Content-Security-Policy", value: csp }
];

const nextConfig: NextConfig = {
  headers: async () => [{ source: "/(.*)", headers: securityHeaders }],
  poweredByHeader: false
};

export default nextConfig;
