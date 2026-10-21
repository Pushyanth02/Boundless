/**
 * BOUNDLESS · Analysis Contracts
 * ─────────────────────────────────────────────────────────────
 * Authoritative data contracts shared by the analysis engine,
 * the API routes, and the UI. The engine MUST produce
 * `AnalysisResult`; the UI MUST consume it. Do not diverge.
 */

export type Priority = "high" | "medium" | "low";
export type VerdictTone = "strong" | "moderate" | "weak";
export type AtsStatus = "pass" | "warn" | "fail";
export type DimensionKey = "skills" | "experience" | "keywords" | "education";
export type SkillPriority = "required" | "preferred";
export type EngineMode = "offline" | "ai";

/* ── Candidate / resume side ───────────────────────────────── */

export interface CandidateProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  links: string[];
  yearsExperience: number | null;
  highestDegree: string | null;
  wordCount: number;
  /** Names of sections detected in the resume (e.g. Experience, Skills) */
  sections: DetectedSection[];
  /** Count of quantified achievements (numbers, %, $, metrics) found */
  quantifiedHits: number;
}

export interface DetectedSection {
  name: string;
  confidence: number;
  wordCount: number;
}

/* ── Job description side ──────────────────────────────────── */

export interface JobProfile {
  title: string | null;
  seniority: string | null;
  /** Skills explicitly required by the JD (from requirements section / must-have phrasing) */
  requiredSkills: SkillRef[];
  /** Skills mentioned as nice-to-have / preferred / bonus */
  preferredSkills: SkillRef[];
  /** All skills mentioned anywhere in the JD (union, with mentions) */
  allSkills: SkillRef[];
  responsibilities: string[];
  wordCount: number;
}

export interface SkillRef {
  name: string;
  category: string;
  priority: SkillPriority;
  mentions: number;
}

/* ── Scores ────────────────────────────────────────────────── */

export interface DimensionScore {
  key: DimensionKey;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface AtsCheck {
  id: string;
  label: string;
  status: AtsStatus;
  weight: number;
  detail: string;
  fix?: string;
}

export interface AtsReport {
  score: number;
  label: string;
  checks: AtsCheck[];
}

export interface ScoreBlock {
  overall: number;
  verdict: { label: string; tone: VerdictTone };
  dimensions: DimensionScore[];
  ats: AtsReport;
}

/* ── Matching detail ──────────────────────────────────────── */

export interface MatchedSkill {
  name: string;
  category: string;
  resumeMentions: number;
  jdMentions: number;
  required: boolean;
}

export interface MissingSkill {
  name: string;
  category: string;
  priority: Priority;
  jdMentions: number;
  required: boolean;
}

export interface KeywordHit {
  term: string;
  jdMentions: number;
  resumeMentions: number;
}

export interface SalientTerm {
  term: string;
  score: number;
}

export interface SkillsMatch {
  matched: MatchedSkill[];
  missing: MissingSkill[];
}

export interface KeywordMatch {
  found: KeywordHit[];
  missing: KeywordHit[];
  salient: SalientTerm[];
}

/* ── Experience & recommendations ───────────────────────────── */

export interface ExperienceSummary {
  yearsDetected: number | null;
  text: string;
  jobCount: number;
}

export interface Recommendation {
  title: string;
  detail: string;
  impact: Priority;
}

/* ── AI layer (OpenRouter BYOK, optional) ──────────────────── */

export interface AiGapNarrative {
  skill: string;
  why: string;
  suggestion: string;
}

export interface AiBulletSuggestion {
  original: string;
  improved: string;
  why: string;
}

export interface AiInsights {
  model: string;
  summary: string;
  gapNarratives: AiGapNarrative[];
  summaryRewrite: string | null;
  atsNarrative: string | null;
  bulletSuggestions: AiBulletSuggestion[];
}

/* ── Top-level result ──────────────────────────────────────── */

export interface AnalysisResult {
  candidate: CandidateProfile;
  job: JobProfile;
  scores: ScoreBlock;
  skills: SkillsMatch;
  keywords: KeywordMatch;
  experience: ExperienceSummary;
  recommendations: Recommendation[];
  /** Resume + JD meta echoed back for context */
  meta: {
    fileName: string | null;
    resumeExcerpt: string;
    jdExcerpt: string;
    analyzedAt: string;
  };
}

/* ── API envelopes ─────────────────────────────────────────── */

export interface AnalyzeResponse {
  id: string;
  result: AnalysisResult;
}

export interface EnhanceResponse {
  ai: AiInsights | null;
  error?: string;
}

export interface HistoryItem {
  id: string;
  createdAt: string;
  fileName: string | null;
  jobTitle: string | null;
  overall: number;
  atsScore: number;
  verdict: string;
  mode: string;
}

export interface OpenRouterTestResponse {
  ok: boolean;
  label?: string;
  error?: string;
}

/* ── Engine input ──────────────────────────────────────────── */

export interface EngineInput {
  resumeText: string;
  jdText: string;
  fileName: string | null;
}

export const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  skills: 0.35,
  keywords: 0.25,
  experience: 0.25,
  education: 0.15,
};

export const VERDICTS: { min: number; label: string; tone: VerdictTone }[] = [
  { min: 80, label: "Strong match", tone: "strong" },
  { min: 60, label: "Promising, with gaps", tone: "moderate" },
  { min: 40, label: "Needs rework", tone: "weak" },
  { min: 0, label: "Weak alignment", tone: "weak" },
];
