import { NextRequest, NextResponse } from "next/server";
import { OPENROUTER_KEY_HEADER } from "@/lib/openrouter";
import type { OpenRouterTestResponse } from "@/lib/analysis/types";

export const runtime = "nodejs";

/**
 * BYOK connection test — validates the user's OpenRouter key against
 * the public /api/v1/key endpoint. The key is used transiently only.
 */
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get(OPENROUTER_KEY_HEADER)?.trim();
  if (!apiKey || apiKey.length < 20) {
    const payload: OpenRouterTestResponse = { ok: false, error: "Enter a valid OpenRouter key first." };
    return NextResponse.json(payload, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const payload: OpenRouterTestResponse = {
        ok: false,
        error: res.status === 401 ? "Key rejected by OpenRouter (401)." : `OpenRouter responded ${res.status}.`,
      };
      return NextResponse.json(payload, { status: 200 });
    }

    const data = (await res.json()) as {
      data?: { label?: string; usage?: number; limit?: number | null; is_free_tier?: boolean };
    };

    const label = data?.data?.label
      ? data.data.label
      : data?.data
        ? `Key valid${data.data.is_free_tier ? " (free tier)" : ""}`
        : "Key valid";

    const payload: OpenRouterTestResponse = { ok: true, label };
    return NextResponse.json(payload);
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Connection timed out."
        : "Could not reach OpenRouter.";
    const payload: OpenRouterTestResponse = { ok: false, error: message };
    return NextResponse.json(payload, { status: 200 });
  }
}
