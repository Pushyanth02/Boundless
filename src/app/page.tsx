"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import type { AnalysisResult } from "@/lib/analysis/types";
import { useBoundless } from "@/lib/store";
import { SiteChrome, SiteFooter } from "@/components/boundless/chrome";
import { Landing } from "@/components/boundless/landing";
import { InputScreen, type InputPayload } from "@/components/boundless/input-screen";
import { ProcessingScreen } from "@/components/boundless/processing-screen";
import { ResultsScreen } from "@/components/boundless/results-screen";
import { SettingsDialog } from "@/components/boundless/settings-dialog";
import { HistoryDrawer } from "@/components/boundless/history-drawer";
import type { AiState } from "@/components/boundless/ai-panel";

type Screen = "landing" | "input" | "processing" | "results";

const EASE = [0.16, 1, 0.3, 1] as const;
const MIN_PROCESSING_MS = 2600;

const EMPTY_INPUT: InputPayload = { file: null, resumeText: "", jdText: "" };

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [input, setInput] = useState<InputPayload>(EMPTY_INPUT);
  const [analysisId, setAnalysisId] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [aiState, setAiState] = useState<AiState>({ phase: "idle" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const { aiMode } = useBoundless();

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });

  const navigate = useCallback(
    (target: "top" | "how" | "engine" | "faq" | "input") => {
      if (target === "input") {
        setScreen("input");
        scrollTop();
        return;
      }
      if (screen !== "landing") {
        if (target === "top") {
          setScreen("landing");
          requestAnimationFrame(() => {
            document.getElementById(target === "top" ? "top" : target)?.scrollIntoView?.();
          });
          requestAnimationFrame(() => scrollTop());
          return;
        }
        setScreen("landing");
        requestAnimationFrame(() =>
          setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth" }), 120)
        );
        return;
      }
      if (target === "top") {
        scrollTop();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [screen]
  );

  const runAnalysis = async (payload: InputPayload) => {
    setInput(payload);
    setScreen("processing");
    setAiState({ phase: "idle" });
    scrollTop();

    const started = Date.now();
    const form = new FormData();
    if (payload.file) form.append("file", payload.file);
    if (payload.resumeText) form.append("resumeText", payload.resumeText);
    form.append("jdText", payload.jdText);

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const data = (await res.json()) as { id?: string; result?: AnalysisResult; error?: string };
      const elapsed = Date.now() - started;
      if (elapsed < MIN_PROCESSING_MS) {
        await new Promise((r) => setTimeout(r, MIN_PROCESSING_MS - elapsed));
      }

      if (!res.ok || !data.result || !data.id) {
        toast.error(data.error ?? "Analysis failed", {
          description: "Check the document and job description, then try again.",
        });
        setScreen("input");
        return;
      }

      setResult(data.result);
      setAnalysisId(data.id);
      setScreen("results");
      scrollTop();

      // Phase 2 — AI enhancement (BYOK) if enabled
      if (aiMode) {
        const { openRouterKey, model } = useBoundless.getState();
        if (!openRouterKey) {
          toast("AI mode is on but no key is set", {
            description: "Add your OpenRouter key in Settings to enrich this report.",
          });
          return;
        }
        setAiState({ phase: "enhancing", step: 0 });
        try {
          const aiRes = await fetch("/api/enhance", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-openrouter-key": openRouterKey,
            },
            body: JSON.stringify({ id: data.id, model }),
          });
          const aiData = (await aiRes.json()) as { ai: AiState extends { phase: "done"; ai: infer A } ? A : unknown; error?: string };
          if (!aiRes.ok || !aiData.ai) {
            setAiState({ phase: "error", message: aiData.error ?? "Enhancement failed." });
            toast.error(aiData.error ?? "AI enhancement failed", {
              description: "Offline results remain fully valid.",
            });
          } else {
            setAiState({ phase: "done", ai: aiData.ai as never });
            toast.success("AI insights ready");
          }
        } catch {
          setAiState({ phase: "error", message: "Network error contacting OpenRouter." });
        }
      }
    } catch {
      toast.error("Network error", { description: "The analysis request could not be sent." });
      setScreen("input");
    }
  };

  const loadFromHistory = (id: string, loaded: AnalysisResult) => {
    setAnalysisId(id);
    setResult(loaded);
    setAiState({ phase: "idle" });
    setScreen("results");
    scrollTop();
    toast("Loaded from history", { description: loaded.job.title ?? "Analysis restored" });
  };

  const restart = () => {
    setScreen("input");
    setResult(null);
    setAnalysisId("");
    setAiState({ phase: "idle" });
    scrollTop();
  };

  return (
    <div className="min-h-dvh flex flex-col" id="top">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <SiteChrome
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        onNavigate={navigate}
        showSectionNav={screen === "landing"}
        ctaLabel={screen === "landing" ? "Analyze now" : "New analysis"}
        onCta={screen === "landing" ? () => navigate("input") : restart}
      />

      <main ref={mainRef} id="main" className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.42, ease: EASE }}
          >
            {screen === "landing" ? <Landing onStart={() => navigate("input")} /> : null}
            {screen === "input" ? (
              <InputScreen
                initial={input}
                onBack={() => {
                  setScreen("landing");
                  scrollTop();
                }}
                onAnalyze={runAnalysis}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            ) : null}
            {screen === "processing" ? (
              <ProcessingScreen
                fileName={input.file?.name ?? (input.resumeText ? "pasted text" : null)}
                jobTitle={result?.job.title ?? null}
              />
            ) : null}
            {screen === "results" && result ? (
              <ResultsScreen
                analysisId={analysisId}
                result={result}
                aiState={aiState}
                setAiState={setAiState}
                onOpenSettings={() => setSettingsOpen(true)}
                onRestart={restart}
              />
            ) : null}
            {screen === "results" && !result ? (
              <div className="wrap flex-1 py-24 text-center">
                <p className="body-2">That analysis is no longer loaded — start a new one.</p>
                <button className="btn-ember mt-6" onClick={restart}>
                  New analysis
                </button>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <SiteFooter onNavigate={(t) => navigate(t)} />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <HistoryDrawer open={historyOpen} onOpenChange={setHistoryOpen} onLoad={loadFromHistory} />
    </div>
  );
}
