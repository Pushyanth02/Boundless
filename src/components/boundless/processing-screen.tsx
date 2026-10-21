"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  { label: "Extracting text", detail: "pdf.js / mammoth — pulling every word" },
  { label: "Parsing structure", detail: "sections, dates, degrees, contact points" },
  { label: "Matching skills", detail: "taxonomy lookup · stems · fuzzy passes" },
  { label: "Scoring & auditing", detail: "4 dimensions · 16 ATS rules" },
];

export function ProcessingScreen({ fileName, jobTitle }: { fileName?: string | null; jobTitle?: string | null }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = STEPS.map((_, i) =>
      setTimeout(() => setStep(i + 1), 620 + i * 780)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="wrap flex-1 flex items-center justify-center py-16">
      <motion.div
        className="w-full max-w-[560px] card-b grain relative overflow-hidden p-[clamp(1.75rem,4vw,2.75rem)]"
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: EASE }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Analyzing</p>
            <p className="display-sm mt-1.5 truncate !text-[1.3rem]" style={{ fontWeight: 600 }}>
              {jobTitle?.trim() || "The role"}
            </p>
          </div>
          {fileName ? (
            <span className="chip mono !text-[0.68rem] shrink-0 max-w-[180px] truncate">{fileName}</span>
          ) : null}
        </div>

        {/* Central emblem */}
        <div className="my-9 flex justify-center relative" aria-hidden="true">
          <motion.div
            className="absolute inset-0 m-auto h-24 w-24 rounded-full blur-2xl"
            style={{ background: "color-mix(in srgb, var(--ember) 30%, transparent)" }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="44" fill="none" stroke="var(--hairline)" strokeWidth="3" />
            <motion.circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke="var(--ember)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 44}
              animate={{ rotate: 360 }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "60px 60px", strokeDashoffset: 2 * Math.PI * 44 * 0.72 }}
            />
            <motion.circle
              cx="60"
              cy="60"
              r="31"
              fill="none"
              stroke="var(--ember-deep)"
              strokeWidth="1.5"
              strokeDasharray="2 7"
              strokeLinecap="round"
              animate={{ rotate: -360 }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "60px 60px" }}
            />
            <text
              x="60"
              y="60"
              textAnchor="middle"
              dominantBaseline="central"
              className="mono"
              fontSize="13"
              fill="var(--ink)"
              fontWeight="600"
            >
              NLP
            </text>
          </svg>
        </div>

        {/* Steps */}
        <ol className="space-y-3" aria-label="Analysis progress">
          {STEPS.map((s, i) => {
            const done = step > i;
            const active = step === i;
            return (
              <li key={s.label} className="flex items-center gap-3.5">
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-300"
                  style={{
                    borderColor: done ? "var(--ok)" : active ? "var(--ember)" : "var(--hairline-2)",
                    background: done ? "var(--ok-soft)" : "var(--surface)",
                  }}
                  aria-hidden="true"
                >
                  <AnimatePresence mode="wait">
                    {done ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 28 }}
                      >
                        <Check size={13} strokeWidth={3} style={{ color: "var(--ok)" }} />
                      </motion.span>
                    ) : active ? (
                      <motion.span
                        key="spin"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Loader2 size={13} className="animate-spin" style={{ color: "var(--ember)" }} />
                      </motion.span>
                    ) : (
                      <span key="idle" className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--hairline-2)" }} />
                    )}
                  </AnimatePresence>
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium text-[0.9rem] transition-colors duration-300"
                    style={{ color: done || active ? "var(--ink)" : "var(--ink-3)" }}
                  >
                    {s.label}
                  </p>
                  <p className="mono !text-[0.68rem] text-[var(--ink-3)] truncate">{s.detail}</p>
                </div>
                {done ? (
                  <motion.span
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mono !text-[0.65rem] shrink-0"
                    style={{ color: "var(--ok)" }}
                  >
                    done
                  </motion.span>
                ) : null}
              </li>
            );
          })}
        </ol>

        <p className="body-2 !text-[0.78rem] !mt-7 !text-[var(--ink-3)]">
          Deterministic passes run locally — this usually takes 2–4 seconds. If AI enhancement is
          enabled, insights stream in after the results render.
        </p>
      </motion.div>
    </div>
  );
}
