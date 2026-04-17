import type { NextRequest } from "next/server";
import { requireAuth, rateLimitKey } from "@/lib/api-auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  GROQ_API_URL,
  GROQ_MODEL,
  GROQ_TIMEOUT_MS,
  GROQ_MAX_RETRIES,
  ENHANCE_MODES,
  MAX_ENHANCE_BODY_CHARS,
  AI_RATE_LIMIT,
  AI_RATE_WINDOW_MS,
  type EnhanceMode
} from "@/lib/ai-config";

const SYSTEM_PROMPT = `You are a writing assistant for developer daily standup updates.
You will receive a developer's update text and a mode. Respond ONLY with valid JSON — no markdown fences, no explanation.

Modes:
- "grammar": Fix grammar and spelling only. Keep the original meaning and tone.
- "style": Improve clarity, readability, and professional tone while preserving all information.
- "expand": Add more detail, structure with bullet points where appropriate, and make the update comprehensive.

Also analyse the text for:
- risk: Does the update mention blockers, delays, missed deadlines, dependency issues, or anything that signals the project is at risk? Return true/false and relevant keywords.
- inappropriate: Does the text contain unprofessional, offensive, or inappropriate language? Return true/false and the flagged words.

Respond with this exact JSON shape:
{
  "enriched": "<the improved text>",
  "risk": false,
  "riskKeywords": [],
  "inappropriate": false,
  "inappropriateKeywords": []
}`;

export async function POST(request: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────
  const auth = requireAuth(request);
  if ("error" in auth) return auth.error;

  // ── Rate limiting ───────────────────────────────────────────
  const rlKey = rateLimitKey(request, "enhance");
  const rl = rateLimit(rlKey, AI_RATE_LIMIT, AI_RATE_WINDOW_MS);
  if (!rl.ok) return rateLimitResponse(rl);

  // ── API key check ───────────────────────────────────────────
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI_API_KEY not configured" }, { status: 500 });
  }

  // ── Input validation ────────────────────────────────────────
  let body: { body?: unknown; mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.body !== "string" || !body.body.trim()) {
    return Response.json({ error: "body is required" }, { status: 400 });
  }

  const text = body.body.trim();

  if (text.length > MAX_ENHANCE_BODY_CHARS) {
    return Response.json(
      { error: `body exceeds ${MAX_ENHANCE_BODY_CHARS} character limit` },
      { status: 400 }
    );
  }

  const mode: EnhanceMode =
    typeof body.mode === "string" && ENHANCE_MODES.includes(body.mode as EnhanceMode)
      ? (body.mode as EnhanceMode)
      : "style";

  // ── Groq API call ──────────────────────────────────────────
  const payload = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Mode: ${mode}\n\nText:\n${text}` }
    ],
    temperature: 0.3,
    max_tokens: 2048
  });

  let lastError: unknown;

  for (let attempt = 0; attempt <= GROQ_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

      const groqRes = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: payload,
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!groqRes.ok) {
        lastError = new Error(`groq_error: ${groqRes.status}`);
        continue;
      }

      const groqData = (await groqRes.json()) as {
        choices: { message: { content: string } }[];
      };

      const raw = groqData.choices[0]?.message?.content ?? "";
      const parsed = JSON.parse(raw);

      return Response.json({
        enriched: parsed.enriched ?? text,
        risk: parsed.risk ?? false,
        riskKeywords: Array.isArray(parsed.riskKeywords) ? parsed.riskKeywords : [],
        inappropriate: parsed.inappropriate ?? false,
        inappropriateKeywords: Array.isArray(parsed.inappropriateKeywords)
          ? parsed.inappropriateKeywords
          : []
      });
    } catch (e) {
      lastError = e;
      if (e instanceof SyntaxError) {
        return Response.json({ error: "ai_parse_error" }, { status: 500 });
      }
    }
  }

  const isTimeout =
    lastError instanceof DOMException && lastError.name === "AbortError";

  return Response.json(
    { error: isTimeout ? "ai_timeout" : "enhance_failed" },
    { status: isTimeout ? 504 : 502 }
  );
}
