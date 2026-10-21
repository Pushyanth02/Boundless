/**
 * BOUNDLESS · offline NLP engine — dimension scoring & recommendations
 * ─────────────────────────────────────────────────────────────────
 * Four weighted dimensions (skills .35 / keywords .25 / experience .25 /
 * education .15), the overall rollup, and data-driven recommendations
 * that cite the actual numbers behind each suggestion.
 *
 * Deterministic, defensive — never throws.
 */
import { findDegreeBand } from "./resume-parser";
import type { SalientPresence } from "./tfidf";
import { salientTermPresence } from "./tfidf";
import {
  DIMENSION_WEIGHTS,
} from "./types";
import type {
  AtsReport,
  CandidateProfile,
  DimensionScore,
  DimensionKey,
  JobProfile,
  Priority,
  Recommendation,
  SalientTerm,
  SkillsMatch,
} from "./types";

/* ── dimension labels ─────────────────────────────────────────── */

const LABELS: Record<DimensionKey, string> = {
  skills: "Skills",
  keywords: "Keywords",
  experience: "Experience",
  education: "Education",
};

/* ── skills (0.35) ─────────────────────────────────────────────── */

/**
 * skillWeight = min(1, 0.55 + 0.22 × (min(jdMentions, 4) − 1)) —
 * skills the JD repeats are worth a bit more.
 */
function skillWeight(jdMentions: number): number {
  return Math.min(1, 0.55 + 0.22 * (Math.min(Math.max(jdMentions, 0), 4) - 1));
}

function skillsDimension(
  job: JobProfile,
  skillsMatch: SkillsMatch
): DimensionScore {
  const weight = DIMENSION_WEIGHTS.skills;
  if (job.allSkills.length === 0) {
    return {
      key: "skills",
      label: LABELS.skills,
      score: 30,
      weight,
      detail:
        "The job description contained no recognizable skills from our taxonomy, so skill fit could not be verified.",
    };
  }
  const matchedNames = new Set(skillsMatch.matched.map((m) => m.name));
  let numerator = 0;
  let denominator = 0;
  let reqMatched = 0;
  let prefMatched = 0;
  for (const skill of job.allSkills) {
    const w = skillWeight(skill.mentions);
    const multiplier = skill.priority === "required" ? 3 : 1;
    denominator += w * multiplier;
    if (matchedNames.has(skill.name)) {
      numerator += w * multiplier;
      if (skill.priority === "required") reqMatched += 1;
      else prefMatched += 1;
    }
  }
  const score = denominator > 0 ? Math.round((numerator / denominator) * 100) : 30;
  return {
    key: "skills",
    label: LABELS.skills,
    score,
    weight,
    detail: `${reqMatched} of ${job.requiredSkills.length} required and ${prefMatched} of ${job.preferredSkills.length} preferred skills evidenced in the resume.`,
  };
}

/* ── keywords (0.25) ──────────────────────────────────────────── */

function keywordsDimension(
  resumeText: string,
  cosine: number,
  salient: SalientTerm[]
): DimensionScore {
  const weight = DIMENSION_WEIGHTS.keywords;
  const presence = salientTermPresence(resumeText, salient, 12);
  const similarity = Math.min(1, cosine * 1.35);
  const score = Math.round(100 * (0.5 * presence.fraction + 0.5 * similarity));
  const detail =
    presence.considered === 0
      ? `The JD was too sparse to extract salient terms; lexical similarity with the resume is ${cosine.toFixed(2)}.`
      : `${presence.present.length} of the JD's ${presence.considered} most salient terms appear in the resume; stem-level lexical similarity is ${cosine.toFixed(2)}.`;
  return { key: "keywords", label: LABELS.keywords, score, weight, detail };
}

/* ── experience (0.25) ────────────────────────────────────────── */

/** [band floor, band top] in years, keyed by the JD seniority label. */
const SENIORITY_BANDS: Record<string, [number, number]> = {
  Intern: [0, 1],
  "Entry-level": [0, 1],
  Junior: [0, 2],
  "Mid-level": [2, 4],
  Senior: [5, 7],
  Staff: [8, 12],
  Principal: [8, 12],
  Lead: [5, 8],
  Manager: [5, 8],
  Director: [10, 15],
  "Head of": [10, 15],
  VP: [10, 15],
  Chief: [10, 15],
};

function experienceDimension(
  candidate: CandidateProfile,
  job: JobProfile,
  skillsScore: number
): DimensionScore {
  const weight = DIMENSION_WEIGHTS.experience;
  const years = candidate.yearsExperience;
  const seniority = job.seniority;

  if (!seniority) {
    return {
      key: "experience",
      label: LABELS.experience,
      score: 60,
      weight,
      detail:
        "The role didn't state a seniority level, so experience was scored neutrally.",
    };
  }
  const band = SENIORITY_BANDS[seniority];
  if (!band) {
    return {
      key: "experience",
      label: LABELS.experience,
      score: 60,
      weight,
      detail: `Seniority “${seniority}” could not be mapped to an experience band.`,
    };
  }
  const [lo, hi] = band;

  if (years === null || years === undefined) {
    // no dated history in the resume — lean on skill evidence
    if (skillsScore >= 60) {
      return {
        key: "experience",
        label: LABELS.experience,
        score: 55,
        weight,
        detail: `No dated work history could be parsed, but ${skillsScore}% skill coverage suggests plausible ${seniority.toLowerCase()}-level exposure.`,
      };
    }
    return {
      key: "experience",
      label: LABELS.experience,
      score: 40,
      weight,
      detail: `No dated work history could be parsed and skill coverage is low (${skillsScore}%) — the ${seniority.toLowerCase()} band (${lo}–${hi}+ years) is unverifiable.`,
    };
  }

  if (years > hi + 4) {
    return {
      key: "experience",
      label: LABELS.experience,
      score: 88,
      weight,
      detail: `≈${years} years detected — well beyond the ${seniority} band (${lo}–${hi}+ years); possibly overqualified, which some screens discount.`,
    };
  }
  if (years >= hi) {
    return {
      key: "experience",
      label: LABELS.experience,
      score: 100,
      weight,
      detail: `≈${years} years detected, at or above the ${seniority} band (${lo}–${hi}+ years).`,
    };
  }
  const shortfall = Math.round((hi - years) * 10) / 10;
  const score = Math.max(30, Math.round(100 - 20 * shortfall));
  return {
    key: "experience",
    label: LABELS.experience,
    score,
    weight,
    detail: `≈${years} years detected vs the ${seniority} band (${lo}–${hi}+ years) — about ${shortfall} year${shortfall === 1 ? "" : "s"} short.`,
  };
}

/* ── education (0.15) ─────────────────────────────────────────── */

const DEGREE_RANKS: Record<string, number> = {
  PhD: 4,
  "Master's": 3,
  "Bachelor's": 2,
  "Associate's": 1,
};

/** Degree expectation in the JD text (explicit band, or generic "degree" → bachelor). */
function jdDegreeExpectation(jdText: string): { label: string; rank: number } | null {
  const band = findDegreeBand(jdText);
  if (band) return { label: band.label, rank: band.band };
  if (/\bdegree\b/i.test(jdText)) return { label: "Bachelor's", rank: 2 };
  return null;
}

function educationDimension(
  jdText: string,
  candidate: CandidateProfile
): DimensionScore {
  const weight = DIMENSION_WEIGHTS.education;
  const expectation = jdDegreeExpectation(jdText);
  if (!expectation) {
    return {
      key: "education",
      label: LABELS.education,
      score: 80,
      weight,
      detail:
        "The JD doesn't state a degree requirement — education scored neutrally.",
    };
  }
  const candidateRank = candidate.highestDegree
    ? DEGREE_RANKS[candidate.highestDegree] ?? 0
    : 0;
  if (candidateRank === 0) {
    return {
      key: "education",
      label: LABELS.education,
      score: 40,
      weight,
      detail: `The JD asks for a ${expectation.label}, but no degree could be found in the resume.`,
    };
  }
  if (candidateRank > expectation.rank) {
    return {
      key: "education",
      label: LABELS.education,
      score: 100,
      weight,
      detail: `Resume shows a ${candidate.highestDegree}, exceeding the JD's ${expectation.label} expectation.`,
    };
  }
  if (candidateRank === expectation.rank) {
    return {
      key: "education",
      label: LABELS.education,
      score: 97,
      weight,
      detail: `Resume's ${candidate.highestDegree} meets the JD's ${expectation.label} expectation.`,
    };
  }
  const gap = expectation.rank - candidateRank;
  return {
    key: "education",
    label: LABELS.education,
    score: gap === 1 ? 60 : 45,
    weight,
    detail: `Resume shows a ${candidate.highestDegree} against the JD's ${expectation.label} — ${gap === 1 ? "one band" : `${gap} bands`} below.`,
  };
}

/* ── rollups ───────────────────────────────────────────────────── */

export function scoreDimensions(
  resumeText: string,
  jdText: string,
  candidate: CandidateProfile,
  job: JobProfile,
  skillsMatch: SkillsMatch,
  cosine: number,
  salient: SalientTerm[]
): DimensionScore[] {
  const skills = skillsDimension(job, skillsMatch);
  return [
    skills,
    keywordsDimension(resumeText, cosine, salient),
    experienceDimension(candidate, job, skills.score),
    educationDimension(jdText, candidate),
  ];
}

export function computeOverall(dimensions: DimensionScore[]): number {
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
  if (totalWeight <= 0) return 50;
  const raw = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / totalWeight;
  return Math.min(99, Math.max(5, Math.round(raw)));
}

/* ── recommendations ───────────────────────────────────────────── */

export interface RecommendationInput {
  candidate: CandidateProfile;
  job: JobProfile;
  skills: SkillsMatch;
  ats: AtsReport;
  keywordPresence: SalientPresence;
  cosine: number;
  dimensions: DimensionScore[];
}

const IMPACT_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function buildCoreRecommendations(input: RecommendationInput): Recommendation[] {
  const recs: Recommendation[] = [];
  const { candidate, job, skills, ats, keywordPresence } = input;

  // 1. missing high-priority skills (up to 2)
  const highMissing = skills.missing
    .filter((m) => m.priority === "high")
    .sort((a, b) => b.jdMentions - a.jdMentions);
  for (const miss of highMissing.slice(0, 2)) {
    recs.push({
      title: `Close the gap on ${miss.name}`,
      detail: `${miss.name} is required by this job (mentioned ${miss.jdMentions}× in the JD) but isn't evidenced anywhere in your resume. Add it to your skills section or a project bullet — only where genuinely true.`,
      impact: "high",
    });
  }

  // 2. ATS failures first (up to 2 with fixes)
  const failed = ats.checks.filter((c) => c.status === "fail");
  for (const check of failed.slice(0, 2)) {
    recs.push({
      title: `Fix: ${check.label.toLowerCase()}`,
      detail: check.fix ?? check.detail,
      impact: "high",
    });
  }

  // 3. keyword weaving when coverage is low
  if (keywordPresence.considered > 0 && keywordPresence.fraction < 0.5) {
    const sample = keywordPresence.absent.slice(0, 3).map((t) => t.term);
    recs.push({
      title: "Weave the JD's language into your resume",
      detail: `Only ${keywordPresence.present.length} of ${keywordPresence.considered} salient JD terms appear in your resume${sample.length ? ` — terms like “${sample.join("”, “")}” are emphasized by the employer` : ""}. Mirror that vocabulary in your summary and bullets where accurate.`,
      impact: "high",
    });
  }

  // 4. medium-priority skill (1)
  const mediumMissing = skills.missing.find((m) => m.priority === "medium");
  if (mediumMissing && recs.length < 5) {
    recs.push({
      title: `Consider adding ${mediumMissing.name}`,
      detail: `${mediumMissing.name} appears ${mediumMissing.jdMentions}× in the JD and would strengthen your ${mediumMissing.category.toLowerCase()} story — add it if you have real exposure.`,
      impact: "medium",
    });
  }

  // 5. ATS warnings (up to 2)
  const warned = ats.checks.filter((c) => c.status === "warn");
  for (const check of warned.slice(0, 2)) {
    if (recs.length >= 5) break;
    recs.push({
      title: `Improve: ${check.label.toLowerCase()}`,
      detail: check.fix ?? check.detail,
      impact: "medium",
    });
  }

  // 6. quantified achievements
  if (candidate.quantifiedHits < 3 && recs.length < 6) {
    recs.push({
      title: "Quantify your achievements",
      detail: `Only ${candidate.quantifiedHits} quantified achievement${candidate.quantifiedHits === 1 ? "" : "s"} detected — recruiters and parsers reward numbers (%, $, users, latency, team size).`,
      impact: "medium",
    });
  }

  return recs;
}

/** Data-driven fallbacks so the panel always has substance (4–6 total). */
function buildFallbackRecommendations(input: RecommendationInput): Recommendation[] {
  const { candidate, job, dimensions } = input;
  const fallbacks: Recommendation[] = [];
  const experience = dimensions.find((d) => d.key === "experience");
  const education = dimensions.find((d) => d.key === "education");

  if (job.title) {
    fallbacks.push({
      title: "Mirror the job title language",
      detail: `Target the exact role (“${job.title}”) in your headline or summary so title-matching parsers rank you for it.`,
      impact: "medium",
    });
  }
  if (candidate.links.length === 0) {
    fallbacks.push({
      title: "Add a LinkedIn or portfolio link",
      detail: "No links were found — a plain-text LinkedIn URL near your contact line raises recruiter trust and parse reliability.",
      impact: "medium",
    });
  }
  if (experience && experience.score < 70) {
    fallbacks.push({
      title: "Address the experience gap head-on",
      detail: `${experience.detail} Consider a one-line scope statement (“6 years across fintech and e-commerce”) to frame depth.`,
      impact: "medium",
    });
  }
  if (education && education.score <= 60) {
    fallbacks.push({
      title: "Reframe your education story",
      detail: `${education.detail} If the degree is missing, add equivalent practical experience explicitly — many JDs accept it.`,
      impact: "low",
    });
  }
  if (candidate.wordCount > 0 && (candidate.wordCount < 350 || candidate.wordCount > 1000)) {
    fallbacks.push({
      title: "Adjust resume length",
      detail: `The resume is ${candidate.wordCount} words; the ideal band is 350–1000 (one page for most careers).`,
      impact: "low",
    });
  }
  if (!candidate.location) {
    fallbacks.push({
      title: "Add your location",
      detail: "No location detected — add “City, ST” or “Remote” so location-filtered searches can find you.",
      impact: "low",
    });
  }
  return fallbacks;
}

export function buildRecommendations(input: RecommendationInput): Recommendation[] {
  try {
    const recs = buildCoreRecommendations(input);
    if (recs.length < 4) {
      for (const fallback of buildFallbackRecommendations(input)) {
        if (recs.length >= 4) break;
        recs.push(fallback);
      }
    }
    recs.sort((a, b) => IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact]);
    return recs.slice(0, 6);
  } catch {
    return [];
  }
}
