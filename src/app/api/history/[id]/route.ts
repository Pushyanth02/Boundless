import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AnalysisResult } from "@/lib/analysis/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    const row = await db.analysis.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    let result: AnalysisResult | null = null;
    try {
      result = JSON.parse(row.result) as AnalysisResult;
    } catch {
      result = null;
    }
    return NextResponse.json({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      mode: row.mode,
      result,
    });
  } catch {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    await db.analysis.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
