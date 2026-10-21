/**
 * BOUNDLESS · offline NLP engine — orchestrator
 * ─────────────────────────────────────────────────────────────────
 * runAnalysis(EngineInput) → AnalysisResult. Stages run in a fixed
 * pipeline, each defensively isolated: a failing stage degrades to
 * empty defaults and never takes the whole analysis down.
 *
 *   parseResume → parseJob → matchSkills → cosine → salientTerms
 *   → scoreDimensions → runAtsAudit → overall+verdict
 *   → buildRecommendations → assemble meta
 *
 * Server-side only. Deterministic. No network, no randomness.
 */
import { parseJob } from "./jd-parser";
import { matchSkills } from "./matcher";
import { runAtsAudit } from "./ats-rules";
import { parseResume, extractExperienceRanges, EMPTY_CANDIDATE } from "./resume-parser";
import {
  buildRecommendations,
  computeOverall,
  scoreDimensions,
} from "./scoring";
import type { RecommendationInput } from "./scoring";
import { cosineSimilarity, salientTermPresence, salientTerms } from "./tfidf";
import { DIMENSION_WEIGHTS, VERDICTS } from "./types";
import type {
  AnalysisResult,
  AtsReport,
  CandidateProfile,
  DimensionScore,
  EngineInput,
  ExperienceSummary,
  JobProfile,
  KeywordHit,
  KeywordMatch,
  Recommendation,
  SalientTerm,
  SkillsMatch,
  VerdictTone,
} from "./types";
import { countOccurrences } from "./text";

/* ── fallbacks for defensive degradation ──────────────────────── */

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

function neutralDimensions(): DimensionScore[] {
  return [
    {
      key: "skills",
      label: "Skills",
      score: 50,
      weight: DIMENSION_WEIGHTS.skills,
      detail: "Skill analysis was unavailable for this run.",
    },
    {
      key: "keywords",
      label: "Keywords",
      score: 50,
      weight: DIMENSION_WEIGHTS.keywords,
      detail: "Keyword analysis was unavailable for this run.",
    },
    {
      key: "experience",
      label: "Experience",
      score: 50,
      weight: DIMENSION_WEIGHTS.experience,
      detail: "Experience analysis was unavailable for this run.",
    },
    {
      key: "education",
      label: "Education",
      score: 50,
      weight: DIMENSION_WEIGHTS.education,
      detail: "Education analysis was unavailable for this run.",
    },
  ];
}

function emptyAts(): AtsReport {
  return { score: 0, label: "Likely rejected", checks: [] };
}

function excerpt(text: string, maxChars: number): string {
  const clean = (text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, maxChars).trimEnd();
}

function buildExperienceSummary(
  resumeText: string,
  candidate: CandidateProfile
): ExperienceSummary {
  let jobCount = 0;
  try {
    jobCount = extractExperienceRanges(resumeText).ranges.length;
  } catch {
    jobCount = 0;
  }
  const years = candidate.yearsExperience;
  const text =
    years !== null
      ? `About ${years} years of dated work history detected across ${jobCount} position${jobCount === 1 ? "" : "s"}.`
      : "No dated work history could be parsed from this resume.";
  return { yearsDetected: years, text, jobCount };
}

function buildKeywordMatch(
  resumeText: string,
  jdText: string,
  salient: SalientTerm[]
): KeywordMatch {
  try {
    const presence = salientTermPresence(resumeText, salient, 12);
    const toHit = (term: SalientTerm, present: boolean): KeywordHit => ({
      term: term.term,
      jdMentions: countOccurrences(jdText, term.term),
      resumeMentions: present
        ? Math.max(1, countOccurrences(resumeText, term.term))
        : 0,
    });
    return {
      found: presence.present.map((t) => toHit(t, true)),
      missing: presence.absent.map((t) => toHit(t, false)),
      salient,
    };
  } catch {
    return { found: [], missing: [], salient };
  }
}

function pickVerdict(overall: number): { label: string; tone: VerdictTone } {
  const verdict = VERDICTS.find((v) => overall >= v.min) ?? VERDICTS[VERDICTS.length - 1];
  return { label: verdict.label, tone: verdict.tone };
}

/* ── main entry ───────────────────────────────────────────────── */

export function runAnalysis(input: EngineInput): AnalysisResult {
  const resumeText = input?.resumeText ?? "";
  const jdText = input?.jdText ?? "";
  const fileName = input?.fileName ?? null;

  // stage 1 — resume
  let candidate: CandidateProfile = EMPTY_CANDIDATE;
  try {
    candidate = parseResume(resumeText);
  } catch {
    candidate = { ...EMPTY_CANDIDATE };
  }

  // stage 2 — job description
  let job: JobProfile = emptyJob();
  try {
    job = parseJob(jdText);
  } catch {
    job = emptyJob();
  }

  // stage 3 — skills matching
  let skills: SkillsMatch = { matched: [], missing: [] };
  try {
    skills = matchSkills(resumeText, job);
  } catch {
    skills = { matched: [], missing: [] };
  }

  // stage 4 — lexical similarity
  let cosine = 0;
  try {
    cosine = cosineSimilarity(resumeText, jdText);
  } catch {
    cosine = 0;
  }

  // stage 5 — salient JD terms
  let salient: SalientTerm[] = [];
  try {
    salient = salientTerms(jdText, resumeText, 18);
  } catch {
    salient = [];
  }

  // stage 6 — dimension scores
  let dimensions = neutralDimensions();
  try {
    const scored = scoreDimensions(resumeText, jdText, candidate, job, skills, cosine, salient);
    if (Array.isArray(scored) && scored.length === 4) dimensions = scored;
  } catch {
    dimensions = neutralDimensions();
  }

  // stage 7 — ATS audit
  let ats: AtsReport = emptyAts();
  try {
    ats = runAtsAudit(
      resumeText,
      candidate,
      job,
      { parseOk: resumeText.trim().length > 0, wordCount: candidate.wordCount },
      jdText
    );
  } catch {
    ats = emptyAts();
  }

  // stage 8 — overall + verdict
  const overall = computeOverall(dimensions);
  const verdict = pickVerdict(overall);

  // stage 9 — recommendations
  let recommendations: Recommendation[] = [];
  try {
    const recInput: RecommendationInput = {
      candidate,
      job,
      skills,
      ats,
      keywordPresence: salientTermPresence(resumeText, salient, 12),
      cosine,
      dimensions,
    };
    recommendations = buildRecommendations(recInput);
  } catch {
    recommendations = [];
  }

  // stage 10 — assemble
  const keywords = buildKeywordMatch(resumeText, jdText, salient);
  const experience = buildExperienceSummary(resumeText, candidate);

  return {
    candidate,
    job,
    scores: { overall, verdict, dimensions, ats },
    skills,
    keywords,
    experience,
    recommendations,
    meta: {
      fileName,
      resumeExcerpt: excerpt(resumeText, 900),
      jdExcerpt: excerpt(jdText, 700),
      analyzedAt: new Date().toISOString(),
    },
  };
}
