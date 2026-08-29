"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Plus,
} from "lucide-react";
import { DEMO, type MissingSkill } from "./data";
import { useEntered } from "./hooks";
import { ScoreRing } from "./score-ring";
import type { KeywordFilter } from "./types";

interface ResultsScreenProps {
  onOpenSkill: (skill: MissingSkill) => void;
  onNewAnalysis: () => void;
}

const PRIORITY_LABEL: Record<MissingSkill["priority"], string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

export function ResultsScreen({ onOpenSkill, onNewAnalysis }: ResultsScreenProps) {
  const entered = useEntered();
  const [filter, setFilter] = useState<KeywordFilter>("all");

  const keywords = useMemo(
    () => [
      ...DEMO.keywords.found.map((k) => ({ keyword: k, found: true })),
      ...DEMO.keywords.missing.map((k) => ({ keyword: k, found: false })),
    ],
    [],
  );

  const visible = keywords.filter((item) =>
    filter === "all" ? true : filter === "found" ? item.found : !item.found,
  );

  const filters: { id: KeywordFilter; label: string }[] = [
    { id: "all", label: `All ${keywords.length}` },
    { id: "found", label: `Found ${DEMO.keywords.found.length}` },
    { id: "missing", label: `Missing ${DEMO.keywords.missing.length}` },
  ];

  return (
    <div className="wrap screen">
      <div className="results-top">
        <button className="text-btn" onClick={onNewAnalysis}>
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          New analysis
        </button>
        <span className="block-meta">Sample analysis</span>
      </div>

      {/* ── Header + score ──────────────────────────────────── */}
      <h1 className="results-title" id="screen-title" tabIndex={-1}>
        Your match for {DEMO.role}
      </h1>
      <p className="results-meta">
        For {DEMO.candidate} · Based on your resume and the target role
      </p>

      <section className={`score-card ${entered ? "is-in" : ""}`} aria-label="Match overview">
        <div className="score-main">
          <ScoreRing value={DEMO.overall} label={DEMO.verdict} />
          <span className="verdict-pill">
            <span className="verdict-dot" aria-hidden="true" />
            {DEMO.verdict}
          </span>
          <p className="verdict-note">{DEMO.verdictNote}</p>
        </div>

        <div className="score-divider" aria-hidden="true" />

        <div className="breakdown">
          <div className="block-head">
            <h2 className="h2">Score breakdown</h2>
            <span className="block-meta">Four weighted areas</span>
          </div>
          <div className="breakdown-grid">
            {DEMO.breakdown.map((item) => (
              <div className="metric" key={item.label}>
                <div className="metric-top">
                  <span className="metric-label">{item.label}</span>
                  <span className="metric-value">{item.score}%</span>
                </div>
                <div className="bar">
                  <div
                    className="bar-fill"
                    style={{ "--fill": item.score / 100 } as React.CSSProperties}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Matched skills ──────────────────────────────────── */}
      <section className="block" aria-labelledby="matched-heading">
        <div className="block-head">
          <h2 className="h2" id="matched-heading">
            You already match
          </h2>
          <span className="block-meta">
            {DEMO.matchedSkills.length} skills detected
          </span>
        </div>
        <ul className="chip-row stagger">
          {DEMO.matchedSkills.map((skill, i) => (
            <li
              className="chip"
              key={skill}
              style={{ "--i": i } as React.CSSProperties}
            >
              <Check className="chip-check" size={14} strokeWidth={2.25} aria-hidden="true" />
              {skill}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Missing skills ──────────────────────────────────── */}
      <section className="block" aria-labelledby="missing-heading">
        <div className="block-head">
          <h2 className="h2" id="missing-heading">
            Skills worth strengthening
          </h2>
          <span className="block-meta">{DEMO.missingSkills.length} gaps found</span>
        </div>
        <p className="block-sub">
          Open a skill to see why it matters and how to address it.
        </p>
        <div className="gap-list">
          {DEMO.missingSkills.map((skill) => (
            <button
              className="gap-row"
              key={skill.name}
              onClick={() => onOpenSkill(skill)}
              aria-haspopup="dialog"
            >
              <span className="gap-main">
                {skill.name}
                <span className={`priority priority--${skill.priority}`}>
                  {PRIORITY_LABEL[skill.priority]}
                </span>
              </span>
              <span className="gap-why">{skill.why}</span>
              <ChevronRight
                className="gap-chevron"
                size={18}
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </section>

      {/* ── Keyword alignment ───────────────────────────────── */}
      <section className="block" aria-labelledby="keywords-heading">
        <div className="block-head">
          <h2 className="h2" id="keywords-heading">
            Keyword alignment
          </h2>
          <div className="segmented" role="group" aria-label="Filter keywords">
            {filters.map((f) => (
              <button
                key={f.id}
                className="seg-btn"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <p className="block-sub">
          {DEMO.keywords.found.length} of {keywords.length} keywords from the
          posting appear in your resume.
        </p>
        {/* key={filter} restarts the stagger when the filter changes */}
        <ul className="chip-row stagger" key={filter}>
          {visible.map((item, i) => (
            <li
              className={`chip ${item.found ? "" : "chip--missing"}`}
              key={item.keyword}
              style={{ "--i": i } as React.CSSProperties}
            >
              {item.found ? (
                <Check className="chip-check" size={14} strokeWidth={2.25} aria-hidden="true" />
              ) : (
                <Plus className="chip-plus" size={14} strokeWidth={2} aria-hidden="true" />
              )}
              {item.keyword}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Recommendations ─────────────────────────────────── */}
      <section className="block" aria-labelledby="recs-heading">
        <div className="block-head">
          <h2 className="h2" id="recs-heading">
            Before you apply
          </h2>
          <span className="block-meta">Three practical fixes</span>
        </div>
        <ol className="rec-list">
          {DEMO.recommendations.map((rec, i) => (
            <li className="rec-item" key={rec.title}>
              <span className="rec-num" aria-hidden="true">
                0{i + 1}
              </span>
              <div>
                <h3 className="rec-title">{rec.title}</h3>
                <p className="rec-body">{rec.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Next step ───────────────────────────────────────── */}
      <div className="results-cta">
        <button className="btn btn-primary btn-lg" onClick={onNewAnalysis}>
          Analyze another role
        </button>
        <p className="analyze-hint">
          Your resume stays put. Swap in a new job description to compare.
        </p>
      </div>
    </div>
  );
}
