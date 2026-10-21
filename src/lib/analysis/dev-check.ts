/**
 * BOUNDLESS · offline NLP engine — dev verification script
 * ─────────────────────────────────────────────────────────────────
 * NOT a test framework — a deterministic smoke/verification run with a
 * realistic (messy, PDF-extracted) ~450-word resume against the spec'd
 * Senior Full Stack Developer JD, plus a negative control (nursing JD)
 * that must score far below the positive case.
 *
 * Run:  npm run engine:check (from the repo root), or: bun run src/lib/analysis/dev-check.ts
 */
import { runAnalysis } from "./index";

/* ── realistic messy PDF-extracted resume (~450 words) ────────── */

const RESUME = `Jordan A. Rivera
San Francisco, CA 94107 · jordan.rivera.dev@gmail.com · (415) 555-0192
linkedin.com/in/jordanrivera · github.com/jrivera

SUMMARY
Full-stack developer with 6 years of experience building and shipping
user-facing features for modern web applications. Comfortable owning
projects from design through deployment, with expert-level React,
TypeScript, and Node.js skills and a bias for measurable results.

WORK EXPERIENCE

Senior Software Engineer — Northwind Analytics                            Jun 2022 – Present
• Led a squad of 4 engineers building a customer analytics platform in React and TypeScript, shipping 12 major features in 18 months
• Designed REST APIs in Node.js that serve 2M+ requests per day at p95 latency under 120ms
• Improved web performance of the marketing site, raising Lighthouse scores from 61 to 94 and lifting conversion by 23%
• Owned end-to-end delivery of product experiments, running 40+ A/B tests with the growth team
• Drove adoption of a code review checklist that cut production incidents by 30%
• Automated CI/CD release pipelines with GitHub Actions, reducing deploy time from 40 minutes to 6

Software Engineer — Bluebird Commerce                                     Feb 2020 – May 2022
• Built and maintained an e-commerce storefront with Next.js, React, and Tailwind CSS used by 80,000 monthly shoppers
• Designed the REST API for the payments service backed by PostgreSQL, handling 500,000 orders per month
• Wrote unit tests with Jest, raising code coverage from 45% to 88% across three owned services
• Improved accessibility of the checkout flow to WCAG 2.1 AA, increasing task completion for screen reader users by 15%
• Mentored 3 junior engineers through weekly pair programming sessions
• Partnered with product managers to triage the roadmap, cutting average cycle time by 25%

SKILLS
Languages & Frameworks: TypeScript, JavaScript (ES6+), HTML, CSS, Node.js, React, Next.js, GraphQL, SQL, PostgreSQL, REST API design
Tools & Practices: Git-based workflows, GitHub Actions (CI/CD), Jest testing, Agile, Jira, Figma, mentoring

PROJECTS
Trailfinder — open-source hiking trip planner (Next.js, PostgreSQL)
• Created a full-stack trip planner with offline-first maps, used by 15,000 monthly hikers

EDUCATION
B.S. in Computer Science, University of Washington — graduated 2020
Coursework in data structures, algorithms, databases, and distributed systems`;

/* ── the spec'd JD ─────────────────────────────────────────────── */

const JD = `We are seeking a Senior Full Stack Developer to join our Product Engineering team. Responsibilities: Build and ship user-facing features with React and TypeScript across our Next.js application; Design REST and GraphQL APIs in Node.js; Own end-to-end delivery of product experiments; Improve performance and accessibility of our web platform; Mentor junior engineers and drive code review culture. Requirements: 5+ years of professional software engineering experience; Expert-level JavaScript/TypeScript and modern React; Strong Node.js and REST API design experience; Experience with SQL databases (PostgreSQL preferred); Comfortable with Git-based workflows and CI/CD pipelines; Bachelor's degree in Computer Science or equivalent practical experience. Nice to have: Experience with GraphQL, Docker, Kubernetes, and cloud platforms (AWS/GCP); Familiarity with testing frameworks like Jest or Cypress; Experience with microservices and system design.`;

/* ── negative control: nursing JD (~30 words) ─────────────────── */

const NURSING_JD = `We are hiring a Registered Nurse to join our inpatient care team. Requirements: valid RN license, BLS certification, 2+ years of clinical experience in acute care, and strong patient assessment skills.`;

/* ── helpers ──────────────────────────────────────────────────── */

let failures = 0;

function expect(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}`);
  }
}

function divider(title: string): void {
  console.log(`\n${"─".repeat(72)}\n${title}\n${"─".repeat(72)}`);
}

/* ── positive control ─────────────────────────────────────────── */

function runPositive(): { overall: number; atsScore: number } {
  const result = runAnalysis({ resumeText: RESUME, jdText: JD, fileName: "jordan-rivera-resume.pdf" });

  divider("POSITIVE CONTROL — full-stack resume vs Senior Full Stack Developer JD");

  console.log(`Overall: ${result.scores.overall}   Verdict: ${result.scores.verdict.label} (${result.scores.verdict.tone})`);
  console.log(`ATS: ${result.scores.ats.score} (${result.scores.ats.label})`);

  console.log("\nDimensions:");
  for (const d of result.scores.dimensions) {
    console.log(`  [${String(d.score).padStart(3)}] ${d.label} (w=${d.weight}) — ${d.detail}`);
  }

  console.log("\nATS checks:");
  for (const c of result.scores.ats.checks) {
    console.log(`  ${c.status.toUpperCase().padEnd(4)} ${c.label} — ${c.detail}`);
  }

  console.log("\nCandidate profile:");
  console.log(`  name=${result.candidate.name}  email=${result.candidate.email}  phone=${result.candidate.phone}`);
  console.log(`  location=${result.candidate.location}  links=${result.candidate.links.length}`);
  console.log(`  years=${result.candidate.yearsExperience}  degree=${result.candidate.highestDegree}  words=${result.candidate.wordCount}`);
  console.log(`  quantifiedHits=${result.candidate.quantifiedHits}  sections=${result.candidate.sections.map((s) => s.name).join("/")}`);
  console.log(`  experience: ${result.experience.text} (jobs=${result.experience.jobCount})`);

  console.log("\nJob profile:");
  console.log(`  title=${result.job.title}  seniority=${result.job.seniority}  words=${result.job.wordCount}`);
  console.log(`  required=${result.job.requiredSkills.length}  preferred=${result.job.preferredSkills.length}  all=${result.job.allSkills.length}`);
  console.log(`  responsibilities=${result.job.responsibilities.length}`);
  for (const r of result.job.responsibilities) console.log(`    - ${r}`);

  console.log("\nMatched skills (first 10):");
  for (const m of result.skills.matched.slice(0, 10)) {
    console.log(`  OK   ${m.name} — ${m.required ? "required" : "preferred"}, resume=${m.resumeMentions} jd=${m.jdMentions}`);
  }
  console.log(`  … matched total: ${result.skills.matched.length}`);

  console.log("\nMissing skills (first 10):");
  for (const m of result.skills.missing.slice(0, 10)) {
    console.log(`  MISS ${m.name} — priority=${m.priority}, jd=${m.jdMentions}`);
  }
  console.log(`  … missing total: ${result.skills.missing.length}`);

  console.log("\nSalient JD terms (first 10):");
  for (const t of result.keywords.salient.slice(0, 10)) {
    console.log(`  ${t.term} (${t.score})`);
  }
  console.log(`  keywords found=${result.keywords.found.length} missing=${result.keywords.missing.length}`);

  console.log(`\nRecommendations (${result.recommendations.length}):`);
  for (const r of result.recommendations) {
    console.log(`  (${r.impact}) ${r.title} — ${r.detail.slice(0, 110)}${r.detail.length > 110 ? "…" : ""}`);
  }

  divider("SANITY — positive control");
  expect(result.scores.overall >= 60 && result.scores.overall <= 90, `overall ${result.scores.overall} within 60–90`);
  const matchedNames = result.skills.matched.map((m) => m.name.toLowerCase());
  const missingNames = result.skills.missing.map((m) => m.name.toLowerCase());
  expect(matchedNames.includes("react"), "React matched");
  expect(matchedNames.includes("typescript"), "TypeScript matched");
  expect(matchedNames.includes("node.js"), "Node.js matched");
  expect(matchedNames.includes("postgresql"), "PostgreSQL matched");
  expect(!matchedNames.includes("docker"), "Docker not falsely matched");
  expect(missingNames.includes("kubernetes"), "Kubernetes missing (absent from resume)");
  expect(missingNames.includes("docker"), "Docker missing (absent from resume)");
  expect(result.job.seniority === "Senior", `seniority detected as Senior (got ${result.job.seniority})`);
  expect(result.job.responsibilities.length >= 3, `responsibilities extracted (${result.job.responsibilities.length})`);
  expect(result.recommendations.length >= 4 && result.recommendations.length <= 6, `4–6 recommendations (got ${result.recommendations.length})`);
  expect(result.candidate.wordCount >= 350, `resume word count ≥ 350 (got ${result.candidate.wordCount})`);

  return { overall: result.scores.overall, atsScore: result.scores.ats.score };
}

/* ── negative control ─────────────────────────────────────────── */

function runNegative(): number {
  const result = runAnalysis({ resumeText: RESUME, jdText: NURSING_JD, fileName: null });

  divider("NEGATIVE CONTROL — same resume vs nursing JD");
  console.log(`Overall: ${result.scores.overall}   Verdict: ${result.scores.verdict.label} (${result.scores.verdict.tone})`);
  console.log(`ATS: ${result.scores.ats.score} (${result.scores.ats.label})`);
  console.log(`Job: title=${result.job.title}  seniority=${result.job.seniority}  allSkills=${result.job.allSkills.length}`);
  console.log(`Matched: ${result.skills.matched.length}  Missing: ${result.skills.missing.length}`);
  for (const d of result.scores.dimensions) {
    console.log(`  [${String(d.score).padStart(3)}] ${d.label} — ${d.detail}`);
  }

  divider("SANITY — negative control");
  expect(result.scores.overall < 40, `overall ${result.scores.overall} < 40`);

  return result.scores.overall;
}

/* ── main ──────────────────────────────────────────────────────── */

function main(): void {
  const positive = runPositive();
  const negative = runNegative();

  divider("SUMMARY");
  console.log(`positive: overall=${positive.overall} ats=${positive.atsScore}`);
  console.log(`negative (nursing): overall=${negative}`);
  console.log(failures === 0 ? "\nALL SANITY CHECKS PASSED ✔" : `\n${failures} SANITY CHECK(S) FAILED ✘`);
  if (failures > 0) process.exitCode = 1;
}

main();
