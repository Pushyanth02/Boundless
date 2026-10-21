/**
 * BOUNDLESS · OpenRouter BYOK layer (server-side)
 * ─────────────────────────────────────────────────────────────
 * The user's OpenRouter key lives in their browser (localStorage)
 * and is forwarded per-request via the `x-openrouter-key` header.
 * It is NEVER persisted server-side or logged. This module builds
 * the enhancement prompt, calls the OpenRouter chat completions
 * API, and validates the structured JSON response with zod.
 */

import { z } from "zod";
import type { AiInsights, AnalysisResult } from "@/lib/analysis/types";

export const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_KEY_HEADER = "x-openrouter-key";

export interface OpenRouterModel {
  slug: string;
  label: string;
  note: string;
}

/** Curated model list — user can also enter any custom OpenRouter slug. */
export const CURATED_MODELS: OpenRouterModel[] = [
  { slug: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", note: "Best writing quality" },
  { slug: "openai/gpt-4o", label: "GPT-4o", note: "Fast & reliable" },
  { slug: "openai/gpt-4o-mini", label: "GPT-4o mini", note: "Cheapest OpenAI" },
  { slug: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Very fast" },
  { slug: "deepseek/deepseek-chat", label: "DeepSeek V3", note: "Great value" },
  { slug: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", note: "Open weights" },
  { slug: "mistralai/mistral-small-3.2-24b-instruct", label: "Mistral Small 3.2", note: "Lightweight" },
];

export const DEFAULT_MODEL = CURATED_MODELS[0].slug;

/* ── zod schema for the model's structured output ────────────── */

export const aiInsightsSchema = z.object({
  summary: z
    .string()
    .min(40)
    .describe("A 3-5 sentence honest narrative of the candidate's fit for this role"),
  gapNarratives: z
    .array(
      z.object({
        skill: z.string(),
        why: z.string().describe("Why this gap matters for THIS role (1-2 sentences)"),
        suggestion: z
          .string()
          .describe("A concrete, honest way to address it — transferable experience, learning path, or resume reframing (1-2 sentences)"),
      })
    )
    .max(8)
    .describe("Narratives for the most important missing skills (max 6, prioritized)"),
  summaryRewrite: z
    .string()
    .nullable()
    .describe("A rewritten professional summary tailored to this JD, or null"),
  atsNarrative: z
    .string()
    .nullable()
    .describe("A 2-4 sentence interpretation of the ATS audit — what will trip parsers and what to fix first, or null"),
  bulletSuggestions: z
    .array(
      z.object({
        original: z.string().describe("A verbatim bullet from the resume"),
        improved: z.string().describe("A stronger, quantified rewrite of that bullet"),
        why: z.string().describe("One sentence on why the rewrite is stronger"),
      })
    )
    .max(4)
    .describe("Improvements for the weakest resume bullets (0-3)"),
});

export type AiInsightsPayload = z.infer<typeof aiInsightsSchema>;

/* ── prompt construction ─────────────────────────────────────── */

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n[…truncated]`;
}

export function buildEnhancePrompt(result: AnalysisResult): { system: string; user: string } {
  const { candidate, job, scores, skills, keywords, experience, meta } = result;

  const missing = skills.missing
    .slice(0, 12)
    .map((s) => `- ${s.name} (${s.category}, ${s.priority} priority, ${s.required ? "required" : "nice-to-have"}, ${s.jdMentions} JD mentions)`)
    .join("\n");

  const matched = skills.matched
    .slice(0, 15)
    .map((s) => `- ${s.name} (${s.category}${s.required ? ", required" : ", preferred"}, ${s.resumeMentions} resume mentions)`)
    .join("\n");

  const ats = scores.ats.checks
    .map((c) => `- [${c.status.toUpperCase()}] ${c.label}: ${c.detail}`)
    .join("\n");

  const dims = scores.dimensions
    .map((d) => `- ${d.label}: ${d.score}/100 (weight ${d.weight}) — ${d.detail}`)
    .join("\n");

  const foundTerms = keywords.found.slice(0, 8).map((k) => k.term).join(", ");
  const missingTerms = keywords.missing.slice(0, 8).map((k) => k.term).join(", ");

  const system = [
    "You are a rigorous, honest career coach and ATS (Applicant Tracking System) expert.",
    "You analyze resume ↔ job-description fit data produced by a deterministic NLP engine, and write sharp, specific, actionable insights.",
    "Rules:",
    "- Be honest. If the match is weak, say so plainly. Never invent experience the candidate doesn't have.",
    "- Be specific: cite the actual skills, numbers and checks provided. No generic filler advice.",
    "- Suggestions must be concrete and immediately actionable.",
    "- Write in second person (\"you\"). Warm but direct tone. No em-dash overuse, no corporate clichés.",
    "- For bulletSuggestions, only reference bullets that actually appear in the resume excerpt.",
    "- Respond with a single JSON object matching the requested schema. No markdown fences, no commentary.",
  ].join("\n");

  const user = [
    `# Match analysis data`,
    ``,
    `## Overall`,
    `- Match score: ${scores.overall}/100 (${scores.verdict.label})`,
    `- ATS readiness: ${scores.ats.score}/100 (${scores.ats.label})`,
    `- Mode: deterministic offline NLP engine`,
    ``,
    `## Dimension scores`,
    `${dims}`,
    ``,
    `## Candidate profile`,
    `- Name: ${candidate.name ?? "unknown"}`,
    `- Detected experience: ${experience.yearsDetected !== null ? `${experience.yearsDetected} years` : "not detected"}`,
    `- Highest degree: ${candidate.highestDegree ?? "not detected"}`,
    `- Resume word count: ${candidate.wordCount}`,
    `- Quantified achievements: ${candidate.quantifiedHits}`,
    ``,
    `## Job profile`,
    `- Title: ${job.title ?? "unknown"}${job.seniority ? ` (${job.seniority})` : ""}`,
    ``,
    `## Matched skills`,
    `${matched || "- none"}`,
    ``,
    `## Missing skills (from the JD)`,
    `${missing || "- none"}`,
    ``,
    `## Keyword alignment`,
    `- Found in resume: ${foundTerms || "none"}`,
    `- Missing from resume: ${missingTerms || "none"}`,
    ``,
    `## ATS audit (${scores.ats.score}/100)`,
    `${ats}`,
    ``,
    `## Job description (excerpt)`,
    `"""\n${truncate(meta.jdExcerpt, 2200)}\n"""`,
    ``,
    `## Resume (excerpt)`,
    `"""\n${truncate(meta.resumeExcerpt, 2800)}\n"""`,
    ``,
    `Produce the JSON object now.`,
  ].join("\n");

  return { system, user };
}

/* ── OpenRouter client ───────────────────────────────────────── */

export interface OpenRouterCallOptions {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface OpenRouterCallResult {
  ok: boolean;
  content: string | null;
  model: string;
  status: number;
  error?: string;
}

export async function callOpenRouter(
  opts: OpenRouterCallOptions
): Promise<OpenRouterCallResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 90_000);

  try {
    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://boundless.app",
        "X-Title": "Boundless Resume Intelligence", // ASCII only: HTTP headers reject non-Latin-1
      },
      body: JSON.stringify({
        model: opts.model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: opts.maxTokens ?? 2600,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let message = `OpenRouter returned ${res.status}`;
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string } };
        if (parsed?.error?.message) message = parsed.error.message;
      } catch {
        /* keep default */
      }
      return { ok: false, content: null, model: opts.model, status: res.status, error: message };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? null;
    if (!content) {
      return {
        ok: false,
        content: null,
        model: opts.model,
        status: 200,
        error: "Model returned an empty response.",
      };
    }
    return { ok: true, content, model: opts.model, status: 200 };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "The AI model took too long to respond (90s timeout)."
        : err instanceof Error
          ? err.message
          : "Unknown OpenRouter error.";
    return { ok: false, content: null, model: opts.model, status: 500, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/** Tolerant JSON extraction — models sometimes wrap output in fences. */
export function extractJson(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        /* fall through */
      }
    }
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first !== -1 && last > first) {
      try {
        return JSON.parse(trimmed.slice(first, last + 1));
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

export function toAiInsights(payload: AiInsightsPayload, model: string): AiInsights {
  return {
    model,
    summary: payload.summary,
    gapNarratives: payload.gapNarratives.slice(0, 8),
    summaryRewrite: payload.summaryRewrite ?? null,
    atsNarrative: payload.atsNarrative ?? null,
    bulletSuggestions: payload.bulletSuggestions.slice(0, 4),
  };
}

export function modelLabel(slug: string): string {
  const curated = CURATED_MODELS.find((m) => m.slug === slug);
  if (curated) return curated.label;
  const tail = slug.split("/").pop() ?? slug;
  return tail.replace(/[-_:]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
