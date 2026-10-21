import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AnalysisResult, EnhanceResponse } from "@/lib/analysis/types";
import {
  DEFAULT_MODEL,
  OPENROUTER_KEY_HEADER,
  aiInsightsSchema,
  buildEnhancePrompt,
  callOpenRouter,
  extractJson,
  toAiInsights,
} from "@/lib/openrouter";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Phase-2 AI enhancement (BYOK). The offline engine's result is already
 * persisted; this endpoint enriches it with OpenRouter-generated
 * narratives. The user's key arrives via header and is never stored.
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get(OPENROUTER_KEY_HEADER)?.trim();
    if (!apiKey || apiKey.length < 20) {
      return NextResponse.json(
        { ai: null, error: "A valid OpenRouter key is required. Add yours in Settings." },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | { id?: string; model?: string }
      | null;
    const id = body?.id;
    const model = body?.model?.trim() || DEFAULT_MODEL;

    if (!id) {
      return NextResponse.json({ ai: null, error: "Missing analysis id." }, { status: 400 });
    }

    const row = await db.analysis.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json(
        { ai: null, error: "Analysis not found — run a new analysis first." },
        { status: 404 }
      );
    }

    let result: AnalysisResult;
    try {
      result = JSON.parse(row.result) as AnalysisResult;
    } catch {
      return NextResponse.json(
        { ai: null, error: "Stored analysis is corrupted." },
        { status: 500 }
      );
    }

    const { system, user } = buildEnhancePrompt(result);
    const call = await callOpenRouter({ apiKey, model, system, user });

    if (!call.ok || !call.content) {
      return NextResponse.json({ ai: null, error: call.error ?? "Enhancement failed." }, { status: 502 });
    }

    const parsedJson = extractJson(call.content);
    const validated = aiInsightsSchema.safeParse(parsedJson);
    if (!validated.success) {
      return NextResponse.json(
        { ai: null, error: "The model returned malformed insights — try again or switch models." },
        { status: 502 }
      );
    }

    const ai = toAiInsights(validated.data, call.model);

    // Mark the row as AI-enhanced (best-effort).
    try {
      await db.analysis.update({
        where: { id },
        data: {
          mode: "ai",
          result: JSON.stringify({ ...result, /* ai merged client-side; keep row compact */ }),
        },
      });
    } catch {
      /* non-blocking */
    }

    const payload: EnhanceResponse = { ai };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enhancement failed.";
    return NextResponse.json({ ai: null, error: message }, { status: 500 });
  }
}
