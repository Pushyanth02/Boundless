/**
 * BOUNDLESS · Document parsing (server-side)
 * ─────────────────────────────────────────────────────────────
 * Extracts plain text from PDF (unpdf/pdf.js), DOCX (mammoth),
 * and plain-text sources. Never throws — returns parseOk=false
 * on failure so the engine can degrade gracefully.
 */

export interface ParsedDocument {
  text: string;
  kind: "pdf" | "docx" | "text";
  parseOk: boolean;
  error?: string;
}

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

export function fileExtension(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name ?? "");
  return match ? match[1].toLowerCase() : "";
}

export function acceptedDocument(name: string): boolean {
  return ["pdf", "docx", "doc", "txt", "md", "rtf"].includes(fileExtension(name));
}

/** Clean common PDF-extraction artifacts without losing signal. */
function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const data = new Uint8Array(buffer);
    const pdf = await getDocumentProxy(data);
    const { text } = await extractText(pdf, { mergePages: true });
    const merged = Array.isArray(text) ? text.join("\n") : text;
    const cleaned = cleanText(merged ?? "");
    return {
      text: cleaned,
      kind: "pdf",
      parseOk: cleaned.length >= 40,
      error: cleaned.length >= 40 ? undefined : "PDF yielded almost no text — it may be image-based.",
    };
  } catch (err) {
    return {
      text: "",
      kind: "pdf",
      parseOk: false,
      error: `PDF parsing failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    const cleaned = cleanText(value ?? "");
    return {
      text: cleaned,
      kind: "docx",
      parseOk: cleaned.length >= 40,
      error: cleaned.length >= 40 ? undefined : "DOCX yielded almost no text.",
    };
  } catch (err) {
    return {
      text: "",
      kind: "docx",
      parseOk: false,
      error: `DOCX parsing failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

export async function parseDocument(
  buffer: Buffer,
  fileName: string
): Promise<ParsedDocument> {
  if (!buffer || buffer.length === 0) {
    return { text: "", kind: "text", parseOk: false, error: "Empty file." };
  }
  if (buffer.length > MAX_FILE_BYTES) {
    return {
      text: "",
      kind: "text",
      parseOk: false,
      error: "File exceeds the 15 MB limit.",
    };
  }
  const ext = fileExtension(fileName);
  if (ext === "pdf") return parsePdf(buffer);
  if (ext === "docx" || ext === "doc") return parseDocx(buffer);
  // txt / md / rtf → treat as text
  return { text: cleanText(buffer.toString("utf8")), kind: "text", parseOk: true };
}
