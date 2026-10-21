/**
 * BOUNDLESS · offline NLP engine — TF-IDF salient terms + cosine similarity
 * ─────────────────────────────────────────────────────────────────
 * salientTerms(): which terms the JD emphasizes (natural's TfIdf over a
 * two-document corpus [JD, resume], boosted by raw JD frequency), with
 * taxonomy skill aliases excluded — skills get their own panel.
 *
 * cosineSimilarity(): stem-level unigram+bigram cosine over the shared
 * vocabulary of resume and JD (stopwords removed).
 *
 * Server-side only. Deterministic.
 */
import TfIdf from "natural/lib/natural/tfidf/tfidf";
import { ALL_SKILL_ENTRIES } from "./taxonomy";
import {
  countOccurrences,
  dehyphenate,
  isStopword,
  normalize,
  stem,
  tokenize,
} from "./text";
import type { SalientTerm } from "./types";

/** Every taxonomy alias (any category) — these get their own panel. */
const SKILL_ALIAS_SET: Set<string> = (() => {
  const set = new Set<string>();
  for (const entry of ALL_SKILL_ENTRIES) {
    for (const alias of entry.aliases) set.add(alias.toLowerCase());
  }
  return set;
})();

/** Content tokens for TF-IDF: length ≥ 3, non-stopword, non-number. */
function contentTokens(text: string): string[] {
  return tokenize(dehyphenate(normalize(text))).filter(
    (t) => t.length >= 3 && !isStopword(t) && !/^\d+$/.test(t)
  );
}

/**
 * JD terms ranked by emphasis:
 *   score = tfidf weight in the JD × (1 + ln(1 + raw JD frequency))
 * normalized to 0–1 by the max, sorted descending, capped at `limit`.
 */
export function salientTerms(jdText: string, resumeText: string, limit = 18): SalientTerm[] {
  try {
    const jdTokens = contentTokens(jdText);
    if (jdTokens.length === 0) return [];

    const tfidf = new TfIdf();
    tfidf.addDocument(jdTokens); // document 0
    tfidf.addDocument(contentTokens(resumeText)); // document 1

    const scored: SalientTerm[] = [];
    for (const item of tfidf.listTerms(0)) {
      const term = item.term;
      if (term.length < 3) continue;
      if (isStopword(term)) continue;
      if (/^\d+$/.test(term)) continue;
      if (SKILL_ALIAS_SET.has(term)) continue;
      const score = item.tfidf * (1 + Math.log(1 + item.tf));
      if (score <= 0) continue;
      scored.push({ term, score });
    }

    scored.sort((a, b) => b.score - a.score || a.term.localeCompare(b.term));
    const max = scored[0]?.score ?? 0;
    return scored
      .slice(0, Math.max(1, limit))
      .map((t) => ({
        term: t.term,
        score: max > 0 ? Math.round((t.score / max) * 1000) / 1000 : 0,
      }));
  } catch {
    return [];
  }
}

/* ── salient-term presence in the resume ──────────────────────── */

export interface SalientPresence {
  present: SalientTerm[];
  absent: SalientTerm[];
  fraction: number;
  considered: number;
}

/**
 * Which of the top-N salient JD terms appear in the resume. A term
 * counts as present on an exact whole-word hit or when its Porter stem
 * equals a resume token stem ("improve" ↔ "improved").
 */
export function salientTermPresence(
  resumeText: string,
  terms: SalientTerm[],
  topN = 12
): SalientPresence {
  const top = terms.slice(0, Math.max(0, topN));
  if (top.length === 0) {
    return { present: [], absent: [], fraction: 0, considered: 0 };
  }
  const resumeStems = new Set(tokenize(dehyphenate(normalize(resumeText))).map(stem));
  const present: SalientTerm[] = [];
  const absent: SalientTerm[] = [];
  for (const term of top) {
    const found =
      countOccurrences(resumeText, term.term) > 0 || resumeStems.has(stem(term.term));
    if (found) present.push(term);
    else absent.push(term);
  }
  return {
    present,
    absent,
    fraction: present.length / top.length,
    considered: top.length,
  };
}

/* ── cosine similarity (stem unigrams + bigrams, shared vocab) ── */

function stemVectors(text: string): Map<string, number> {
  const vectors = new Map<string, number>();
  const tokens = tokenize(dehyphenate(normalize(text)).replace(/\d+/g, " ")).filter(
    (t) => t.length >= 2 && !isStopword(t)
  );
  const stems = tokens.map(stem);
  const bump = (key: string) => vectors.set(key, (vectors.get(key) ?? 0) + 1);
  for (const s of stems) bump(s);
  for (let i = 0; i + 1 < stems.length; i++) bump(`${stems[i]} ${stems[i + 1]}`);
  return vectors;
}

/**
 * Cosine similarity between resume and JD over their shared vocabulary
 * (stemmed unigrams + bigrams, stopwords and bare numbers removed).
 * Returns 0–1.
 */
export function cosineSimilarity(resumeText: string, jdText: string): number {
  try {
    const rv = stemVectors(resumeText);
    const jv = stemVectors(jdText);
    if (rv.size === 0 || jv.size === 0) return 0;

    let dot = 0;
    let rNorm = 0;
    let jNorm = 0;
    for (const [term, count] of rv) {
      const other = jv.get(term);
      if (other === undefined) continue;
      dot += count * other;
      rNorm += count * count;
      jNorm += other * other;
    }
    if (dot === 0) return 0;
    const denominator = Math.sqrt(rNorm) * Math.sqrt(jNorm);
    if (denominator <= 0) return 0;
    return Math.min(1, Math.max(0, dot / denominator));
  } catch {
    return 0;
  }
}
