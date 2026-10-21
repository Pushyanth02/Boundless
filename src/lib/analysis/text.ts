/**
 * BOUNDLESS · offline NLP engine — text utilities
 * ─────────────────────────────────────────────────────────────────
 * Server-side only. Deterministic. No network calls.
 * All matching helpers are case-insensitive by default and operate on
 * whole words / whole phrases with careful boundary rules so that short
 * aliases like "js", "go" or "ai" only ever match as standalone tokens.
 */
import { WordTokenizer } from "natural/lib/natural/tokenizers/regexp_tokenizer";
import SentenceTokenizer from "natural/lib/natural/tokenizers/sentence_tokenizer";
import PorterStemmer from "natural/lib/natural/stemmers/porter_stemmer";

const wordTokenizer = new WordTokenizer();
const sentenceTokenizer = new SentenceTokenizer();

/* ── basic string helpers ─────────────────────────────────────── */

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalize unicode text for matching:
 * lowercase, unify dashes/quotes, collapse whitespace. Does NOT try to
 * unify spellings like "nextjs" vs "next.js" — the alias-aware matcher
 * handles variants on raw text instead.
 */
export function normalize(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFC")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .toLowerCase()
    .trim();
}

/**
 * Undo PDF line-break hyphenation: "hyphen-\nation" → "hyphenation".
 * Only joins when the next line starts with a lowercase letter (avoids
 * joining bullet/section lines that merely start with "-").
 */
export function dehyphenate(text: string): string {
  if (!text) return "";
  return text.replace(/([A-Za-z])-\s*\n\s*([a-z])/g, "$1$2");
}

export function titleCase(s: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .split(/(\s+)/)
    .map((part) =>
      /^\s+$/.test(part) || part === ""
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join("");
}

/* ── tokenization ────────────────────────────────────────────── */

/**
 * Lowercase word tokens (natural's WordTokenizer), with
 * punctuation-only tokens stripped.
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  const raw = wordTokenizer.tokenize(text);
  const out: string[] = [];
  for (const t of raw) {
    if (!t) continue;
    const token = t.toLowerCase();
    if (!/[a-z0-9]/.test(token)) continue; // strip punctuation-only tokens
    out.push(token);
  }
  return out;
}

/** Lowercase word n-gram strings. */
export function bigrams(text: string): string[] {
  const toks = tokenize(text);
  const out: string[] = [];
  for (let i = 0; i + 1 < toks.length; i++) out.push(`${toks[i]} ${toks[i + 1]}`);
  return out;
}

export function trigrams(text: string): string[] {
  const toks = tokenize(text);
  const out: string[] = [];
  for (let i = 0; i + 2 < toks.length; i++)
    out.push(`${toks[i]} ${toks[i + 1]} ${toks[i + 2]}`);
  return out;
}

/** Split text into sentences (trimmed, non-empty). */
export function sentences(text: string): string[] {
  if (!text) return [];
  try {
    return sentenceTokenizer
      .tokenize(text)
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) => s.length > 0);
  } catch {
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}

/* ── stemming ─────────────────────────────────────────────────── */

const stemCache = new Map<string, string>();

/** PorterStemmer stem of a single lowercase token. */
export function stem(token: string): string {
  if (!token) return "";
  const cached = stemCache.get(token);
  if (cached !== undefined) return cached;
  let result = "";
  try {
    result = PorterStemmer.stem(token).toLowerCase();
  } catch {
    result = token;
  }
  stemCache.set(token, result);
  return result;
}

/** Stem every word of a phrase and join with single spaces. */
export function stemPhrase(phrase: string): string {
  return tokenize(phrase)
    .map(stem)
    .join(" ");
}

/* ── stopwords ────────────────────────────────────────────────── */

/**
 * English stopwords + resume/JD filler words (~175). Skill words are
 * deliberately kept OUT of this list so they can still be scored.
 */
export const STOPWORDS: Set<string> = new Set<string>([
  // core English
  "a", "about", "above", "across", "after", "again", "against", "all", "also",
  "am", "an", "and", "any", "are", "as", "at", "be", "because", "been",
  "before", "being", "below", "between", "both", "but", "by", "can", "could",
  "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
  "further", "had", "has", "have", "having", "he", "her", "here", "hers",
  "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is",
  "it", "its", "itself", "just", "like", "me", "more", "most", "much", "my",
  "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only", "or",
  "other", "our", "ours", "ourselves", "out", "over", "own", "same", "she",
  "should", "so", "some", "such", "than", "that", "the", "their", "theirs",
  "them", "themselves", "then", "there", "these", "they", "this", "those",
  "through", "to", "too", "under", "until", "up", "very", "was", "we", "were",
  "what", "when", "where", "which", "while", "who", "whom", "why", "will",
  "with", "would", "you", "your", "yours", "yourself", "yourselves",
  // contraction fragments
  "s", "t", "d", "ll", "re", "ve", "m",
  // resume / JD filler
  "responsible", "responsibilities", "requirement", "requirements",
  "required", "require", "preference", "preferences", "preferred", "nice",
  "bonus", "plus", "seeking", "looking", "hiring", "join", "joined",
  "opportunity", "opportunities", "position", "positions", "role", "roles",
  "candidate", "candidates", "company", "companies", "team", "teams", "work",
  "working", "works", "worked", "include", "includes", "including", "various",
  "strong", "excellent", "good", "great", "ability", "abilities", "skill",
  "skills", "experience", "experiences", "experienced", "expertise", "year",
  "years", "knowledge", "familiarity", "familiar", "proficient",
  "proficiency", "comfortable", "comfort", "new", "use", "used", "using",
  "uses", "help", "helps", "helping", "need", "needs", "needed", "want",
  "wants", "must", "well", "via", "within", "upon", "etc", "e", "g",
]);

export function isStopword(token: string): boolean {
  return STOPWORDS.has(token);
}

/* ── occurrence counting (whole-word / whole-phrase) ──────────── */

export interface CountOptions {
  /** Match case-sensitively (used for ambiguous aliases like "Go", "R"). */
  caseSensitive?: boolean;
}

/**
 * All indices where `phrase` occurs in `text` as whole words.
 *
 * Boundary rules (case-insensitive, on lowercased text):
 *  - length ≥ 4 aliases: not flanked by letters/digits.
 *  - length ≤ 3 aliases (js, aws, ai, ml, gcp …): additionally not
 *    preceded by "." "+" "#" "&" so "react.js" never matches "js".
 *  - single characters: also not followed by "." or "-" (avoids
 *    middle initials like "John R. Smith" matching the R language).
 *
 * Case-sensitive mode (TitleCase/UPPER aliases like "Go"/"GO") uses the
 * same idea against the original casing.
 */
export function findOccurrences(
  text: string,
  phrase: string,
  opts?: CountOptions
): number[] {
  const needle = phrase.trim();
  if (!text || !needle) return [];
  const caseSensitive = opts?.caseSensitive === true;

  let source: string;
  let pattern: string;

  if (caseSensitive) {
    source = text;
    const esc = escapeRegExp(needle);
    const pre = "(?<![A-Za-z0-9.+#&])";
    const post =
      needle.length === 1 ? "(?![A-Za-z0-9&#.+-])" : "(?![A-Za-z0-9&#.])";
    pattern = `${pre}${esc}${post}`;
  } else {
    source = text.toLowerCase();
    const esc = escapeRegExp(needle.toLowerCase());
    let pre: string;
    let post: string;
    if (needle.length === 1) {
      pre = "(?<![a-z0-9.+#&])";
      post = "(?![a-z0-9&#.-])";
    } else if (needle.length <= 3) {
      pre = "(?<![a-z0-9.+#&])";
      post = "(?![a-z0-9&#])";
    } else {
      pre = "(?<![a-z0-9])";
      post = "(?![a-z0-9])";
    }
    pattern = `${pre}${esc}${post}`;
  }

  const re = new RegExp(pattern, "g");
  const indices: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    indices.push(m.index);
    if (m.index === re.lastIndex) re.lastIndex += 1; // zero-width safety
  }
  return indices;
}

/** Count whole-word / whole-phrase occurrences (case-insensitive). */
export function countOccurrences(
  text: string,
  phrase: string,
  opts?: CountOptions
): number {
  return findOccurrences(text, phrase, opts).length;
}
