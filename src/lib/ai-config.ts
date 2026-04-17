/**
 * Shared configuration for AI/Groq API routes.
 * Single source of truth — avoids duplicating env reads across route handlers.
 */

export const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
export const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS) || 15_000;
export const GROQ_MAX_RETRIES = Number(process.env.GROQ_MAX_RETRIES) || 2;

/** Allowed modes for the /api/enhance route. */
export const ENHANCE_MODES = ["grammar", "style", "expand"] as const;
export type EnhanceMode = (typeof ENHANCE_MODES)[number];

/** Max request body sizes to prevent abuse. */
export const MAX_ENHANCE_BODY_CHARS = 10_000;
export const MAX_DIFF_CHARS_PER_COMMIT = 3_500;
export const MAX_TOTAL_CHARS = 60_000;
export const MAX_COMMITS = 25;

/** Rate limit: requests per window per user for AI endpoints. */
export const AI_RATE_LIMIT = 20;
export const AI_RATE_WINDOW_MS = 60_000; // 1 minute
