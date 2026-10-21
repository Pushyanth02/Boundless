/**
 * BOUNDLESS · offline NLP engine — resume section detection
 * ─────────────────────────────────────────────────────────────────
 * Finds classic resume headers ("WORK EXPERIENCE", "Technical Skills:",
 * "Education ─────", …) and measures the word count of each section.
 * Robust to ALL-CAPS, trailing colons and divider runs; a line only
 * counts as a header when the whole (cleaned) line matches a known
 * header phrase, so bullets like "Experience with Kubernetes" never
 * produce phantom sections.
 */
import type { DetectedSection } from "./types";

interface SectionRule {
  regex: RegExp;
  name: string;
  confidence: number;
}

/** Ordered: more specific patterns first. */
const SECTION_RULES: SectionRule[] = [
  { regex: /^(work|professional|relevant|employment|career)\s+(experience|history)$/, name: "Experience", confidence: 1.0 },
  { regex: /^employment\s+history$/, name: "Experience", confidence: 1.0 },
  { regex: /^(work history|career history)$/, name: "Experience", confidence: 0.95 },
  { regex: /^experience$/, name: "Experience", confidence: 0.8 },

  { regex: /^education( and training)?( background)?$/, name: "Education", confidence: 1.0 },
  { regex: /^academic (background|qualifications|history)$/, name: "Education", confidence: 0.95 },

  { regex: /^(technical|core|key|professional|special|primary|it)\s+skills( and (abilities|tools|interests|experience))?$/, name: "Skills", confidence: 0.95 },
  { regex: /^skills( and (abilities|tools|experience|interests))?$/, name: "Skills", confidence: 0.9 },
  { regex: /^(core competencies|competencies|areas of expertise|technologies|tech stack|technical background)$/, name: "Skills", confidence: 0.85 },

  { regex: /^(professional|executive|career)\s+summary$/, name: "Summary", confidence: 0.95 },
  { regex: /^summary( of qualifications)?$/, name: "Summary", confidence: 0.85 },
  { regex: /^(about me|professional profile|candidate profile|career profile)$/, name: "About", confidence: 0.7 },
  { regex: /^(about|profile)$/, name: "About", confidence: 0.6 },

  { regex: /^(career )?objective$/, name: "Objective", confidence: 0.8 },

  { regex: /^(selected|personal|side|key|notable)?\s*projects( and (work|side projects|experience))?$/, name: "Projects", confidence: 0.95 },

  { regex: /^certifications?( and (training|licenses))?( \(.*)?$/, name: "Certifications", confidence: 1.0 },
  { regex: /^(awards|honors|achievements)( and (awards|honors|achievements))?$/, name: "Awards", confidence: 0.9 },
  { regex: /^publications( and (presentations|papers|research))?$/, name: "Publications", confidence: 1.0 },
  { regex: /^(volunteer|volunteering)( experience| work|ing)?$/, name: "Volunteer", confidence: 1.0 },
  { regex: /^(interests|additional interests|hobbies)( and interests)?$/, name: "Interests", confidence: 0.85 },
  { regex: /^languages( spoken)?$/, name: "Languages", confidence: 0.9 },
  { regex: /^(activities|extracurricular( activities)?|community (involvement|service|activities))$/, name: "Activities", confidence: 0.85 },
  { regex: /^(additional information|references|other information|other)$/, name: "References", confidence: 0.6 },
];

/**
 * Try to interpret a single resume line as a section header.
 * Returns the canonical section name + confidence, or null.
 */
function matchHeader(line: string): { name: string; confidence: number } | null {
  let s = line.trim();
  if (!s || s.length > 80) return null;
  if (/^[-•·*▪◦>+]\s+\S/.test(s)) return null; // bulleted content, not a header
  s = s.replace(/[\u2500\u2501\u2502\u250C\u2510\u2514\u2518\u251C\u2524\u252C\u2534\u253C—―﹘﹣]+/g, " ");
  s = s.replace(/-{2,}|={2,}|_{2,}/g, " ");
  s = s.replace(/[:：]+\s*$/, "").trim();
  if (!s) return null;
  if (s.split(/\s+/).length > 6) return null;

  let lower = s.toLowerCase().replace(/\s+/g, " ").replace(/\.+$/, "").trim();
  // strip trailing parenthetical or year range ("Experience (2018 - 2021)")
  lower = lower
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*(19|20)\d{2}\s*[-–—to]+\s*((19|20)\d{2}|present)\s*$/, "")
    .trim();

  for (const rule of SECTION_RULES) {
    if (rule.regex.test(lower)) {
      let confidence = rule.confidence;
      if (line === line.toUpperCase() && /[A-Z]{3}/.test(line)) {
        confidence = Math.min(1, confidence + 0.05);
      }
      return { name: rule.name, confidence: Math.round(confidence * 100) / 100 };
    }
  }
  return null;
}

/**
 * Detect resume sections. If a document has no recognizable headers,
 * returns [] (the caller treats that as "no clear structure").
 */
export function detectSections(resumeText: string): DetectedSection[] {
  if (!resumeText) return [];
  const lines = resumeText.split(/\r?\n/);

  interface Candidate {
    lineIndex: number;
    name: string;
    confidence: number;
  }
  const candidates: Candidate[] = [];
  lines.forEach((line, index) => {
    const match = matchHeader(line);
    if (match) candidates.push({ lineIndex: index, ...match });
  });

  if (candidates.length === 0) return [];

  // A header must be followed by content (not just the end of the file).
  const withContent = candidates.filter((c) =>
    lines.slice(c.lineIndex + 1).some((l) => l.trim().length > 0)
  );
  if (withContent.length === 0) return [];

  const byName = new Map<string, DetectedSection>();
  const order: string[] = [];
  for (let i = 0; i < withContent.length; i++) {
    const current = withContent[i];
    const next = withContent[i + 1];
    const endLine = next ? next.lineIndex : lines.length;
    let wordCount = 0;
    for (let l = current.lineIndex + 1; l < endLine; l++) {
      const text = lines[l].trim();
      if (!text) continue;
      wordCount += text.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
    }
    const existing = byName.get(current.name);
    if (existing) {
      existing.wordCount += wordCount;
      existing.confidence = Math.max(existing.confidence, current.confidence);
    } else {
      byName.set(current.name, {
        name: current.name,
        confidence: current.confidence,
        wordCount,
      });
      order.push(current.name);
    }
  }

  return order
    .map((name) => byName.get(name) as DetectedSection)
    .filter((section) => section.wordCount > 0 || section.confidence >= 0.9);
}

/**
 * Line indices belonging to any of the named sections (header line
 * through the line before the next header). Used to, e.g., exclude
 * Education date ranges from work-experience totals.
 */
export function sectionLines(resumeText: string, names: string[]): Set<number> {
  const set = new Set<number>();
  if (!resumeText) return set;
  const lines = resumeText.split(/\r?\n/);
  const candidates: Array<{ lineIndex: number; name: string }> = [];
  lines.forEach((line, index) => {
    const match = matchHeader(line);
    if (match) candidates.push({ lineIndex: index, name: match.name });
  });
  for (let i = 0; i < candidates.length; i++) {
    const current = candidates[i];
    if (!names.includes(current.name)) continue;
    const next = candidates[i + 1];
    const endLine = next ? next.lineIndex : lines.length;
    for (let l = current.lineIndex; l < endLine; l++) set.add(l);
  }
  return set;
}
