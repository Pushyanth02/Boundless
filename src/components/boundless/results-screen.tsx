"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarRange,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import type { AnalysisResult, MatchedSkill, MissingSkill } from "@/lib/analysis/types";
import { Meter, ScoreRing, scoreColor } from "./primitives";
import { AiPanel, type AiState } from "./ai-panel";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Section wrapper ────────────────────────────────────────────── */

function Panel({
  eyebrow,
  title,
  children,
  right,
  delay = 0,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className="card-b grain p-[clamp(1.25rem,3vw,1.75rem)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="display-sm mt-1.5 !text-[1.35rem]" style={{ fontWeight: 600 }}>
            {title}
          </h2>
        </div>
        {right}
      </div>
      {children}
    </motion.section>
  );
}

/* ── Radar chart (5 axes) ───────────────────────────────────────── */

function Radar({ dimensions, ats }: { dimensions: AnalysisResult["scores"]["dimensions"]; ats: number }) {
  const axes = [
    ...dimensions.map((d) => ({ label: d.label, value: d.score })),
    { label: "ATS", value: ats },
  ];
  const size = 230;
  const c = size / 2;
  const r = 82;
  const n = axes.length;
  const pt = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + radius * Math.cos(angle), c + radius * Math.sin(angle)] as const;
  };
  const ring = (radius: number) =>
    axes.map((_, i) => pt(i, radius).join(",")).join(" ");
  const shape = axes.map((a, i) => pt(i, (Math.min(100, Math.max(0, a.value)) / 100) * r).join(",")).join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Radar chart: ${axes.map((a) => `${a.label} ${a.value}`).join(", ")}`}
      className="mx-auto"
    >
      {[0.33, 0.66, 1].map((f) => (
        <polygon key={f} points={ring(r * f)} fill="none" stroke="var(--hairline)" strokeWidth="1" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, r);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--hairline)" strokeWidth="1" />;
      })}
      <motion.polygon
        points={shape}
        fill="color-mix(in srgb, var(--ember) 16%, transparent)"
        stroke="var(--ember)"
        strokeWidth="2"
        strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.6 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
        style={{ transformOrigin: `${c}px ${c}px` }}
      />
      {axes.map((a, i) => {
        const [x, y] = pt(i, (Math.min(100, Math.max(0, a.value)) / 100) * r);
        return <circle key={a.label} cx={x} cy={y} r="3" fill="var(--ember)" />;
      })}
      {axes.map((a, i) => {
        const [x, y] = pt(i, r + 18);
        return (
          <text
            key={a.label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fontWeight="600"
            fill="var(--ink-2)"
            style={{ fontFamily: "var(--font-geist-mono), monospace", letterSpacing: "0.08em" }}
          >
            {a.label.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

/* ── Missing-skill drawer ───────────────────────────────────────── */

function SkillDrawer({ skill, aiHint, onClose }: { skill: MissingSkill | null; aiHint: string; onClose: () => void }) {
  useEffect(() => {
    if (!skill) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skill, onClose]);

  return (
    <AnimatePresence>
      {skill ? (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            role="dialog"
            aria-label={`Gap details: ${skill.name}`}
            className="fixed z-50 bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:right-6 sm:top-1/2 sm:-translate-y-1/2 w-full sm:w-[400px] card-b !rounded-b-none sm:!rounded-[var(--radius-xl)] p-6 max-h-[70vh] overflow-y-auto"
            initial={{ opacity: 0, y: 60, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ duration: 0.42, ease: EASE }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Skill gap</p>
                <h3 className="display-sm mt-1.5 !text-[1.4rem]" style={{ fontWeight: 600 }}>
                  {skill.name}
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`chip !text-[0.72rem] ${skill.priority === "high" ? "chip-bad" : skill.priority === "medium" ? "chip-warn" : ""}`}>
                    {skill.priority} priority
                  </span>
                  <span className="chip !text-[0.72rem]">{skill.category}</span>
                  {skill.required ? (
                    <span className="chip chip-ember !text-[0.72rem]">required by JD</span>
                  ) : (
                    <span className="chip !text-[0.72rem]">nice-to-have</span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-3)] hover:bg-[var(--paper-2)] cursor-pointer"
                aria-label="Close gap details"
                autoFocus
              >
                <X size={16} />
              </button>
            </div>
            <div className="divider my-5" />
            <p className="body-2">
              Mentioned <strong>{skill.jdMentions}×</strong> in the job description, zero evidence in
              your resume.
            </p>
            <p className="!text-[0.88rem] leading-[1.65] mt-3" style={{ color: "var(--ember-deep)" }}>
              <span className="num-marker">→ </span>
              {aiHint}
            </p>
            <p className="mono !text-[0.66rem] text-[var(--ink-3)] mt-5">
              {`engine note · alias- and stem-matched, fuzzy threshold 0.92`}
            </p>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

/* ── ATS check row ──────────────────────────────────────────────── */

function AtsRow({ check }: { check: AnalysisResult["scores"]["ats"]["checks"][number] }) {
  const icon =
    check.status === "pass" ? (
      <CheckCircle2 size={17} style={{ color: "var(--ok)" }} />
    ) : check.status === "warn" ? (
      <AlertTriangle size={17} style={{ color: "var(--warn)" }} />
    ) : (
      <XCircle size={17} style={{ color: "var(--bad)" }} />
    );
  return (
    <li className="flex items-start gap-3 py-3 border-b border-hairline last:border-0">
      <span className="mt-[2px] shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[0.9rem]" style={{ fontWeight: 600 }}>
          {check.label}
          <span className="mono !text-[0.65rem] ml-2 text-[var(--ink-3)]">
            w{check.weight} · {check.status}
          </span>
        </p>
        <p className="body-2 !text-[0.83rem] !mt-0.5">{check.detail}</p>
        {check.fix && check.status !== "pass" ? (
          <p className="!text-[0.83rem] !mt-1.5 leading-[1.6]" style={{ color: "var(--ember-deep)" }}>
            <span className="num-marker">fix </span>
            {check.fix}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/* ── Main results screen ────────────────────────────────────────── */

interface ResultsScreenProps {
  analysisId: string;
  result: AnalysisResult;
  aiState: AiState;
  setAiState: (s: AiState) => void;
  onOpenSettings: () => void;
  onRestart: () => void;
}

export function ResultsScreen({
  analysisId,
  result,
  aiState,
  setAiState,
  onOpenSettings,
  onRestart,
}: ResultsScreenProps) {
  const { scores, skills, keywords, candidate, job, experience } = result;
  const [skillFilter, setSkillFilter] = useState<"all" | "required" | "preferred">("all");
  const [gap, setGap] = useState<MissingSkill | null>(null);

  const requiredTotal = job.requiredSkills.length;
  const requiredMatched = skills.matched.filter((s) => s.required).length;
  const ai = aiState.phase === "done" ? aiState.ai : null;

  const aiHintFor = (s: MissingSkill): string =>
    ai?.gapNarratives.find((g) => g.skill.toLowerCase() === s.name.toLowerCase())?.suggestion ??
    (s.required
      ? `This is a stated requirement — weave it into a project bullet where you've touched adjacent tooling, or close the gap with focused practice before applying.`
      : `A nice-to-have. A single honest bullet of adjacent experience beats keyword stuffing.`);

  const copyReport = async () => {
    const lines = [
      `BOUNDLESS — MATCH REPORT`,
      `${result.meta.analyzedAt}`,
      ``,
      `Overall: ${scores.overall}/100 (${scores.verdict.label})`,
      `ATS readiness: ${scores.ats.score}/100 (${scores.ats.label})`,
      ``,
      `DIMENSIONS`,
      ...scores.dimensions.map((d) => `- ${d.label}: ${d.score}/100 — ${d.detail}`),
      ``,
      `SKILLS`,
      `- Matched (${skills.matched.length}): ${skills.matched.map((s) => s.name).join(", ")}`,
      `- Missing (${skills.missing.length}): ${skills.missing.map((s) => `${s.name} (${s.priority})`).join(", ")}`,
      ``,
      `ATS AUDIT`,
      ...scores.ats.checks.map((c) => `- [${c.status.toUpperCase()}] ${c.label}: ${c.detail}`),
      ``,
      `RECOMMENDATIONS`,
      ...result.recommendations.map((r, i) => `${i + 1}. ${r.title} — ${r.detail}`),
      ``,
      ai ? `AI INSIGHTS (${ai.model})\n${ai.summary}` : `AI INSIGHTS — not generated (offline mode)`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Report copied to clipboard");
    } catch {
      toast.error("Could not access the clipboard");
    }
  };

  const grouped = useMemo(
    () => ({
      pass: scores.ats.checks.filter((c) => c.status === "pass"),
      warn: scores.ats.checks.filter((c) => c.status === "warn"),
      fail: scores.ats.checks.filter((c) => c.status === "fail"),
    }),
    [scores.ats.checks]
  );

  const visibleSkills = useMemo(() => {
    const map = new Map<string, MissingSkill>();
    const src =
      skillFilter === "all"
        ? skills.missing
        : skills.missing.filter((s) => (skillFilter === "required" ? s.required : !s.required));
    src.forEach((s) => map.set(s.name, s));
    return Array.from(map.values()).sort(
      (a, b) => ({ high: 0, medium: 1, low: 2 })[a.priority] - ({ high: 0, medium: 1, low: 2 })[b.priority] || b.jdMentions - a.jdMentions
    );
  }, [skills.missing, skillFilter]);

  return (
    <div className="wrap flex-1 w-full py-[clamp(1.75rem,4.5vh,3rem)] space-y-5">
      {/* ── Score hero ─────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: EASE }}
        className="card-b grain relative overflow-hidden p-[clamp(1.5rem,3.5vw,2.25rem)]"
      >
        <div className="grid gap-8 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="flex flex-col items-center gap-3">
            <ScoreRing score={scores.overall} size={172} thickness={11} label="Match" />
            <span
              className="chip mono !text-[0.7rem]"
              style={{
                background: scores.verdict.tone === "strong" ? "var(--ok-soft)" : scores.verdict.tone === "moderate" ? "var(--warn-soft)" : "var(--bad-soft)",
                color: scores.verdict.tone === "strong" ? "var(--ok)" : scores.verdict.tone === "moderate" ? "var(--warn)" : "var(--bad)",
                borderColor: "transparent",
              }}
            >
              {scores.verdict.label}
            </span>
          </div>

          <div className="min-w-0">
            <p className="eyebrow">Match report</p>
            <h1 className="display-md mt-2" style={{ fontWeight: 600 }}>
              {job.title ?? "The role"}
              {job.seniority ? <span className="text-[var(--ink-3)]"> · {job.seniority}</span> : null}
            </h1>

            <p className="body-2 !mt-3 !text-[0.92rem]">
              {requiredTotal > 0
                ? `${requiredMatched} of ${requiredTotal} required skills evidenced · ${skills.matched.length} matched overall · ${skills.missing.length} gaps`
                : `${skills.matched.length} matched skills · ${skills.missing.length} gaps`}
              {experience.yearsDetected !== null ? ` · ≈${experience.yearsDetected} yrs detected` : ""}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {candidate.name ? <span className="chip mono !text-[0.7rem]">{candidate.name}</span> : null}
              {candidate.email ? (
                <span className="chip mono !text-[0.7rem]"><Mail size={11} /> email found</span>
              ) : null}
              {candidate.phone ? (
                <span className="chip mono !text-[0.7rem]"><Phone size={11} /> phone found</span>
              ) : null}
              {candidate.location ? (
                <span className="chip mono !text-[0.7rem]"><MapPin size={11} /> {candidate.location}</span>
              ) : null}
              {candidate.highestDegree ? (
                <span className="chip mono !text-[0.7rem]"><GraduationCap size={11} /> {candidate.highestDegree}</span>
              ) : null}
              {experience.yearsDetected !== null ? (
                <span className="chip mono !text-[0.7rem]"><CalendarRange size={11} /> {experience.yearsDetected} yrs</span>
              ) : null}
              <span className="chip mono !text-[0.7rem]">{candidate.wordCount} words</span>
              {candidate.links.slice(0, 2).map((l) => (
                <a
                  key={l}
                  href={l.startsWith("http") ? l : `https://${l}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip mono !text-[0.7rem] hover:border-[var(--ember)] transition-colors"
                >
                  <ExternalLink size={11} /> {l.replace(/^https?:\/\//, "").slice(0, 28)}
                </a>
              ))}
            </div>

            <p className="mono !text-[0.65rem] text-[var(--ink-3)] mt-4">
              {ai ? `AI-ENHANCED · ${ai.model}` : "OFFLINE ENGINE · deterministic"} ·{" "}
              {new Date(result.meta.analyzedAt).toLocaleString()}
              {result.meta.fileName && result.meta.fileName !== "pasted-text" ? ` · ${result.meta.fileName}` : ""}
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 md:pl-6 md:border-l border-hairline">
            <ScoreRing score={scores.ats.score} size={128} thickness={9} label="ATS" />
            <span
              className="inline-flex items-center gap-1.5 mono !text-[0.68rem]"
              style={{ color: scores.ats.score >= 65 ? "var(--ok)" : scores.ats.score >= 45 ? "var(--warn)" : "var(--bad)" }}
            >
              {scores.ats.score >= 65 ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
              {scores.ats.label}
            </span>
          </div>
        </div>
      </motion.section>

      {/* ── Dimensions + radar ─────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Panel eyebrow="Weighted dimensions" title="How the score composes">
          <div className="space-y-5">
            {scores.dimensions.map((d, i) => (
              <div key={d.key}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-medium text-[0.92rem]" style={{ fontWeight: 600 }}>
                    {d.label}
                    <span className="mono !text-[0.65rem] ml-2 text-[var(--ink-3)]">
                      weight {Math.round(d.weight * 100)}%
                    </span>
                  </p>
                  <span className="mono text-[0.85rem] tabular-nums font-semibold" style={{ color: scoreColor(d.score) }}>
                    {d.score}
                  </span>
                </div>
                <div className="mt-2">
                  <Meter value={d.score} delay={0.15 + i * 0.14} />
                </div>
                <p className="body-2 !text-[0.8rem] !mt-1.5">{d.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="At a glance" title="The shape of the fit" delay={0.08}>
          <Radar dimensions={scores.dimensions} ats={scores.ats.score} />
        </Panel>
      </div>

      {/* ── Skills ─────────────────────────────────────────────── */}
      <Panel
        eyebrow="Skills"
        title={`${skills.matched.length} matched · ${skills.missing.length} missing`}
        right={
          <div className="seg" role="group" aria-label="Filter matched skills">
            {(["all", "required", "preferred"] as const).map((f) => (
              <button key={f} className="seg-item" data-active={skillFilter === f} onClick={() => setSkillFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        }
      >
        {skills.matched.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.matched
              .filter((s) => (skillFilter === "all" ? true : skillFilter === "required" ? s.required : !s.required))
              .map((s, i) => (
                <motion.span
                  key={s.name}
                  className="chip chip-ok"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5), duration: 0.35, ease: EASE }}
                >
                  <BadgeCheck size={13} />
                  {s.name}
                  <span className="mono !text-[0.62rem] opacity-60">×{s.resumeMentions}</span>
                </motion.span>
              ))}
          </div>
        ) : (
          <p className="body-2">No matched skills under this filter.</p>
        )}

        <div className="divider my-5" />

        {visibleSkills.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {visibleSkills.map((s, i) => (
              <motion.li
                key={s.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.4, ease: EASE }}
              >
                <button
                  onClick={() => setGap(s)}
                  className="w-full text-left flex items-center gap-3 rounded-[var(--radius-lg)] border border-hairline bg-[var(--paper-2)] px-3.5 py-3 transition-all duration-200 hover:border-[var(--ember)] hover:-translate-y-[1px] cursor-pointer"
                  aria-label={`Details for missing skill ${s.name}`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: s.priority === "high" ? "var(--bad)" : s.priority === "medium" ? "var(--warn)" : "var(--ink-3)" }}
                    aria-hidden="true"
                  />
                  <span className="font-medium text-[0.88rem] flex-1 truncate" style={{ fontWeight: 550 }}>
                    {s.name}
                  </span>
                  <span className="mono !text-[0.62rem] text-[var(--ink-3)] shrink-0">
                    {s.required ? "required" : "preferred"} · {s.jdMentions}×jd
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
        ) : (
          <p className="body-2" style={{ color: "var(--ok)" }}>
            Nothing missing under this filter — every listed skill is evidenced.
          </p>
        )}
      </Panel>

      {/* ── Keywords ───────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Keyword alignment" title="The JD's salient terms">
          {keywords.found.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {keywords.found.map((k) => (
                <span key={k.term} className="chip chip-ok">
                  {k.term}
                  <span className="mono !text-[0.62rem] opacity-60">{k.resumeMentions}×</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="body-2">None of the salient terms were found in the resume.</p>
          )}
          {keywords.missing.length > 0 ? (
            <>
              <div className="divider my-4" />
              <div className="flex flex-wrap gap-2">
                {keywords.missing.map((k) => (
                  <span key={k.term} className="chip chip-bad">
                    <X size={12} />
                    {k.term}
                    <span className="mono !text-[0.62rem] opacity-60">{k.jdMentions}×jd</span>
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </Panel>

        <Panel eyebrow="TF-IDF salience" title="What the JD emphasizes" delay={0.08}>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {keywords.salient.slice(0, 14).map((t, i) => (
              <div key={t.term}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[0.86rem] font-medium truncate">{t.term}</span>
                  <span className="mono !text-[0.66rem] text-[var(--ink-3)]">{t.score.toFixed(2)}</span>
                </div>
                <div className="meter !h-[5px] mt-1">
                  <div
                    className="meter-fill"
                    style={{
                      width: `${Math.round(t.score * 100)}%`,
                      background: "var(--ember)",
                      transitionDelay: `${0.2 + i * 0.06}s`,
                    }}
                  />
                </div>
              </div>
            ))}
            {keywords.salient.length === 0 ? <p className="body-2">No salient terms extracted.</p> : null}
          </div>
        </Panel>
      </div>

      {/* ── ATS audit ──────────────────────────────────────────── */}
      <Panel
        eyebrow="ATS audit"
        title={`${scores.ats.score}/100 — ${scores.ats.label}`}
        right={
          <div className="flex gap-2">
            <span className="chip chip-ok mono !text-[0.66rem]">{grouped.pass.length} pass</span>
            <span className="chip chip-warn mono !text-[0.66rem]">{grouped.warn.length} warn</span>
            <span className="chip chip-bad mono !text-[0.66rem]">{grouped.fail.length} fail</span>
          </div>
        }
      >
        <ul className="[&>li]:border-b">
          {[...grouped.fail, ...grouped.warn, ...grouped.pass].map((c) => (
            <AtsRow key={c.id} check={c} />
          ))}
        </ul>
      </Panel>

      {/* ── Recommendations ────────────────────────────────────── */}
      {result.recommendations.length > 0 ? (
        <Panel eyebrow="Before you apply" title="What to fix first">
          <ol className="space-y-4">
            {result.recommendations.map((r, i) => (
              <motion.li
                key={i}
                className="flex gap-4"
                initial={{ opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.55, ease: EASE }}
              >
                <span className="num-marker shrink-0 pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="font-medium text-[0.95rem]" style={{ fontWeight: 600 }}>
                    {r.title}
                    <span
                      className="mono !text-[0.62rem] ml-2 px-1.5 py-0.5 rounded-full"
                      style={{
                        background: r.impact === "high" ? "var(--bad-soft)" : r.impact === "medium" ? "var(--warn-soft)" : "var(--paper-2)",
                        color: r.impact === "high" ? "var(--bad)" : r.impact === "medium" ? "var(--warn)" : "var(--ink-3)",
                      }}
                    >
                      {r.impact} impact
                    </span>
                  </p>
                  <p className="body-2 !text-[0.88rem] !mt-1">{r.detail}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </Panel>
      ) : null}

      {/* ── AI layer ──────────────────────────────────────────── */}
      <AiPanel analysisId={analysisId} result={result} aiState={aiState} setAiState={setAiState} onOpenSettings={onOpenSettings} />

      {/* ── Actions ────────────────────────────────────────────── */}
      <motion.div
        className="flex flex-wrap items-center justify-between gap-4 pb-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <p className="mono !text-[0.68rem] text-[var(--ink-3)]">
          analysis saved to local history · {analysisId.slice(0, 10)}…
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="btn-ghost-b" onClick={copyReport}>
            <ClipboardCopy size={15} /> Copy report
          </button>
          <button className="btn-ember group" onClick={onRestart}>
            <RotateCcw size={15} /> Analyze another role
          </button>
        </div>
      </motion.div>

      <SkillDrawer skill={gap} aiHint={gap ? aiHintFor(gap) : ""} onClose={() => setGap(null)} />
    </div>
  );
}
