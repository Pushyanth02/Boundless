/**
 * BOUNDLESS · offline NLP engine — job description parsing
 * ─────────────────────────────────────────────────────────────────
 * Turns raw JD text into a JobProfile: role title, seniority, required
 * vs preferred skills (taxonomy-aware), and responsibility bullets.
 *
 * Section detection understands both layouts:
 *  - line headers ("Requirements" alone on a line), and
 *  - inline markers ("Responsibilities: …", "Nice to have: …").
 *
 * All heuristics, fully deterministic and defensive — a malformed JD
 * yields empty arrays / nulls, never a throw.
 */
import { aliasIndices } from "./matcher";
import type { SkillEntry } from "./taxonomy";
import { ALL_SKILL_ENTRIES } from "./taxonomy";
import { escapeRegExp, sentences, tokenize } from "./text";
import type { JobProfile, SkillPriority, SkillRef } from "./types";

/* ── section markers ──────────────────────────────────────────── */

type SpanKind = "required" | "preferred" | "responsibilities" | "about";

interface Marker {
  kind: SpanKind;
  start: number;
  contentStart: number;
}

interface Span {
  kind: SpanKind;
  start: number; // content start (after the marker)
  end: number;
}

const SECTION_PHRASES: Record<SpanKind, string[]> = {
  preferred: [
    "nice to have", "nice-to-have", "nice to haves", "good to have",
    "preferred", "preferred qualifications", "preferred skills",
    "preferred experience", "bonus", "bonus points", "bonus skills",
    "pluses", "plus", "desirable", "extras",
  ],
  required: [
    "requirements", "requirement", "qualifications",
    "minimum qualifications", "what you'll need", "what you will need",
    "must-haves", "must haves", "must have", "must-have",
    "who you are", "you have", "what we're looking for",
    "what we are looking for", "about you", "you bring",
    "required skills", "required experience", "required qualifications",
    "your profile", "your qualifications",
  ],
  responsibilities: [
    "responsibilities", "key responsibilities", "what you'll do",
    "what you will do", "what you'll be doing", "your responsibilities",
    "duties", "your impact", "what you'll work on", "day to day",
  ],
  about: [
    "about the role", "about the team", "about the company",
    "about the position", "about the job", "about us", "our company",
  ],
};

const LINE_HEADER_RES: Array<{ kind: SpanKind; re: RegExp }> = [
  {
    kind: "preferred",
    re: /^(nice to have|nice-to-have|good to have|preferred|bonus|pluses|plus|desirable|extras)(\s+(qualifications|skills|experience|points))?$/,
  },
  {
    kind: "required",
    re: /^(requirements?|qualifications?|minimum qualifications|must[- ]haves?|who you are|you have|about you|what you.{0,3}ll need|what we.{0,3}(re|are) looking for|your (profile|qualifications))(\s+(skills|experience|qualifications))?$/,
  },
  {
    kind: "responsibilities",
    re: /^(responsibilities|key responsibilities|duties|your impact|your responsibilities|day to day|what you.{0,3}ll (do|be doing))$/,
  },
  {
    kind: "about",
    re: /^about (the (role|team|company|position|job)|us)$/,
  },
];

/** "what you'll need" → `what\s+you['’]?\s*ll\s+need`-friendly source. */
function phraseToRegexSource(phrase: string): string {
  return escapeRegExp(phrase)
    .replace(/ /g, "\\s+")
    .replace(/'/g, "['\\u2019]?");
}

function cleanHeaderLine(line: string): string {
  return line
    .replace(/^\s*#{0,4}\s*/, "")
    .replace(/^\s*[-•·*▪◦>+]\s*/, "")
    .replace(/[\uFF1A:\-–—]+\s*$/, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Find all section markers: inline "Phrase:" occurrences plus whole-line
 * headers. Returns sorted, de-duplicated spans between markers.
 */
function detectSpans(text: string, lines: string[]): Span[] {
  const markers: Marker[] = [];

  for (const kind of Object.keys(SECTION_PHRASES) as SpanKind[]) {
    for (const phrase of SECTION_PHRASES[kind]) {
      const re = new RegExp(
        `(?<![A-Za-z0-9])${phraseToRegexSource(phrase)}\\s*[:\\uFF1A]`,
        "gi"
      );
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        markers.push({ kind, start: m.index, contentStart: m.index + m[0].length });
        if (m.index === re.lastIndex) re.lastIndex += 1;
      }
    }
  }

  let offset = 0;
  for (const line of lines) {
    const lineStart = offset;
    offset += line.length + 1; // + newline
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 60) continue;
    const cleaned = cleanHeaderLine(trimmed);
    if (!cleaned) continue;
    for (const { kind, re } of LINE_HEADER_RES) {
      if (re.test(cleaned)) {
        markers.push({ kind, start: lineStart, contentStart: lineStart + line.length + 1 });
        break;
      }
    }
  }

  markers.sort((a, b) => a.start - b.start || a.contentStart - b.contentStart);
  const dedup: Marker[] = [];
  for (const marker of markers) {
    const prev = dedup[dedup.length - 1];
    if (prev && marker.start < prev.contentStart) continue; // nested duplicate
    dedup.push(marker);
  }

  const spans: Span[] = [];
  for (let i = 0; i < dedup.length; i++) {
    const end = i + 1 < dedup.length ? dedup[i + 1].start : text.length;
    if (end > dedup[i].contentStart) {
      spans.push({ kind: dedup[i].kind, start: dedup[i].contentStart, end });
    }
  }
  return spans;
}

function isPreferredPosition(pos: number, preferredSpans: Span[]): boolean {
  return preferredSpans.some((span) => pos >= span.start && pos < span.end);
}

/* ── title extraction ─────────────────────────────────────────── */

const TITLE_FILLER_RE =
  /^(we are|we're|we is|our company|our team|about|apply|job description|position description|description|overview|summary|the company|now hiring|we're hiring|we are hiring|get to know|meet|join|welcome|looking for|seeking|hiring|company|opportunity|salary|compensation|benefits|perks|who we are|what you|you will|you'll|requirements?|responsibilities|qualifications?|nice to have|preferred|bonus|location|remote|hybrid|onsite|full[- ]time|part[- ]time)\b/i;

/** Section-marker words appearing anywhere inside a first-line candidate. */
const TITLE_MIDSTRING_RE =
  /\b(requirements?|responsibilities|qualifications?|nice[- ]to[- ]have|what you|who you are|we are|duties|preferred)\b|skills?\s*:/i;

const COMPANY_SUFFIX_RE = /[\s,]*\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|gmbh|plc)\b\.?$/i;

function cleanTitleCandidate(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  s = s.replace(/^#{1,4}\s*/, "");
  s = s.replace(/^\*\*/, "").replace(/\*\*$/, "");
  s = s.replace(/^["'\u201C\u201D]+/, "").replace(/["'\u201C\u201D]+$/, "");
  s = s.replace(/^about the (role|position|job|team)\s*[:\-–—]\s*/i, "");
  if (s.includes("|")) s = s.split("|")[0].trim(); // "Senior Dev | Acme" → "Senior Dev"
  s = s.replace(COMPANY_SUFFIX_RE, "");
  s = s.replace(/[\s.\u00B7,;:\-–—•|]+$/, "").trim();
  if (!s) return null;

  const words = s.split(/\s+/);
  if (words.length < 2 || words.length > 12) return null;
  if (s.length > 90) return null;
  if (/@|https?:|www\./i.test(s)) return null;
  if (/\b(jobs?|careers?)\b/i.test(s)) return null;
  if (/\d{3,}/.test(s)) return null;
  if (TITLE_FILLER_RE.test(s)) return null;
  if (TITLE_MIDSTRING_RE.test(s)) return null; // mid-line section markers
  if (/\.\s+\S/.test(s)) return null; // multiple sentences — not a title line
  if (/[\u0000-\u0008\u000E-\u001F]/.test(s)) return null; // control characters
  if ((s.match(/[A-Za-z]/g) ?? []).length < 3) return null; // not enough letters
  return s;
}

function extractTitle(lines: string[], text: string): string | null {
  const nonEmpty = lines.map((l) => l.trim()).filter((l) => l.length > 0).slice(0, 25);

  // 1. explicit "Job Title:" style lines
  for (const line of nonEmpty) {
    const m = line.match(/^(?:job\s+title|position|role|title)\s*[:\-–—]\s*(.+)$/i);
    if (m) {
      const candidate = cleanTitleCandidate(m[1]);
      if (candidate) return candidate;
    }
  }

  // 2. markdown headings
  for (const line of nonEmpty) {
    if (/^#{1,4}\s+\S/.test(line)) {
      const candidate = cleanTitleCandidate(line);
      if (candidate) return candidate;
    }
  }

  // 3. "We are seeking a Senior X to join …" sentence pattern
  const head = text.slice(0, 600);
  const seekRe =
    /\b(?:seeking|hiring|looking for|searching for|recruiting)\s+(?:an?\s+|our\s+(?:next|new)\s+|the\s+)?([A-Z][^.\n!?;]{2,70}?)(?=\s+(?:to|who|that|which|with|for|at|in|where|reporting)\b|[.\n!?;]|$)/;
  const sm = head.match(seekRe);
  if (sm) {
    let candidate = cleanTitleCandidate(sm[1]);
    if (!candidate) {
      candidate = cleanTitleCandidate(sm[1].split(/\s+/).slice(0, 6).join(" "));
    }
    if (candidate) return candidate;
  }

  // 4. first non-empty line heuristic (full line, then its first sentence)
  for (const line of nonEmpty.slice(0, 3)) {
    const candidate = cleanTitleCandidate(line);
    if (candidate) return candidate;
    const firstSentence = line.split(/(?<=[.!?])\s+/)[0] ?? "";
    if (firstSentence && firstSentence !== line) {
      const fromSentence = cleanTitleCandidate(firstSentence);
      if (fromSentence) return fromSentence;
    }
  }
  return null;
}

/* ── seniority ───────────────────────────────────────────────── */

const SENIORITY_RULES: Array<{ label: string; re: RegExp }> = [
  { label: "Intern", re: /\bintern(ship)?s?\b/i },
  { label: "Entry-level", re: /\bentry[\s-]level\b/i },
  { label: "Junior", re: /\bjunior\b/i },
  { label: "Mid-level", re: /\bmid[\s-]level\b|\bintermediate\b/i },
  { label: "Senior", re: /\bsenior\b/i },
  { label: "Staff", re: /\bstaff\b/i },
  { label: "Principal", re: /\bprincipal\b/i },
  { label: "Lead", re: /\blead\b/i },
  { label: "Manager", re: /\bmanager\b|\bmanagement\b/i },
  { label: "Director", re: /\bdirector\b/i },
  { label: "Head of", re: /\bhead of\b/i },
  { label: "VP", re: /\bvp\b|\bvice president\b/i },
  { label: "Chief", re: /\bchief\b/i },
];

/** Earliest-occurring seniority signal wins (the title usually leads). */
function detectSeniority(text: string, title: string | null): string | null {
  const source = title ? `${title}\n${text}` : text;
  let best: { label: string; index: number } | null = null;
  for (const rule of SENIORITY_RULES) {
    const m = rule.re.exec(source);
    if (m && (!best || m.index < best.index)) {
      best = { label: rule.label, index: m.index };
    }
  }
  return best ? best.label : null;
}

/* ── responsibilities ─────────────────────────────────────────── */

function cleanResponsibilityItem(segment: string): string | null {
  let s = segment.replace(/\s+/g, " ").trim();
  s = s.replace(/^[-•·*▪◦>+\u2022]+\s*/, "");
  s = s.replace(/^\d+[.)]\s*/, "");
  s = s.replace(/^(and|also|then)\s+/i, "");
  s = s.replace(/[\s,;:]+$/, "").trim();
  if (s.length < 10) return null;
  return s.length > 220 ? `${s.slice(0, 219)}…` : s;
}

function extractResponsibilities(text: string, spans: Span[]): string[] {
  const items: string[] = [];
  for (const span of spans) {
    if (span.kind !== "responsibilities") continue;
    const chunk = text.slice(span.start, span.end);
    for (const segment of chunk.split(/\n|;/)) {
      const cleaned = cleanResponsibilityItem(segment);
      if (!cleaned) continue;
      if (cleaned.length > 220) {
        for (const sentence of sentences(cleaned)) {
          const s = cleanResponsibilityItem(sentence);
          if (s) items.push(s);
        }
      } else {
        items.push(cleaned);
      }
    }
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= 8) break;
  }
  return out;
}

/* ── skills scan ──────────────────────────────────────────────── */

interface ScannedSkill {
  entry: SkillEntry;
  mentions: number;
  priority: SkillPriority;
}

function scanSkills(text: string, spans: Span[]): ScannedSkill[] {
  const preferredSpans = spans.filter((span) => span.kind === "preferred");
  const scanned: ScannedSkill[] = [];
  for (const entry of ALL_SKILL_ENTRIES) {
    const positions = new Set<number>();
    for (const alias of entry.aliases) {
      for (const i of aliasIndices(text, alias)) positions.add(i);
    }
    if (positions.size === 0) continue;
    let preferredOnly = true;
    for (const pos of positions) {
      if (!isPreferredPosition(pos, preferredSpans)) {
        preferredOnly = false;
        break;
      }
    }
    scanned.push({
      entry,
      mentions: positions.size,
      priority: preferredOnly ? "preferred" : "required",
    });
  }
  scanned.sort(
    (a, b) =>
      b.mentions - a.mentions || a.entry.name.localeCompare(b.entry.name)
  );
  return scanned;
}

/* ── main entry ───────────────────────────────────────────────── */

function emptyJob(): JobProfile {
  return {
    title: null,
    seniority: null,
    requiredSkills: [],
    preferredSkills: [],
    allSkills: [],
    responsibilities: [],
    wordCount: 0,
  };
}

export function parseJob(jdText: string): JobProfile {
  const text = jdText ?? "";
  if (!text.trim()) return emptyJob();
  try {
    const lines = text.split(/\r?\n/);
    const title = extractTitle(lines, text);
    const seniority = detectSeniority(text, title);
    const spans = detectSpans(text, lines);
    const responsibilities = extractResponsibilities(text, spans);

    const scanned = scanSkills(text, spans);
    const requiredSkills: SkillRef[] = [];
    const preferredSkills: SkillRef[] = [];
    const allSkills: SkillRef[] = [];
    for (const skill of scanned) {
      const ref: SkillRef = {
        name: skill.entry.name,
        category: skill.entry.category,
        priority: skill.priority,
        mentions: skill.mentions,
      };
      allSkills.push(ref);
      if (skill.priority === "required") requiredSkills.push(ref);
      else preferredSkills.push(ref);
    }

    return {
      title,
      seniority,
      requiredSkills,
      preferredSkills,
      allSkills,
      responsibilities,
      wordCount: tokenize(text).length,
    };
  } catch {
    return emptyJob();
  }
}

export { emptyJob };
