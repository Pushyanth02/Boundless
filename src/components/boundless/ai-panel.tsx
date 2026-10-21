"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowUpRight,
  KeyRound,
  Loader2,
  PenLine,
  Quote,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { AiInsights, AnalysisResult } from "@/lib/analysis/types";
import { useBoundless } from "@/lib/store";
import { modelLabel } from "@/lib/openrouter";

const EASE = [0.16, 1, 0.3, 1] as const;

export type AiState =
  | { phase: "idle" }
  | { phase: "enhancing"; step: number }
  | { phase: "done"; ai: AiInsights }
  | { phase: "error"; message: string };

const ENHANCE_STEPS = [
  "Reading engine findings…",
  "Consulting your model…",
  "Validating structured output…",
];

interface AiPanelProps {
  analysisId: string;
  result: AnalysisResult;
  aiState: AiState;
  setAiState: (s: AiState) => void;
  onOpenSettings: () => void;
}

export function AiPanel({ analysisId, result, aiState, setAiState, onOpenSettings }: AiPanelProps) {
  const { openRouterKey, model } = useBoundless();
  const [stepTimer, setStepTimer] = useState(0);

  const enhance = async () => {
    if (!openRouterKey) {
      toast.error("Add your OpenRouter key first", {
        description: "Settings → paste your key → Test. It stays in your browser.",
      });
      onOpenSettings();
      return;
    }
    setAiState({ phase: "enhancing", step: 0 });
    const stepInterval = setInterval(() => {
      setStepTimer((s) => Math.min(s + 1, ENHANCE_STEPS.length - 1));
    }, 4200);

    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": openRouterKey,
        },
        body: JSON.stringify({ id: analysisId, model }),
      });
      const data = (await res.json()) as { ai: AiInsights | null; error?: string };
      clearInterval(stepInterval);
      if (!res.ok || !data.ai) {
        setAiState({ phase: "error", message: data.error ?? "Enhancement failed." });
        toast.error(data.error ?? "Enhancement failed", {
          description: "Your offline results below remain fully valid.",
        });
        return;
      }
      setAiState({ phase: "done", ai: data.ai });
      toast.success("AI insights ready");
    } catch {
      clearInterval(stepInterval);
      setAiState({ phase: "error", message: "Network error while contacting OpenRouter." });
      toast.error("Enhancement failed", { description: "Network error — offline results remain valid." });
    }
  };

  return (
    <section aria-label="AI insights" className="card-ember grain relative overflow-hidden p-[clamp(1.5rem,3.5vw,2.25rem)]">
      <Sparkles
        size={130}
        className="absolute -right-8 -top-8 opacity-[0.08] pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--ember) 15%, transparent)", color: "var(--ember)" }}
            >
              <Wand2 size={18} />
            </span>
            <div>
              <h2 className="display-sm !text-[1.3rem]" style={{ fontWeight: 600 }}>
                AI insights
              </h2>
              <p className="mono !text-[0.68rem] text-[var(--ink-3)]">
                optional layer · bring your own key
              </p>
            </div>
          </div>
          {aiState.phase === "done" ? (
            <span className="chip chip-ember mono !text-[0.68rem]">
              {modelLabel(aiState.ai.model)}
            </span>
          ) : null}
        </div>

        <AnimatePresence mode="wait">
          {aiState.phase === "idle" || aiState.phase === "error" ? (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              {aiState.phase === "error" ? (
                <p className="mt-4 text-[0.85rem] font-medium" style={{ color: "var(--bad)" }} role="alert">
                  {aiState.message} — you can retry below.
                </p>
              ) : null}
              <p className="body-2 mt-4 max-w-[62ch]">
                The offline engine produced every score on this page. For a second opinion, let an
                OpenRouter model of your choice read the findings and write gap narratives, an ATS
                interpretation, a tailored summary rewrite and stronger bullets —{" "}
                <em>strictly optional, validated against a schema before display</em>.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button className="btn-ember group" onClick={enhance}>
                  Enhance with AI
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </button>
                {!openRouterKey ? (
                  <button className="btn-ghost-b" onClick={onOpenSettings}>
                    <KeyRound size={15} /> Add OpenRouter key
                  </button>
                ) : null}
              </div>
            </motion.div>
          ) : aiState.phase === "enhancing" ? (
            <motion.div
              key="loading"
              className="mt-6 space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {ENHANCE_STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  {i < stepTimer ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "var(--ok-soft)", color: "var(--ok)" }}>
                      ✓
                    </span>
                  ) : i === stepTimer ? (
                    <Loader2 size={16} className="animate-spin" style={{ color: "var(--ember)" }} />
                  ) : (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border" style={{ borderColor: "var(--hairline-2)" }} />
                  )}
                  <span className="body-2 !text-[0.88rem]" style={{ color: i <= stepTimer ? "var(--ink)" : "var(--ink-3)" }}>
                    {s}
                  </span>
                </div>
              ))}
              <p className="mono !text-[0.68rem] text-[var(--ink-3)] !mt-4">
                models can take 10–60s — this page stays usable
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="mt-6 space-y-5"
            >
              <div className="card-b p-5">
                <div className="flex items-center gap-2 mb-2.5">
                  <Quote size={14} style={{ color: "var(--ember)" }} />
                  <p className="eyebrow !text-[0.62rem]">The honest read</p>
                </div>
                <p className="leading-[1.7] text-[0.95rem]">{aiState.ai.summary}</p>
              </div>

              {aiState.ai.atsNarrative ? (
                <div className="card-b p-5">
                  <p className="eyebrow !text-[0.62rem] mb-2.5">ATS interpretation</p>
                  <p className="body-2 !text-[0.9rem] leading-[1.7]">{aiState.ai.atsNarrative}</p>
                </div>
              ) : null}

              {aiState.ai.gapNarratives.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {aiState.ai.gapNarratives.map((g, i) => (
                    <motion.div
                      key={g.skill + i}
                      className="card-b p-5"
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
                    >
                      <p className="font-semibold !text-[0.95rem]" style={{ fontWeight: 600 }}>
                        {g.skill}
                      </p>
                      <p className="body-2 !text-[0.85rem] !mt-1.5">{g.why}</p>
                      <p className="!text-[0.85rem] !mt-2.5 leading-[1.65]" style={{ color: "var(--ember-deep)" }}>
                        <span className="num-marker">→ </span>
                        {g.suggestion}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : null}

              {aiState.ai.summaryRewrite ? (
                <div className="card-b p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <PenLine size={14} style={{ color: "var(--ember)" }} />
                    <p className="eyebrow !text-[0.62rem]">Summary rewrite</p>
                  </div>
                  <p className="leading-[1.7] text-[0.92rem]" style={{ fontFamily: "var(--font-fraunces), serif", fontStyle: "italic" }}>
                    {aiState.ai.summaryRewrite}
                  </p>
                </div>
              ) : null}

              {aiState.ai.bulletSuggestions.length > 0 ? (
                <div className="space-y-3">
                  <p className="eyebrow !text-[0.62rem]">Bullet upgrades</p>
                  {aiState.ai.bulletSuggestions.map((b, i) => (
                    <div key={i} className="card-b p-5">
                      <p className="body-2 !text-[0.85rem] line-through decoration-[var(--ink-3)]/50">
                        {b.original}
                      </p>
                      <div className="flex items-start gap-2.5 mt-2.5">
                        <ArrowUpRight size={15} className="mt-1 shrink-0" style={{ color: "var(--ember)" }} />
                        <p className="!text-[0.9rem] leading-[1.65]" style={{ fontWeight: 500 }}>
                          {b.improved}
                        </p>
                      </div>
                      <p className="mono !text-[0.68rem] text-[var(--ink-3)] !mt-2">{b.why}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                className="link-b mono !text-[0.72rem] cursor-pointer"
                onClick={() => setAiState({ phase: "idle" })}
              >
                ↻ regenerate insights
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
