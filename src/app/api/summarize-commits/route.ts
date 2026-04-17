import type { NextRequest } from "next/server";
import { requireAuth, rateLimitKey } from "@/lib/api-auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  GROQ_API_URL,
  GROQ_MODEL,
  GROQ_MAX_RETRIES,
  MAX_DIFF_CHARS_PER_COMMIT,
  MAX_TOTAL_CHARS,
  MAX_COMMITS,
  AI_RATE_LIMIT,
  AI_RATE_WINDOW_MS
} from "@/lib/ai-config";

const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS) || 30_000;

const SYSTEM_PROMPT = `You are a technical writing assistant for developer daily standup updates.

You will receive a list of git commits with their title and the unified diff of the changes. Write a BRIEF, professional summary (3–6 bullet points) describing what was actually accomplished in business-friendly language.

Rules:
- Focus on OUTCOMES (what now works / what was fixed / what changed for the user or the system).
- Mention key areas touched only when relevant (e.g. "authentication flow", "dashboard filters"), not file paths.
- Merge related commits into a single bullet — do not echo one bullet per commit.
- Keep each bullet under 20 words.
- Do NOT include commit SHAs, author names, or filler like "I worked on…".
- Do NOT invent functionality that isn't in the diff.
- Output clean markdown bullets only. No heading, no code fences.`;

type CommitPayload = { title: string; sha: string; diff: string };

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max)}\n…[diff truncated]…`;
}

function buildUserPrompt(commits: CommitPayload[]): string {
  const lines: string[] = [];
  lines.push(
    `Summarize the following ${commits.length} commit(s) as bullet points for a daily update:\n`
  );

  let running = 0;
  for (let i = 0; i < commits.length; i++) {
    const c = commits[i]!;
    const diff = truncate(c.diff ?? "", MAX_DIFF_CHARS_PER_COMMIT);
    const block = `Commit ${i + 1}: ${c.title}\n---DIFF START---\n${diff}\n---DIFF END---\n`;
    if (running + block.length > MAX_TOTAL_CHARS) {
      lines.push(
        `\n…[${commits.length - i} more commits omitted from prompt for brevity]…`
      );
      break;
    }
    lines.push(block);
    running += block.length;
  }
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────
  const auth = requireAuth(request);
  if ("error" in auth) return auth.error;

  // ── Rate limiting ───────────────────────────────────────────
  const rlKey = rateLimitKey(request, "summarize");
  const rl = rateLimit(rlKey, AI_RATE_LIMIT, AI_RATE_WINDOW_MS);
  if (!rl.ok) return rateLimitResponse(rl);

  // ── API key check ───────────────────────────────────────────
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI_API_KEY not configured" },
      { status: 500 }
    );
  }

  // ── Input validation ────────────────────────────────────────
  let body: { commits?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!Array.isArray(body.commits) || body.commits.length === 0) {
    return Response.json(
      { error: "commits array required" },
      { status: 400 }
    );
  }

  const commits = (body.commits as unknown[])
    .slice(0, MAX_COMMITS)
    .map((c): CommitPayload | null => {
      if (!c || typeof c !== "object") return null;
      const rec = c as { title?: unknown; sha?: unknown; diff?: unknown };
      if (typeof rec.title !== "string" || typeof rec.diff !== "string")
        return null;
      return {
        title: rec.title.slice(0, 500),
        sha: typeof rec.sha === "string" ? rec.sha.slice(0, 50) : "",
        diff: rec.diff
      };
    })
    .filter((c): c is CommitPayload => c !== null);

  if (commits.length === 0) {
    return Response.json({ error: "no valid commits" }, { status: 400 });
  }

  // ── Groq API call ──────────────────────────────────────────
  const payload = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(commits) }
    ],
    temperature: 0.2,
    max_tokens: 800
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
      const summary = raw
        .replace(/^```(?:markdown)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      if (!summary) {
        lastError = new Error("empty_summary");
        continue;
      }

      return Response.json({ summary, model: GROQ_MODEL });
    } catch (e) {
      lastError = e;
    }
  }

  const isTimeout =
    lastError instanceof DOMException && lastError.name === "AbortError";
  return Response.json(
    { error: isTimeout ? "ai_timeout" : "summarize_failed" },
    { status: isTimeout ? 504 : 502 }
  );
}
