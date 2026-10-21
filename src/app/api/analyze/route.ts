import { NextRequest, NextResponse } from "next/server";
import { runAnalysis } from "@/lib/analysis";
import type { AnalyzeResponse } from "@/lib/analysis/types";
import { acceptedDocument, fileExtension, parseDocument } from "@/lib/parse-document";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

const MIN_JD_CHARS = 80;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const resumeTextInput = (form.get("resumeText") as string | null)?.trim() ?? "";
    const jdText = ((form.get("jdText") as string | null) ?? "").trim();

    if (jdText.length < MIN_JD_CHARS) {
      return NextResponse.json(
        { error: `Job description is too short — paste at least ${MIN_JD_CHARS} characters.` },
        { status: 400 }
      );
    }

    let resumeText = "";
    let fileName: string | null = null;

    if (file instanceof File && file.size > 0) {
      fileName = file.name;
      if (!acceptedDocument(fileName)) {
        return NextResponse.json(
          { error: "Unsupported file type. Upload a PDF, DOCX, TXT or MD file." },
          { status: 400 }
        );
      }
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File exceeds the 15 MB limit." },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await parseDocument(buffer, fileName);
      if (!parsed.parseOk || parsed.text.trim().length < 40) {
        return NextResponse.json(
          {
            error:
              parsed.error ??
              "Could not extract readable text from this document. It may be image-based — try a text-based PDF or paste the content directly.",
          },
          { status: 422 }
        );
      }
      resumeText = parsed.text;
    } else if (resumeTextInput.length >= 40) {
      resumeText = resumeTextInput;
      fileName = "pasted-text";
    } else {
      return NextResponse.json(
        { error: "Provide a resume file or paste at least 40 characters of resume text." },
        { status: 400 }
      );
    }

    // Deterministic offline engine — always runs, no network.
    const result = runAnalysis({ resumeText, jdText, fileName });

    // Persist for history (best-effort — never block analysis on DB failure).
    let id = `local-${Date.now()}`;
    try {
      const row = await db.analysis.create({
        data: {
          fileName: fileName && fileExtension(fileName) === "" ? fileName : fileName,
          jobTitle: result.job.title ?? "Untitled role",
          jdExcerpt: jdText.slice(0, 2000),
          overall: result.scores.overall,
          atsScore: result.scores.ats.score,
          verdict: result.scores.verdict.label,
          mode: "offline",
          result: JSON.stringify(result),
        },
      });
      id = row.id;
    } catch {
      /* analysis still returned even if persistence fails */
    }

    const payload: AnalyzeResponse = { id, result };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed unexpectedly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
