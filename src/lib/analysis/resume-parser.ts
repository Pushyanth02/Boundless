/**
 * BOUNDLESS · offline NLP engine — resume structure parsing
 * ─────────────────────────────────────────────────────────────────
 * Extracts a CandidateProfile from raw (already text-extracted) resume
 * text: name, contacts, links, location, total years of experience
 * (from date ranges), highest degree, section map and quantified
 * achievement hits. All heuristics, fully deterministic.
 */
import type { CandidateProfile } from "./types";
import { detectSections, sectionLines } from "./sections";
import { tokenize } from "./text";

/* ── degree detection (shared with scoring.ts for the JD side) ── */

export interface DegreeBand {
  label: string;
  band: number; // 1 associate · 2 bachelor · 3 master · 4 phd
}

const PHD_RE = /\bph\.?\s?d\b|\bphd\b|doctorate|doctoral/i;
const MASTER_RE =
  /\bmaster'?s?(?:\s+degree)?\b|\bmba\b|\bm\.s\.|\bm\.sc\.|\bmsc\b|\bm\.eng\.|\bm\.phil\./i;
const MASTER_CS_RE = /\bM\.?S\.?c?\b(?!\s*(?:Office|Word|Excel|Teams|SQL|DOS|Windows|Access))/;
const BACHELOR_RE =
  /\bbachelor'?s?(?:\s+degree)?\b|\bbtech\b|\bb\.tech\b|\bb\.?sc\b|\bb\.?com\b|\bb\.eng\b|\bb\.arch\b|\bb\.s\./i;
const BACHELOR_CS_RE =
  /\bB\.?S\.?c?\b(?!\s*(?:Office|Word|Excel|Teams|SQL|DOS|Windows|Access))|\bB\.?A\b(?=\s+(?:in|degree))|\bB\.E\./;
const ASSOCIATE_RE = /associate'?s?\s+degree|\bassociate degree\b|\ba\.a\.s\.?\b|\ba\.s\./i;

/** Highest degree found in a text, or null when nothing credible matches. */
export function findDegreeBand(text: string): DegreeBand | null {
  if (!text) return null;
  if (PHD_RE.test(text)) return { label: "PhD", band: 4 };
  if (MASTER_RE.test(text) || MASTER_CS_RE.test(text))
    return { label: "Master's", band: 3 };
  if (BACHELOR_RE.test(text) || BACHELOR_CS_RE.test(text))
    return { label: "Bachelor's", band: 2 };
  if (ASSOCIATE_RE.test(text)) return { label: "Associate's", band: 1 };
  return null;
}

/* ── experience ranges ────────────────────────────────────────── */

export interface ExperienceRanges {
  /** Total non-overlapping years (merged intervals), capped at 45. */
  total: number;
  /** Merged [start, end] intervals in decimal years. */
  ranges: Array<[number, number]>;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** One combined date matcher: "Jun 2020", "06/2020", "2020" (word-bounded). */
const DATE_RE =
  /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(19[89]\d|20[0-2]\d)|((?:0?[1-9]|1[0-2])\/(19[89]\d|20[0-2]\d))|\b(19[89]\d|20[0-2]\d)\b/gi;

interface DatePoint {
  value: number; // decimal year (Jan 2020 → 2020.0; bare 2020 → 2020.5)
}

function toDecimalYear(year: number, monthIndex: number | null): number {
  return monthIndex === null ? year + 0.5 : year + monthIndex / 12;
}

function datePointsInLine(line: string): DatePoint[] {
  const points: DatePoint[] = [];
  DATE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DATE_RE.exec(line)) !== null) {
    if (m[1] !== undefined && m[2] !== undefined) {
      const month = MONTHS[m[1].toLowerCase()] ?? 0;
      points.push({ value: toDecimalYear(parseInt(m[2], 10), month) });
    } else if (m[4] !== undefined) {
      const month = parseInt(m[3], 10) - 1;
      points.push({ value: toDecimalYear(parseInt(m[4], 10), month) });
    } else if (m[5] !== undefined) {
      points.push({ value: toDecimalYear(parseInt(m[5], 10), null) });
    }
  }
  return points;
}

/** Lines that look like education credentials (degree words + dates). */
const DEGREE_LINE_RE =
  /\b(b\.?s\.?c?|m\.?s\.?c?|ph\.?d|mba|bachelors?|masters?|doctorate|university|college|institute of technology|polytechnic)\b/i;

/**
 * Build employment-ish date ranges from a resume. Pairs dates that
 * share a line (or sit on adjacent lines), understands "Present",
 * merges overlapping intervals, and ignores pre-1970 / future noise.
 * Lines inside Education sections — or credential-looking lines with
 * dates — are excluded so degree timelines don't inflate totals.
 */
export function extractExperienceRanges(text: string, excludeLines?: Set<number>): ExperienceRanges {
  const empty: ExperienceRanges = { total: 0, ranges: [] };
  if (!text) return empty;

  const lines = text.split(/\r?\n/);
  const now = new Date();
  const nowValue = now.getFullYear() + Math.max(0, now.getMonth()) / 12;
  const rawRanges: Array<[number, number]> = [];

  interface Pending {
    value: number;
    lineIndex: number;
  }
  let pending: Pending | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (excludeLines?.has(i)) continue; // Education section content
    const points = datePointsInLine(line);
    if (points.length > 0 && DEGREE_LINE_RE.test(line)) continue; // credential line
    const hasPresent = /\b(present|current(ly)?|now|today)\b/i.test(line);

    if (points.length === 0) {
      // A lone "Present" line can close a pending single date.
      if (hasPresent && pending && i - pending.lineIndex <= 2) {
        rawRanges.push([pending.value, nowValue]);
        pending = null;
      }
      continue;
    }

    if (points.length === 1) {
      if (pending && i - pending.lineIndex <= 2) {
        const a = Math.min(pending.value, points[0].value);
        const b = Math.max(pending.value, points[0].value);
        rawRanges.push([a, b]);
        pending = null;
      } else {
        pending = { value: points[0].value, lineIndex: i };
        if (hasPresent) {
          rawRanges.push([points[0].value, nowValue]);
          pending = null;
        }
      }
      continue;
    }

    // Multiple dates on one line: pair them up left-to-right.
    for (let p = 0; p + 1 < points.length; p += 2) {
      const a = Math.min(points[p].value, points[p + 1].value);
      const b = Math.max(points[p].value, points[p + 1].value);
      rawRanges.push([a, b]);
    }
    if (points.length % 2 === 1) {
      const last = points[points.length - 1].value;
      if (hasPresent) {
        rawRanges.push([last, nowValue]);
      } else {
        pending = { value: last, lineIndex: i };
      }
    }
  }

  // Filter noise, merge overlaps, sum.
  const cleaned = rawRanges
    .filter(([a, b]) => b > a && a >= 1970 && a <= nowValue + 1 && b - a <= 30)
    .sort((r1, r2) => r1[0] - r2[0]);

  const merged: Array<[number, number]> = [];
  for (const range of cleaned) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([range[0], range[1]]);
    }
  }

  const total = merged.reduce((sum, [a, b]) => sum + (b - a), 0);
  return { total: Math.min(45, total), ranges: merged };
}

/* ── contact heuristics ───────────────────────────────────────── */

const EMAIL_RE = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
const PHONE_CANDIDATE_RE = /\+?\d[\d\s().-]{7,}\d/g;
const NAME_BLOCKLIST_RE =
  /(resume|curriculum|vitae|experience|education|skills?|summary|objective|projects|certification|award|publication|engineer|developer|manager|analyst|designer|scientist|architect|consultant|specialist|administrator|recruiter|director|intern|associate|marketer|strategist|accounting|nurse|teacher)/i;

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"')]+/gi;
const DOMAIN_LINK_RE =
  /\b(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|medium\.com|dev\.to|about\.me|notion\.site|vercel\.app|netlify\.app)\/[^\s<>"')]+/gi;

function digitCount(s: string): number {
  return (s.match(/\d/g) ?? []).length;
}

function extractPhone(text: string): string | null {
  const matches = text.match(PHONE_CANDIDATE_RE) ?? [];
  for (const raw of matches) {
    const candidate = raw.trim();
    const digits = digitCount(candidate);
    if (digits < 10 || digits > 15) continue;
    // reject pure year ranges / year pairs ("2019 - 2024")
    if (/^\d{4}\s*[-–—~to]+\s*\d{4}$/.test(candidate)) continue;
    let out = candidate.replace(/\s{2,}/g, " ");
    // PDF extraction often drops the opening "(" of "(415) 555-0192";
    // re-balance so the display isn't "415) 555-0192".
    if (out.includes(")") && !out.includes("(")) out = `(${out}`;
    return out;
  }
  return null;
}

function extractLinks(text: string): string[] {
  const found = new Set<string>();
  const push = (url: string) => {
    let u = url.trim().replace(/[.,;:)]+$/, "");
    if (!u) return;
    const key = u.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
    if (!found.has(key)) found.add(key);
  };
  for (const re of [URL_RE, DOMAIN_LINK_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) push(m[0]);
  }
  return Array.from(found).slice(0, 6);
}

/** Words that mark ALL-CAPS section headers, never names. */
const HEADER_WORD_RE =
  /(experience|education|skills?|summary|objective|projects?|certification|award|publication|volunteer|interests?|languages?|activities|references|profile|about|contact|qualifications)/i;

function titleCaseWords(line: string): string {
  return line
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function extractName(lines: string[]): string | null {
  const nonEmpty = lines.filter((l) => l.trim().length > 0).slice(0, 5);
  for (const line of nonEmpty) {
    const trimmed = line.trim();
    if (trimmed.length > 48) continue;
    if (/@|https?:|www\.|linkedin|github/i.test(trimmed)) continue;
    if (/\d/.test(trimmed)) continue;
    if (NAME_BLOCKLIST_RE.test(trimmed)) continue;
    let words = trimmed.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    let candidate = trimmed;
    if (trimmed === trimmed.toUpperCase() && /[A-Z]{3}/.test(trimmed)) {
      // ALL-CAPS header lines are never names; but an ALL-CAPS personal
      // name ("JORDAN A. RIVERA") is common — title-case it and accept.
      if (HEADER_WORD_RE.test(trimmed)) continue;
      candidate = titleCaseWords(trimmed);
      words = candidate.split(/\s+/);
    }
    if (/^[A-Z]{2}$/.test(words[words.length - 1])) continue; // "City ST"
    const capitalized = words.every((w) => /^[A-Z][a-zA-Z'.-]*$/.test(w));
    if (!capitalized) continue;
    return candidate;
  }
  return null;
}

function extractLocation(lines: string[]): string | null {
  const head = lines.filter((l) => l.trim().length > 0).slice(0, 10);
  for (const line of head) {
    const m = line.match(
      /\b([A-Z][a-zA-Z.'-]+(?:\s[A-Z][a-zA-Z.'-]+)?),\s*(?:([A-Z]{2})\b|([A-Z][a-zA-Z]{2,}))/
    );
    if (m) return m[0].replace(/\s{2,}/g, " ");
  }
  for (const line of head) {
    if (/\bremote\b/i.test(line)) return "Remote";
  }
  return null;
}

/* ── quantified achievements ──────────────────────────────────── */

const QUANT_PATTERNS: RegExp[] = [
  /\d+(?:\.\d+)?\s*%/gi, // 40% · 23 %
  /\$\s*\d[\d,.]*/g, // $120K · $3M · $1.5 billion handled below
  /\b\d+(?:\.\d+)?\s*(?:k|m|b|bn|mm)\b/gi, // 120K · 2M · 3 billion-ish
  /\b\d+(?:\.\d+)?x\b/gi, // 10x · 3x
  /\b\d+(?:\.\d+)?\s*(?:million|billion|thousand)s?\b/gi,
  /\b\d+\s+(?:users|customers|clients|hours|projects|people|reports|requests|transactions|students|engineers|teams|stores|accounts|applications|apps|sites|models|experiments|dashboards|campaigns|tickets|orders)\b/gi,
  /\b\d[\d,.]*\b/g, // remaining significant numbers (years filtered out)
];

/**
 * Count DISTINCT quantified achievements (numbers, %, $, K/M/B suffixes,
 * "10x", counts attached to nouns). Standalone 19xx/20xx years are
 * excluded — those are dates, not achievements.
 */
export function countQuantifiedHits(text: string): number {
  if (!text) return 0;
  const spans: Array<[number, number]> = [];
  const distinct = new Set<string>();
  const overlaps = (start: number, end: number): boolean =>
    spans.some(([s, e]) => start < e && end > s);

  for (const re of QUANT_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0];
      const start = m.index;
      const end = start + raw.length;
      if (overlaps(start, end)) continue;
      const clean = raw.trim().toLowerCase();
      // skip plain 4-digit years (dates), but keep "2021 users"
      if (/^(19|20)\d{2}$/.test(clean.replace(/[^\d]/g, "")) && /^\d{4}$/.test(clean)) continue;
      if (/^\d$/.test(clean)) continue; // single digits are noise
      spans.push([start, end]);
      distinct.add(clean);
    }
  }
  return distinct.size;
}

/* ── main entry ───────────────────────────────────────────────── */

const EMPTY_CANDIDATE: CandidateProfile = {
  name: null,
  email: null,
  phone: null,
  location: null,
  links: [],
  yearsExperience: null,
  highestDegree: null,
  wordCount: 0,
  sections: [],
  quantifiedHits: 0,
};

export function parseResume(resumeText: string): CandidateProfile {
  const text = resumeText ?? "";
  if (!text.trim()) return { ...EMPTY_CANDIDATE };

  const lines = text.split(/\r?\n/);
  // Education-section lines (and degree-credential lines) never count
  // toward work experience — pass them as exclusions.
  let educationLines: Set<number> | undefined;
  try {
    const ranges = sectionLines(text, ["Education"]);
    if (ranges.size > 0) educationLines = ranges;
  } catch {
    educationLines = undefined;
  }
  const experience = extractExperienceRanges(text, educationLines);
  const years =
    experience.total > 0
      ? Math.min(45, Math.round(experience.total * 10) / 10)
      : null;

  return {
    name: extractName(lines),
    email: text.match(EMAIL_RE)?.[0] ?? null,
    phone: extractPhone(text),
    location: extractLocation(lines),
    links: extractLinks(text),
    yearsExperience: years,
    highestDegree: findDegreeBand(text)?.label ?? null,
    wordCount: tokenize(text).length,
    sections: detectSections(text),
    quantifiedHits: countQuantifiedHits(text),
  };
}

export { EMPTY_CANDIDATE };
