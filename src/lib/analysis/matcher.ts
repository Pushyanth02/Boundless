/**
 * BOUNDLESS · offline NLP engine — skill matching (resume ↔ JD)
 * ─────────────────────────────────────────────────────────────────
 * For every skill the JD mentions (JobProfile.allSkills), count how
 * often the resume evidences it:
 *   1. exact whole-phrase, alias-aware, case-rules-aware matching;
 *   2. a fuzzy pass (Jaro-Winkler ≥ 0.92 on Porter stems, plus
 *      stemmed-phrase equality) to catch morphological variants such
 *      as "collaboration" vs "collaborative" or "optimization" vs
 *      "optimize".
 *
 * Server-side only. Deterministic. No network, no randomness.
 */
import JaroWinklerDistance from "natural/lib/natural/distance/jaro-winkler_distance";
import { CASE_SENSITIVE_ALIASES, findSkillEntry, getSkillAliases } from "./taxonomy";
import { findOccurrences, stem, tokenize } from "./text";
import type {
  JobProfile,
  MatchedSkill,
  MissingSkill,
  Priority,
  SkillRef,
  SkillsMatch,
} from "./types";

const JW_THRESHOLD = 0.92;

/* ── alias-aware occurrence counting ──────────────────────────── */

/**
 * TitleCase and ALL-CAPS forms of an ambiguous alias ("go" → "Go",
 * "GO"). These — and only these — count when the alias is on the
 * case-sensitive list (it is also a common English word).
 */
function caseVariantForms(alias: string): string[] {
  const forms = new Set<string>();
  forms.add(alias.toUpperCase());
  const words = alias.split(" ");
  forms.add(words.map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" "));
  return Array.from(forms);
}

/**
 * Character indices where `alias` occurs in `text` as a whole phrase,
 * respecting the taxonomy's case rules:
 *  - CASE_SENSITIVE_ALIASES only match in TitleCase or ALL-CAPS form;
 *  - everything else matches case-insensitively.
 */
export function aliasIndices(text: string, alias: string): number[] {
  const needle = alias.trim().toLowerCase();
  if (!text || !needle) return [];
  if (CASE_SENSITIVE_ALIASES.has(needle)) {
    const indices: number[] = [];
    for (const form of caseVariantForms(needle)) {
      for (const i of findOccurrences(text, form, { caseSensitive: true })) {
        indices.push(i);
      }
    }
    return indices;
  }
  return findOccurrences(text, needle);
}

/**
 * Union of occurrence positions across all aliases of a skill, so a
 * text span matched by two aliases of the same skill ("node" and
 * "node.js" inside "Node.js") counts once.
 */
export function skillMentionIndices(text: string, aliases: string[]): Set<number> {
  const positions = new Set<number>();
  for (const alias of aliases) {
    for (const i of aliasIndices(text, alias)) positions.add(i);
  }
  return positions;
}

/** Occurrence count for a skill (pretty name or canonical key). */
export function countSkillOccurrences(text: string, skill: string): number {
  if (!text || !skill) return 0;
  return skillMentionIndices(text, getSkillAliases(skill)).size;
}

/* ── fuzzy (stem-level) evidence pass ─────────────────────────── */

interface ResumeIndex {
  /** distinct Porter stems of the resume's tokens (for JW scanning) */
  stemSet: Set<string>;
  /** stemmed n-grams (n = 1..4) joined with single spaces */
  phraseSet: Set<string>;
}

function buildResumeIndex(resumeText: string): ResumeIndex {
  const stems: string[] = [];
  const stemSet = new Set<string>();
  for (const token of tokenize(resumeText)) {
    const s = stem(token);
    if (!s) continue;
    stems.push(s);
    stemSet.add(s);
  }
  const phraseSet = new Set<string>(stemSet);
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i + n <= stems.length; i++) {
      phraseSet.add(stems.slice(i, i + n).join(" "));
    }
  }
  return { stemSet, phraseSet };
}

/**
 * Whether `alias` is fuzzy-evidenced in the resume:
 *  - multi-word aliases: stemmed-phrase equality against resume n-grams;
 *  - single-word aliases (length ≥ 5, stem length ≥ 4): stem equality
 *    or Jaro-Winkler ≥ 0.92 against some resume stem.
 * Case-sensitive aliases never fuzzy-match (their stems collide with
 * everyday English: "excellent" → "excel", "going" → "go", …).
 */
function fuzzyAliasMatch(alias: string, index: ResumeIndex): boolean {
  if (CASE_SENSITIVE_ALIASES.has(alias)) return false;
  const tokens = tokenize(alias);
  if (tokens.length === 0) return false;
  if (tokens.length > 1) {
    return index.phraseSet.has(tokens.map(stem).join(" "));
  }
  const aliasStem = stem(tokens[0]);
  if (!aliasStem) return false;
  if (index.stemSet.has(aliasStem)) return true;
  if (alias.length >= 5 && aliasStem.length >= 4) {
    for (const candidate of index.stemSet) {
      if (Math.abs(candidate.length - aliasStem.length) > 3) continue;
      const distance = JaroWinklerDistance(candidate, aliasStem);
      if (distance >= JW_THRESHOLD) return true;
    }
  }
  return false;
}

/* ── implied (transfer-evidence) satisfaction ────────────────────── */
/**
 * Canonical skill key → other skill keys whose presence in the resume
 * counts as evidence for the first. E.g. mentioning PostgreSQL three
 * times should satisfy a "SQL databases" requirement. Deliberately
 * conservative: only strong, uncontroversial implications.
 */
const IMPLIED_BY: Record<string, string[]> = {
  sql: ["postgresql", "mysql", "sqlite", "oracle database", "microsoft sql server", "mariadb", "sql server", "transact-sql", "pl/sql"],
  "cloud computing": ["aws", "gcp", "azure", "google cloud platform", "amazon web services", "microsoft azure", "serverless"],
  "machine learning": ["pytorch", "tensorflow", "scikit-learn", "xgboost", "keras", "deep learning"],
  "deep learning": ["pytorch", "tensorflow", "keras"],
  "data analysis": ["pandas", "numpy", "tableau", "power bi"],
  testing: ["jest", "cypress", "pytest", "playwright", "selenium", "junit", "unit testing", "test automation"],
  "ci/cd": ["github actions", "jenkins", "gitlab ci", "circleci", "continuous integration", "continuous deployment"],
  "frontend development": ["react", "react.js", "vue", "vue.js", "angular", "svelte", "next.js"],
  "backend development": ["node.js", "express", "express.js", "django", "flask", "fastapi", "spring boot", "ruby on rails", "nestjs", "asp.net"],
  "api design": ["rest apis", "restful apis", "graphql", "openapi", "grpc"],
  "version control": ["git", "github", "gitlab", "bitbucket"],
  "project management": ["agile", "scrum", "kanban", "jira"],
};

/** Evidence count for a skill through its implying skills (0 if none). */
function impliedEvidence(resumeText: string, canonicalKey: string): number {
  const implying = IMPLIED_BY[canonicalKey];
  if (!implying) return 0;
  let best = 0;
  for (const otherKey of implying) {
    const otherAliases = getSkillAliases(otherKey);
    const count = skillMentionIndices(resumeText, otherAliases).size;
    if (count > best) best = count;
  }
  return best;
}

/* ── main entry ───────────────────────────────────────────────── */

function missingPriority(skill: SkillRef): Priority {
  if (skill.priority === "required") {
    // required + 1 mention → "medium"; required + 0 (defensive) → "medium"
    return skill.mentions >= 2 ? "high" : "medium";
  }
  return skill.mentions >= 2 ? "medium" : "low";
}

function byWeight(a: { required: boolean; jdMentions: number; name: string }, b: { required: boolean; jdMentions: number; name: string }): number {
  return (
    Number(b.required) - Number(a.required) ||
    b.jdMentions - a.jdMentions ||
    a.name.localeCompare(b.name)
  );
}

/**
 * Match every JD skill against the resume. A skill counts as matched
 * when any alias occurs at least once (exact) or when the fuzzy stem
 * pass finds morphological evidence.
 */
export function matchSkills(resumeText: string, job: JobProfile): SkillsMatch {
  const matched: MatchedSkill[] = [];
  const missing: MissingSkill[] = [];
  if (!job.allSkills.length || !resumeText.trim()) return { matched, missing };

  const index = buildResumeIndex(resumeText);

  for (const skill of job.allSkills) {
    const aliases = getSkillAliases(skill.name);
    const exact = skillMentionIndices(resumeText, aliases).size;
    let fuzzy = false;
    if (exact === 0) {
      fuzzy = aliases.some((alias) => fuzzyAliasMatch(alias, index));
    }
    // implied evidence — e.g. PostgreSQL in the resume satisfies "SQL"
    let implied = 0;
    if (exact === 0 && !fuzzy) {
      const entry = findSkillEntry(skill.name);
      const canonicalKey = entry ? entry.aliases[0] : skill.name.toLowerCase();
      implied = impliedEvidence(resumeText, canonicalKey);
    }

    if (exact > 0 || fuzzy || implied > 0) {
      matched.push({
        name: skill.name,
        category: skill.category,
        resumeMentions: exact > 0 ? exact : 1,
        jdMentions: skill.mentions,
        required: skill.priority === "required",
      });
    } else {
      missing.push({
        name: skill.name,
        category: skill.category,
        priority: missingPriority(skill),
        jdMentions: skill.mentions,
        required: skill.priority === "required",
      });
    }
  }

  matched.sort(byWeight);
  missing.sort(byWeight);
  return { matched, missing };
}
