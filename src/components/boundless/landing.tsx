"use client";

import { ArrowRight } from "lucide-react";
import { DEMO } from "./data";
import { useEntered } from "./hooks";
import { ScoreRing } from "./score-ring";

interface LandingProps {
  onStart: () => void;
  onSeeHow: () => void;
}

/** What sets Boundless apart from typical ATS checkers. */
const DIFFERENTIATORS = [
  {
    title: "A score you can audit",
    body: "The overall number breaks into four weighted dimensions — skills, experience, keywords, and education — so you always know what is driving your match, not just whether you have one.",
  },
  {
    title: "Every gap comes with evidence",
    body: "Missing skills are not red ink. Each one shows where it was detected in the posting, why it matters for this role, and a concrete way to address it.",
  },
  {
    title: "Priorities, not panic",
    body: "Gaps are ranked high, medium, and low, so you spend your evening on the fix that actually moves your score — and can let the rest wait.",
  },
  {
    title: "Alignment, not keyword stuffing",
    body: "See exactly which words from the posting appear in your resume and which don't, so every edit is a deliberate choice instead of gaming a filter.",
  },
  {
    title: "Honest by design",
    body: "Boundless never suggests inventing experience. Every recommendation starts from what you have actually done and shows how to say it better.",
  },
] as const;

/** Miniature of the real results UI, used as the hero preview. */
function PreviewCard() {
  const entered = useEntered();

  return (
    <div
      className="preview-card rise"
      style={{ animationDelay: "240ms" }}
      aria-label="Sample match result: 78 percent, strong match"
    >
      <div className="preview-head">
        <span className="tag">Match score</span>
        <span className="tag">Sample</span>
      </div>

      <div className={`preview-body ${entered ? "is-in" : ""}`}>
        <ScoreRing value={DEMO.overall} label={DEMO.verdict} size={148} stroke={8} />
        <div className="preview-bars">
          {DEMO.breakdown.slice(0, 3).map((item) => (
            <div className="metric" key={item.label}>
              <div className="metric-top">
                <span className="metric-label">{item.label}</span>
                <span className="metric-value">{item.score}%</span>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ "--fill": item.score / 100 } as React.CSSProperties} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="preview-foot">
        <div className="preview-chips">
          {["React", "TypeScript", "Node.js"].map((skill) => (
            <span className="chip" key={skill}>
              {skill}
            </span>
          ))}
          <span className="chip-more">+5 more</span>
        </div>
        <span className="tag">Strong match</span>
      </div>
    </div>
  );
}

export function Landing({ onStart, onSeeHow }: LandingProps) {
  return (
    <div className="screen">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="stagger">
            <p className="eyebrow" style={{ "--i": 0 } as React.CSSProperties}>
              Resume intelligence
            </p>
            <h1 className="display" style={{ "--i": 1 } as React.CSSProperties}>
              Know how well your resume matches the job.
            </h1>
            <p className="lede" style={{ "--i": 2 } as React.CSSProperties}>
              Upload your resume, paste the job description, and discover your
              strengths, gaps, and opportunities before you apply.
            </p>
            <div className="hero-cta" style={{ "--i": 3 } as React.CSSProperties}>
              <button className="btn btn-primary btn-lg" onClick={onStart}>
                Analyze my resume
                <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
              <button className="btn btn-ghost btn-lg" onClick={onSeeHow}>
                See how it works
              </button>
            </div>
          </div>

          <PreviewCard />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="section" id="how-it-works" style={{ scrollMarginTop: 88 }}>
        <div className="wrap">
          <div className="block-head">
            <h2 className="h2">How it works</h2>
            <span className="block-meta">Three steps, about a minute</span>
          </div>
          <div className="steps-grid">
            <div>
              <span className="step-num">01</span>
              <p className="step-title">Upload your resume</p>
              <p className="step-text">
                Add your current resume as a PDF or DOCX, up to 10 MB. Nothing
                leaves your screen in this demo.
              </p>
            </div>
            <div>
              <span className="step-num">02</span>
              <p className="step-title">Add the job description</p>
              <p className="step-text">
                Paste the full posting, from responsibilities to requirements.
                The more complete it is, the more accurate the read.
              </p>
            </div>
            <div>
              <span className="step-num">03</span>
              <p className="step-title">Read your match</p>
              <p className="step-text">
                See your score, the skills you already meet, the gaps worth
                closing, and what to do before you apply.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why different ─────────────────────────────────────── */}
      <section className="section" id="why-boundless" style={{ scrollMarginTop: 88 }}>
        <div className="wrap">
          <div className="block-head">
            <h2 className="h2">Why Boundless is different</h2>
            <span className="block-meta">Beyond the typical resume scanner</span>
          </div>
          <p className="about-lede">
            Most resume scanners end at a score. Boundless starts there — every
            result is built to be understood, prioritized, and acted on
            honestly.
          </p>
          <ol className="diff-list">
            {DIFFERENTIATORS.map((item, i) => (
              <li className="diff-item" key={item.title}>
                <span className="diff-num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="diff-title">{item.title}</h3>
                  <p className="diff-body">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── About ────────────────────────────────────────────── */}
      <section className="section" id="about" style={{ scrollMarginTop: 88 }}>
        <div className="wrap">
          <h2 className="h2">About Boundless</h2>
          <p className="about-lede">
            Boundless makes resume-to-role alignment visible. Instead of
            guessing whether a posting is worth your evening, you get a clear
            picture: what fits, what is missing, and what to fix first. The
            current build is a design prototype, so every result you see runs
            on carefully written sample data.
          </p>
          <p className="about-tagline">Aligning your resume with endless possibilities.</p>
        </div>
      </section>
    </div>
  );
}
