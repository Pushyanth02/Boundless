import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { HistoryItem } from "@/lib/analysis/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await db.analysis.findMany({
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        id: true,
        createdAt: true,
        fileName: true,
        jobTitle: true,
        overall: true,
        atsScore: true,
        verdict: true,
        mode: true,
      },
    });

    const items: HistoryItem[] = rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      fileName: r.fileName,
      jobTitle: r.jobTitle,
      overall: r.overall,
      atsScore: r.atsScore,
      verdict: r.verdict,
      mode: r.mode,
    }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] as HistoryItem[] });
  }
}
