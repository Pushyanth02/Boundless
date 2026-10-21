/**
 * BOUNDLESS · offline NLP engine — ATS audit (16 rules)
 * ─────────────────────────────────────────────────────────────────
 * Recreates what mainstream applicant-tracking parsers check: contact
 * block, structure, length, quantification, action verbs, bullets,
 * date hygiene, title alignment, keyword density, education, pronouns,
 * and PDF-extraction artifacts. Every check carries a concrete,
 * numbers-first `detail` and an actionable `fix` when not passing.
 *
 * Deterministic, defensive — never throws.
 */
import type {
  AtsCheck,
  AtsReport,
  AtsStatus,
  CandidateProfile,
  JobProfile,
} from "./types";
import { salientTermPresence, salientTerms } from "./tfidf";
import { countOccurrences, isStopword, stem, tokenize } from "./text";

/* ── helpers ───────────────────────────────────────────────────── */

function mkCheck(
  id: string,
  label: string,
  status: AtsStatus,
  weight: number,
  detail: string,
  fix?: string
): AtsCheck {
  const check: AtsCheck = { id, label, status, weight, detail };
  if (status !== "pass" && fix) check.fix = fix;
  return check;
}

/* ── bullets / action verbs ───────────────────────────────────── */

const STRONG_VERBS = new Set([
  "led", "built", "designed", "launched", "improved", "increased",
  "reduced", "shipped", "automated", "architected", "managed",
  "developed", "created", "delivered", "optimized", "mentored",
  "drove", "owned", "implemented", "spearheaded", "streamlined",
]);

const OTHER_VERBS = new Set([
  "wrote", "worked", "working", "participated", "collaborated",
  "coordinated", "supported", "maintained", "tested", "researched",
  "analyzed", "presented", "assisted", "helped", "contributed",
  "trained", "taught", "negotiated", "planned", "organized",
  "supervised", "operated", "handled", "performed", "completed",
  "achieved", "exceeded", "earned", "awarded", "recognized",
  "published", "patented", "founded", "grew", "scaled", "migrated",
  "refactored", "debugged", "configured", "deployed", "monitored",
  "integrated", "established", "introduced", "proposed", "recommended",
  "reviewed", "validated", "verified", "documented", "communicated",
  "partnered", "coached", "onboarded", "hired", "interviewed",
  "recruited", "budgeted", "forecasted", "projected", "reported",
  "tracked", "measured", "saved", "generated", "championed",
  "pioneered", "modernized", "upgraded", "enhanced", "simplified",
  "consolidated", "centralized", "standardized", "reorganized",
  "restructured", "transformed", "revamped", "revitalized",
  "rebranded", "engineered", "coded", "programmed", "scripted",
  "drafted", "edited", "curated", "moderated", "facilitated",
]);

const VERB_WORDS = new Set([...STRONG_VERBS, ...OTHER_VERBS]);
const BULLET_MARKER_RE = /^[-•·*▪◦>+\u2022]/;

interface BulletStats {
  bulletCount: number;
  strongCount: number;
  contentLines: number;
}

function analyzeBullets(resumeText: string): BulletStats {
  let bulletCount = 0;
  let strongCount = 0;
  let contentLines = 0;
  for (const raw of resumeText.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    contentLines += 1;
    if (BULLET_MARKER_RE.test(line)) {
      bulletCount += 1;
      const first = (line.replace(/^[-•·*▪◦>+\u2022]+\s*/, "").split(/\s+/)[0] ?? "")
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      if (STRONG_VERBS.has(first)) strongCount += 1;
    } else {
      const m = line.match(/^([A-Za-z][a-z']+)\b/);
      if (m) {
        const word = m[1].toLowerCase();
        if (VERB_WORDS.has(word)) {
          bulletCount += 1;
          if (STRONG_VERBS.has(word)) strongCount += 1;
        }
      }
    }
  }
  return { bulletCount, strongCount, contentLines };
}

/* ── date format hygiene ──────────────────────────────────────── */

interface DateStats {
  instances: number;
  formats: string[];
  dominantShare: number;
}

function analyzeDates(resumeText: string): DateStats {
  const taken: Array<[number, number]> = [];
  const overlaps = (s: number, e: number) => taken.some(([ts, te]) => s < te && e > ts);
  const counts: Record<string, number> = { "Mon YYYY": 0, "MM/YYYY": 0, YYYY: 0 };
  const regexes: Array<{ format: string; re: RegExp }> = [
    {
      format: "Mon YYYY",
      re: /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*,?\s*(?:19[89]\d|20[0-2]\d)\b/gi,
    },
    { format: "MM/YYYY", re: /\b(?:0?[1-9]|1[0-2])\/(?:19[89]\d|20[0-2]\d)\b/g },
    { format: "YYYY", re: /\b(?:19[89]\d|20[0-2]\d)\b/g },
  ];
  for (const { format, re } of regexes) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(resumeText)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      if (overlaps(start, end)) continue;
      taken.push([start, end]);
      counts[format] += 1;
    }
  }
  const instances = counts["Mon YYYY"] + counts["MM/YYYY"] + counts.YYYY;
  const dominant = Math.max(counts["Mon YYYY"], counts["MM/YYYY"], counts.YYYY);
  const formats = Object.entries(counts)
    .filter(([, c]) => c > 0)
    .map(([f, c]) => `${f} ×${c}`);
  return { instances, formats, dominantShare: instances > 0 ? dominant / instances : 0 };
}

/* ── the 16 checks ─────────────────────────────────────────────── */

function contactCheck(candidate: CandidateProfile): AtsCheck {
  const email = candidate.email;
  const phone = candidate.phone;
  if (email && phone) {
    return mkCheck(
      "contact",
      "Contact information",
      "pass",
      8,
      `Email (${email}) and phone ${phone} both found.`
    );
  }
  if (email || phone) {
    const found = email ? `email (${email})` : `phone ${phone}`;
    const missing = email ? "phone number" : "email address";
    return mkCheck(
      "contact",
      "Contact information",
      "warn",
      8,
      `Only a ${found} found — no ${missing} detected.`,
      `Add your ${missing} on the same line as your email so every parser can reach you.`
    );
  }
  return mkCheck(
    "contact",
    "Contact information",
    "fail",
    8,
    "No email address or phone number could be found at the top of the resume.",
    "Put a plain-text email and phone number in the header (e.g. name@email.com · +1 555 123 4567) — never inside an image."
  );
}

function linksCheck(candidate: CandidateProfile): AtsCheck {
  if (candidate.links.length > 0) {
    return mkCheck(
      "links",
      "LinkedIn / portfolio links",
      "pass",
      3,
      `${candidate.links.length} link${candidate.links.length === 1 ? "" : "s"} found: ${candidate.links.slice(0, 3).join(", ")}.`
    );
  }
  return mkCheck(
    "links",
    "LinkedIn / portfolio links",
    "warn",
    3,
    "No LinkedIn, GitHub or portfolio URL was detected.",
    "Add plain-text links (linkedin.com/in/you, github.com/you) near your contact line — many recruiters filter on their presence."
  );
}

function sectionsCheck(candidate: CandidateProfile): AtsCheck {
  const names = candidate.sections.map((s) => s.name);
  const hasExperience = names.includes("Experience");
  const hasEducation = names.includes("Education");
  const hasSkills = names.includes("Skills");
  const found = [hasExperience && "Experience", hasEducation && "Education", hasSkills && "Skills"]
    .filter((x): x is string => Boolean(x));
  const count = found.length;
  if (count === 3) {
    return mkCheck(
      "sections",
      "Core sections",
      "pass",
      8,
      `All core sections detected: ${found.join(", ")}.`
    );
  }
  if (count >= 1) {
    return mkCheck(
      "sections",
      "Core sections",
      "warn",
      8,
      `Only ${count} of 3 core sections detected (${found.join(", ")}).`,
      "Use the standard headers — WORK EXPERIENCE, SKILLS, EDUCATION — so parsers can map your resume."
    );
  }
  return mkCheck(
    "sections",
    "Core sections",
    "fail",
    8,
    "No standard section headers (Experience / Skills / Education) were recognized.",
    "Restructure the resume with clear section headers on their own lines (Work Experience, Skills, Education)."
  );
}

function parseCheck(fileInfo: { parseOk: boolean; wordCount: number }): AtsCheck {
  const wc = fileInfo.wordCount;
  if (fileInfo.parseOk && wc >= 200) {
    return mkCheck(
      "parse",
      "Machine readability",
      "pass",
      10,
      `Text extracted cleanly — ${wc} words parsed.`
    );
  }
  if (wc >= 80) {
    return mkCheck(
      "parse",
      "Machine readability",
      "warn",
      10,
      `Only ${wc} words extracted${fileInfo.parseOk ? "" : " and the file parse reported issues"} — the document may be image-heavy or oddly encoded.`,
      "Re-export as a simple, text-based PDF (avoid scans, multi-column layouts and text boxes)."
    );
  }
  return mkCheck(
    "parse",
    "Machine readability",
    "fail",
    10,
    `Barely any text could be extracted (${wc} words) — most ATS systems would see a blank page.`,
    "Re-create the resume in a standard editor and export a text-based PDF; verify by copy-pasting from the file."
  );
}

function lengthCheck(wordCount: number): AtsCheck {
  const wc = wordCount;
  if (wc >= 350 && wc <= 1000) {
    return mkCheck(
      "length",
      "Resume length",
      "pass",
      6,
      `${wc} words — within the ideal 350–1000 word range.`
    );
  }
  if ((wc >= 200 && wc < 350) || (wc > 1000 && wc <= 1600)) {
    const hint = wc < 350 ? "short; add substance rather than padding" : "long; trim older or off-target roles";
    return mkCheck(
      "length",
      "Resume length",
      "warn",
      6,
      `${wc} words — ${hint} (target 350–1000).`,
      wc < 350
        ? "Expand key roles with more achievements and context to reach ~400+ words."
        : "Cut to the most relevant 10 years of experience; aim for under 1000 words."
    );
  }
  return mkCheck(
    "length",
    "Resume length",
    "fail",
    6,
    `${wc} words is far outside the 350–1000 word sweet spot recruiters expect.`,
    wc < 200
      ? "The resume is nearly empty — rebuild it with summary, experience bullets and skills."
      : "Severely over length — keep one page per ~10 years of experience."
  );
}

function quantifiedCheck(candidate: CandidateProfile): AtsCheck {
  const hits = candidate.quantifiedHits;
  if (hits >= 3) {
    return mkCheck(
      "quantified",
      "Quantified achievements",
      "pass",
      7,
      `${hits} quantified achievements found (numbers, %, $, or scale).`
    );
  }
  if (hits >= 1) {
    return mkCheck(
      "quantified",
      "Quantified achievements",
      "warn",
      7,
      `Only ${hits} quantified achievement${hits === 1 ? "" : "s"} detected — most bullets lack numbers.`,
      "Add metrics to your strongest bullets: %, $, time saved, team size, users served."
    );
  }
  return mkCheck(
    "quantified",
    "Quantified achievements",
    "fail",
    7,
    "No quantified achievements (%, $, counts, or scale) were found anywhere.",
    "Quantify at least 3–5 bullets, e.g. “cut p95 latency by 40%” or “owned a $2M budget”."
  );
}

function actionVerbsCheck(stats: BulletStats): AtsCheck {
  const { bulletCount, strongCount } = stats;
  if (bulletCount === 0) {
    return mkCheck(
      "action-verbs",
      "Action verbs",
      "fail",
      5,
      "No bullet lines were found to evaluate verb usage.",
      "Convert dense paragraphs into bullets that each start with a verb (Led, Built, Designed…)."
    );
  }
  const fraction = strongCount / bulletCount;
  const pct = Math.round(fraction * 100);
  if (fraction >= 0.5) {
    return mkCheck(
      "action-verbs",
      "Action verbs",
      "pass",
      5,
      `${strongCount} of ${bulletCount} bullets start with strong action verbs (${pct}%).`
    );
  }
  if (fraction >= 0.25) {
    return mkCheck(
      "action-verbs",
      "Action verbs",
      "warn",
      5,
      `Only ${strongCount} of ${bulletCount} bullets start with strong action verbs (${pct}%).`,
      "Open more bullets with impact verbs: Led, Built, Designed, Launched, Improved, Reduced, Automated."
    );
  }
  return mkCheck(
    "action-verbs",
    "Action verbs",
    "fail",
    5,
    `Only ${strongCount} of ${bulletCount} bullets start with strong action verbs (${pct}%).`,
    "Rewrite bullets to lead with strong verbs (Led, Built, Shipped, Improved) instead of nouns or “Responsible for”."
  );
}

function bulletsCheck(stats: BulletStats): AtsCheck {
  const { bulletCount, contentLines } = stats;
  if (contentLines === 0) {
    return mkCheck(
      "bullets",
      "Bullet formatting",
      "fail",
      5,
      "No content lines were found in the resume.",
      "Rebuild the resume with bulleted achievement lines under each role."
    );
  }
  const ratio = bulletCount / contentLines;
  const pct = Math.round(ratio * 100);
  if (ratio >= 0.4) {
    return mkCheck(
      "bullets",
      "Bullet formatting",
      "pass",
      5,
      `${bulletCount} of ${contentLines} content lines are bullets (${pct}%).`
    );
  }
  if (ratio >= 0.15) {
    return mkCheck(
      "bullets",
      "Bullet formatting",
      "warn",
      5,
      `Only ${bulletCount} of ${contentLines} content lines are bullets (${pct}%) — the rest is prose or headers.`,
      "Convert dense paragraphs into 1–2 line bullets so parsers and recruiters can scan fast."
    );
  }
  return mkCheck(
    "bullets",
    "Bullet formatting",
    "fail",
    5,
    `Almost no bullet points (${bulletCount} of ${contentLines} content lines).`,
    "Restructure each role into 3–6 bullet points starting with action verbs."
  );
}

function datesCheck(resumeText: string): AtsCheck {
  const stats = analyzeDates(resumeText);
  if (stats.instances === 0) {
    return mkCheck(
      "dates",
      "Date formatting",
      "fail",
      5,
      "No employment dates (Mon YYYY, MM/YYYY, or YYYY) were detected.",
      "Add month-year ranges for every role, e.g. “Jan 2020 – Mar 2022”, in one consistent format."
    );
  }
  const pct = Math.round(stats.dominantShare * 100);
  if (stats.instances >= 3 && stats.dominantShare >= 0.7) {
    return mkCheck(
      "dates",
      "Date formatting",
      "pass",
      5,
      `${stats.instances} date instances found; ${pct}% use one format (${stats.formats.join(", ")}).`
    );
  }
  if (stats.instances <= 2) {
    return mkCheck(
      "dates",
      "Date formatting",
      "warn",
      5,
      `Only ${stats.instances} date instance${stats.instances === 1 ? "" : "s"} found — too few to outline a career timeline.`,
      "Give every role a month-year range (e.g. “Jun 2022 – Present”)."
    );
  }
  return mkCheck(
    "dates",
    "Date formatting",
    "warn",
    5,
    `${stats.instances} date instances found but formats are mixed (${stats.formats.join(", ")}) — only ${pct}% share one style.`,
    "Standardize every date on a single “Mon YYYY” format."
  );
}

function titleAlignmentCheck(resumeText: string, job: JobProfile | null): AtsCheck {
  if (!job?.title) {
    return mkCheck(
      "title-alignment",
      "Title alignment",
      "warn",
      6,
      "No job title could be detected in the JD — title alignment was not assessed.",
      "Reference the target role’s exact title somewhere in your summary or headline."
    );
  }
  const tokens = job.title.match(/[A-Za-z][A-Za-z+#./-]*/g) ?? [];
  const meaningful = tokens.filter(
    (t) => t.length >= 3 && !isStopword(t.toLowerCase()) && !/^\d+$/.test(t)
  );
  if (meaningful.length === 0) {
    return mkCheck(
      "title-alignment",
      "Title alignment",
      "warn",
      6,
      `The JD title (“${job.title}”) yielded no comparable keywords.`,
      "Echo the target role’s key nouns (e.g. “full stack developer”) in your headline."
    );
  }
  const resumeStems = new Set(tokenize(resumeText).map(stem));
  const found = meaningful.filter(
    (t) =>
      countOccurrences(resumeText, t) > 0 ||
      resumeStems.has(stem(t.toLowerCase()))
  );
  const hitCount = found.length;
  if (hitCount === meaningful.length) {
    return mkCheck(
      "title-alignment",
      "Title alignment",
      "pass",
      6,
      `All ${meaningful.length} title keywords found in the resume: ${found.map((f) => f.toLowerCase()).join(", ")}.`
    );
  }
  if (hitCount >= meaningful.length / 2) {
    return mkCheck(
      "title-alignment",
      "Title alignment",
      "warn",
      6,
      `${hitCount} of ${meaningful.length} title keywords found (${found.map((f) => f.toLowerCase()).join(", ") || "none"}).`,
      `Mirror the JD’s title language — work “${job.title.toLowerCase()}” phrasing into your summary or most recent role title.`
    );
  }
  return mkCheck(
    "title-alignment",
    "Title alignment",
    "fail",
    6,
    `Only ${hitCount} of ${meaningful.length} keywords from the target title “${job.title}” appear in the resume.`,
    `Use the employer’s own words: mention “${job.title.toLowerCase()}” (or its core nouns) in your headline and summary.`
  );
}

function keywordDensityCheck(resumeText: string, jdText: string): AtsCheck {
  if (!jdText.trim()) {
    return mkCheck(
      "keyword-density",
      "Keyword density",
      "warn",
      8,
      "No job description supplied — keyword density could not be assessed.",
      "Paste the target JD so missing-keyword coverage can be scored."
    );
  }
  const salient = salientTerms(jdText, resumeText, 12);
  const presence = salientTermPresence(resumeText, salient, 12);
  if (presence.considered === 0) {
    return mkCheck(
      "keyword-density",
      "Keyword density",
      "warn",
      8,
      "The JD was too sparse to extract salient terms.",
      "Analyze against a fuller job description for meaningful keyword scoring."
    );
  }
  const pct = Math.round(presence.fraction * 100);
  const missingSample = presence.absent.slice(0, 3).map((t) => t.term).join(", ");
  if (presence.fraction >= 0.6) {
    return mkCheck(
      "keyword-density",
      "Keyword density",
      "pass",
      8,
      `${presence.present.length} of the JD's ${presence.considered} most salient terms appear in your resume (${pct}%).`
    );
  }
  if (presence.fraction >= 0.3) {
    return mkCheck(
      "keyword-density",
      "Keyword density",
      "warn",
      8,
      `${presence.present.length} of ${presence.considered} salient JD terms found (${pct}%)${missingSample ? `; missing e.g. ${missingSample}` : ""}.`,
      `Weave the JD's own vocabulary (${missingSample || "its key nouns"}) into your summary and bullets — only where truthful.`
    );
  }
  return mkCheck(
    "keyword-density",
    "Keyword density",
    "fail",
    8,
    `Only ${presence.present.length} of ${presence.considered} salient JD terms appear in your resume (${pct}%).`,
    `Rewrite your summary and skills around the JD's language — missing terms include ${missingSample || "most of its key vocabulary"}.`
  );
}

function skillsSectionCheck(candidate: CandidateProfile): AtsCheck {
  const skills = candidate.sections.find((s) => s.name === "Skills");
  if (skills) {
    return mkCheck(
      "skills-section",
      "Skills section",
      "pass",
      4,
      `Skills section detected (${skills.wordCount} words).`
    );
  }
  return mkCheck(
    "skills-section",
    "Skills section",
    "warn",
    4,
    "No dedicated Skills section was detected in the resume.",
    "Add a SKILLS header followed by a concise, comma-separated list of your tools and technologies."
  );
}

function educationDetailCheck(resumeText: string, candidate: CandidateProfile): AtsCheck {
  const institution =
    resumeText.match(/\b(university|college|institute|school|academy|polytechnic)\b/i)?.[0] ?? null;
  if (candidate.highestDegree && institution) {
    return mkCheck(
      "education-detail",
      "Education detail",
      "pass",
      4,
      `Degree (${candidate.highestDegree}) plus institution keyword (“${institution}”) both present.`
    );
  }
  if (candidate.highestDegree) {
    return mkCheck(
      "education-detail",
      "Education detail",
      "warn",
      4,
      `Degree found (${candidate.highestDegree}) but no institution name (University/College/Institute…).`,
      "Name the institution next to the degree — many parsers look for a school field."
    );
  }
  return mkCheck(
    "education-detail",
    "Education detail",
    "fail",
    4,
    "No degree or educational institution could be identified.",
    "List your highest credential and school, or state “equivalent practical experience” explicitly."
  );
}

function pronounsCheck(resumeText: string, wordCount: number): AtsCheck {
  const matches = resumeText.match(/\b(?:I|my|me|myself)\b/g) ?? [];
  const per100 = wordCount > 0 ? (matches.length / wordCount) * 100 : 0;
  const rate = Math.round(per100 * 10) / 10;
  if (per100 < 2) {
    return mkCheck(
      "pronouns",
      "First-person pronouns",
      "pass",
      4,
      `${matches.length} first-person pronouns ≈ ${rate} per 100 words — appropriately impersonal.`
    );
  }
  if (per100 < 4) {
    return mkCheck(
      "pronouns",
      "First-person pronouns",
      "warn",
      4,
      `${matches.length} first-person pronouns ≈ ${rate} per 100 words.`,
      "Rewrite “I led / my team” into achievement bullets (“Led a team…”)."
    );
  }
  return mkCheck(
    "pronouns",
    "First-person pronouns",
    "fail",
    4,
    `${matches.length} first-person pronouns ≈ ${rate} per 100 words — heavy for a resume.`,
    "Strip first-person voice: start bullets with verbs and let the work speak (Led X, Shipped Y)."
  );
}

function artifactsCheck(resumeText: string): AtsCheck {
  const lines = resumeText.split(/\r?\n/);
  const boxLines = lines.filter((l) => /[\u2500-\u257F]/.test(l)).length;
  const fffd = (resumeText.match(/\uFFFD/g) ?? []).length;
  const longSpaces = (resumeText.match(/ {9,}/g) ?? []).length;
  if (boxLines >= 5 || fffd >= 3) {
    return mkCheck(
      "artifacts",
      "Extraction artifacts",
      "fail",
      5,
      `Extraction artifacts detected: ${boxLines} lines with box-drawing characters, ${fffd} replacement characters (U+FFFD).`,
      "Re-export a single-column PDF from the source document — two-column layouts with borders garble ATS parsers."
    );
  }
  if (boxLines >= 1 || fffd >= 1 || longSpaces >= 1) {
    return mkCheck(
      "artifacts",
      "Extraction artifacts",
      "warn",
      5,
      `Minor artifacts detected: ${boxLines} box-drawing line(s), ${fffd} replacement character(s), ${longSpaces} long space run(s).`,
      "Clean up stray borders, tabs and oversized gaps; keep the layout single-column."
    );
  }
  return mkCheck(
    "artifacts",
    "Extraction artifacts",
    "pass",
    5,
    "No box-drawing characters, replacement characters or oversized spacing detected."
  );
}

function locationCheck(candidate: CandidateProfile): AtsCheck {
  if (candidate.location) {
    return mkCheck(
      "location",
      "Location",
      "pass",
      2,
      `Location found: ${candidate.location}.`
    );
  }
  return mkCheck(
    "location",
    "Location",
    "warn",
    2,
    "No location (city/state or “Remote”) was detected near your contact block.",
    "Add “City, ST” (or “Remote”) to your header — recruiters frequently filter on location."
  );
}

/* ── audit entry ──────────────────────────────────────────────── */

function atsLabel(score: number): string {
  if (score >= 85) return "ATS-ready";
  if (score >= 65) return "Mostly parseable";
  if (score >= 45) return "Risky parse";
  return "Likely rejected";
}

export interface AtsFileInfo {
  parseOk: boolean;
  wordCount: number;
}

/**
 * Run the 16-rule ATS audit. Every stage is defensive; a failure in a
 * single check degrades that check, never the whole audit.
 *
 * `jdText` (optional) powers the keyword-density check — the raw JD is
 * not recoverable from the parsed JobProfile.
 */
export function runAtsAudit(
  resumeText: string,
  candidate: CandidateProfile,
  job: JobProfile | null,
  fileInfo: AtsFileInfo,
  jdText = ""
): AtsReport {
  const checks: AtsCheck[] = [];
  const add = (fn: () => AtsCheck) => {
    try {
      checks.push(fn());
    } catch {
      // defensive: a failing heuristic must never kill the audit
    }
  };

  add(() => contactCheck(candidate));
  add(() => linksCheck(candidate));
  add(() => sectionsCheck(candidate));
  add(() => parseCheck(fileInfo));
  add(() => lengthCheck(fileInfo.wordCount));
  add(() => quantifiedCheck(candidate));
  add(() => {
    const stats = analyzeBullets(resumeText);
    return actionVerbsCheck(stats);
  });
  add(() => {
    const stats = analyzeBullets(resumeText);
    return bulletsCheck(stats);
  });
  add(() => datesCheck(resumeText));
  add(() => titleAlignmentCheck(resumeText, job));
  add(() => keywordDensityCheck(resumeText, jdText));
  add(() => skillsSectionCheck(candidate));
  add(() => educationDetailCheck(resumeText, candidate));
  add(() => pronounsCheck(resumeText, candidate.wordCount));
  add(() => artifactsCheck(resumeText));
  add(() => locationCheck(candidate));
  return finalize(checks);
}

function finalize(checks: AtsCheck[]): AtsReport {
  if (checks.length === 0) {
    return {
      score: 0,
      label: atsLabel(0),
      checks: [],
    };
  }
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0) || 1;
  const credit = checks.reduce(
    (sum, c) =>
      sum + (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0) * c.weight,
    0
  );
  const score = Math.round((100 * credit) / totalWeight);
  return { score, label: atsLabel(score), checks };
}
