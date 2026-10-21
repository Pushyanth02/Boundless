"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ClipboardPaste,
  FileText,
  KeyRound,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useBoundless, SAMPLE_JD, SAMPLE_RESUME } from "@/lib/store";

const EASE = [0.16, 1, 0.3, 1] as const;
const MIN_JD_CHARS = 80;
const MAX_MB = 15;
const ACCEPT_RE = /\.(pdf|docx?|txt|md|rtf)$/i;

export interface InputPayload {
  file: File | null;
  resumeText: string;
  jdText: string;
}

interface InputScreenProps {
  initial: InputPayload;
  onBack: () => void;
  onAnalyze: (payload: InputPayload) => void;
  onOpenSettings: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function InputScreen({ initial, onBack, onAnalyze, onOpenSettings }: InputScreenProps) {
  const [tab, setTab] = useState<"upload" | "paste">(initial.resumeText ? "paste" : "upload");
  const [file, setFile] = useState<File | null>(initial.file);
  const [resumeText, setResumeText] = useState(initial.resumeText);
  const [jdText, setJdText] = useState(initial.jdText);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { aiMode, setAiMode, openRouterKey } = useBoundless();

  const jdWords = useMemo(() => jdText.trim().split(/\s+/).filter(Boolean).length, [jdText]);
  const jdReady = jdText.trim().length >= MIN_JD_CHARS;
  const resumeReady = tab === "upload" ? !!file : resumeText.trim().length >= 40;
  const canAnalyze = jdReady && resumeReady;

  const acceptFile = useCallback(
    (f: File | undefined | null) => {
      if (!f) return;
      if (!ACCEPT_RE.test(f.name)) {
        setError("Unsupported format — use PDF, DOCX, TXT or MD.");
        return;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        setError(`File exceeds the ${MAX_MB} MB limit.`);
        return;
      }
      setError(null);
      setFile(f);
      setTab("upload");
    },
    []
  );

  const submit = () => {
    if (!canAnalyze) {
      if (!jdReady) setError(`The job description needs at least ${MIN_JD_CHARS} characters.`);
      else if (!resumeReady) setError("Upload a resume file or paste at least 40 characters of text.");
      return;
    }
    setError(null);
    onAnalyze({ file, resumeText: tab === "paste" ? resumeText : "", jdText });
  };

  return (
    <div className="wrap flex-1 w-full py-[clamp(2rem,5vh,3.5rem)]">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <button onClick={onBack} className="link-b mono !text-[0.75rem] cursor-pointer">
          ← Back
        </button>
        <h1 className="display-md mt-4">
          Set the <em className="display-it" style={{ color: "var(--ember)" }}>two sides</em>.
        </h1>
        <p className="lede !text-[1rem] mt-3">
          One resume, one role description. The engine handles the rest.
        </p>
      </motion.div>

      <div className="mt-9 grid gap-5 lg:grid-cols-2">
        {/* ── Resume side ─────────────────────────────────────────── */}
        <motion.section
          aria-label="Resume input"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: EASE }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow">01 · The resume</p>
            <div className="seg" role="tablist" aria-label="Resume input mode">
              <button
                role="tab"
                aria-selected={tab === "upload"}
                data-active={tab === "upload"}
                className="seg-item"
                onClick={() => setTab("upload")}
              >
                <Upload size={13} /> Upload
              </button>
              <button
                role="tab"
                aria-selected={tab === "paste"}
                data-active={tab === "paste"}
                className="seg-item"
                onClick={() => setTab("paste")}
              >
                <ClipboardPaste size={13} /> Paste text
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {tab === "upload" ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md,.rtf"
                  className="sr-only"
                  onChange={(e) => acceptFile(e.target.files?.[0])}
                  aria-label="Resume file"
                />
                {file ? (
                  <motion.div
                    layout
                    initial={{ scale: 0.96 }}
                    animate={{ scale: 1 }}
                    className="card-b p-5 flex items-center gap-4"
                  >
                    <span
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: "var(--ember-soft)", color: "var(--ember)" }}
                    >
                      <FileText size={21} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate" style={{ fontWeight: 600 }}>
                        {file.name}
                      </p>
                      <p className="mono !text-[0.72rem] text-[var(--ink-3)] mt-0.5">
                        {formatSize(file.size)} · {file.type || "document"}
                      </p>
                    </div>
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-3)] transition-colors hover:bg-[var(--bad-soft)] hover:text-[var(--bad)] cursor-pointer"
                      onClick={() => {
                        setFile(null);
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    role="button"
                    tabIndex={0}
                    aria-label="Upload resume — PDF, DOCX, TXT or MD, up to 15 MB"
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        inputRef.current?.click();
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      dragDepth.current += 1;
                      setDragging(true);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      dragDepth.current = Math.max(0, dragDepth.current - 1);
                      if (dragDepth.current === 0) setDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      dragDepth.current = 0;
                      setDragging(false);
                      acceptFile(e.dataTransfer.files?.[0]);
                    }}
                    animate={dragging ? { scale: 1.02 } : { scale: 1 }}
                    whileHover={{ scale: 1.008 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.28, ease: EASE }}
                    className="w-full rounded-[var(--radius-xl)] border-[1.5px] border-dashed py-12 px-6 flex flex-col items-center gap-3.5 cursor-pointer grain select-none"
                    style={{
                      borderColor: dragging ? "var(--ember)" : "var(--hairline-2)",
                      background: dragging ? "var(--ember-soft)" : "var(--paper-2)",
                    }}
                  >
                    <motion.span
                      animate={dragging ? { y: [-2, -9, -2] } : { y: 0 }}
                      transition={{ duration: 0.9, repeat: dragging ? Infinity : 0, ease: "easeInOut" }}
                      className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{ background: "var(--surface)", border: "1px solid var(--hairline-2)", color: "var(--ember)" }}
                    >
                      <Upload size={23} strokeWidth={1.8} />
                    </motion.span>
                    <span className="font-semibold" style={{ fontWeight: 600 }}>
                      {dragging ? "Release to drop" : "Drop your resume here"}
                    </span>
                    <span className="body-2 !text-[0.82rem]">
                      or click to browse · PDF, DOCX, TXT, MD · max {MAX_MB} MB
                    </span>
                    <button
                      className="link-b mono !text-[0.72rem] mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        const blob = new Blob([SAMPLE_RESUME], { type: "text/plain" });
                        acceptFile(
                          new File([blob], "sample_resume.txt", {
                            type: "text/plain",
                          })
                        );
                      }}
                    >
                      or use a sample resume
                    </button>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="paste"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <textarea
                  className="field min-h-[240px] resize-y leading-relaxed"
                  placeholder={"Paste your resume text here…\n\nTip: open the PDF, select all, copy, paste."}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  aria-label="Resume text"
                  spellCheck={false}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="mono !text-[0.72rem] text-[var(--ink-3)]">
                    {resumeText.trim().length} chars
                  </span>
                  <button className="link-b mono !text-[0.72rem] cursor-pointer" onClick={() => setResumeText(SAMPLE_RESUME)}>
                    paste sample resume
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ── JD side ─────────────────────────────────────────────── */}
        <motion.section
          aria-label="Job description input"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.16, ease: EASE }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow">02 · The role</p>
            <span className="mono !text-[0.72rem] text-[var(--ink-3)]">
              {jdWords} words {jdReady ? "· ready" : `· ${MIN_JD_CHARS}+ chars needed`}
            </span>
          </div>
          <div className="card-b p-1.5">
            <textarea
              className="w-full bg-transparent border-0 outline-none resize-y min-h-[240px] leading-relaxed px-4 py-3 text-[0.9375rem] placeholder:text-[var(--ink-3)]"
              placeholder={
                "Paste the full job description — responsibilities, requirements, nice-to-haves.\n\nThe more complete the posting, the sharper the match."
              }
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              aria-label="Job description"
            />
            <div className="flex items-center justify-end px-4 pb-3">
              <button className="link-b mono !text-[0.72rem] cursor-pointer" onClick={() => setJdText(SAMPLE_JD)}>
                use sample job description
              </button>
            </div>
          </div>

          <p className="body-2 !text-[0.82rem] !mt-2.5 !text-[var(--ink-3)]">
            The engine splits requirements from nice-to-haves, extracts the title and seniority, and
            builds the keyword profile from this text alone.
          </p>
        </motion.section>
      </div>

      {/* ── Mode + submit ─────────────────────────────────────────── */}
      <motion.div
        className="mt-8 card-flat p-5 flex flex-col md:flex-row md:items-center gap-5 md:gap-8"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.26, ease: EASE }}
      >
        <div className="flex-1 min-w-0">
          <p className="eyebrow">03 · Engine mode</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <div className="seg" role="group" aria-label="Engine mode">
              <button className="seg-item" data-active={!aiMode} aria-pressed={!aiMode} onClick={() => setAiMode(false)}>
                <Sparkles size={13} style={{ color: "var(--ok)" }} /> Offline engine
              </button>
              <button className="seg-item" data-active={aiMode} aria-pressed={aiMode} onClick={() => setAiMode(true)}>
                <Sparkles size={13} style={{ color: "var(--ember)" }} /> AI-enhanced
              </button>
            </div>
            {aiMode ? (
              openRouterKey ? (
                <span className="chip chip-ok mono !text-[0.7rem]">
                  <KeyRound size={12} /> key configured
                </span>
              ) : (
                <button className="chip chip-warn mono !text-[0.7rem] cursor-pointer" onClick={onOpenSettings}>
                  <AlertCircle size={12} /> add your OpenRouter key
                </button>
              )
            ) : null}
          </div>
          <p className="body-2 !text-[0.78rem] !mt-2 !text-[var(--ink-3)]">
            {aiMode
              ? "Runs the offline engine first, then asks your chosen OpenRouter model for gap narratives, a summary rewrite and bullet improvements."
              : "Fully deterministic. No network, no key — parsing, scoring and the ATS audit all run locally."}
          </p>
        </div>
        <motion.button
          className="btn-ember group !min-h-[52px] !px-7 !text-[1rem] shrink-0"
          onClick={submit}
          whileHover={canAnalyze ? { scale: 1.02 } : undefined}
          whileTap={canAnalyze ? { scale: 0.98 } : undefined}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
        >
          Analyze match
          <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {error ? (
          <motion.div
            className="mt-4 flex items-center gap-2.5 rounded-[var(--radius-lg)] px-4 py-3"
            style={{ background: "var(--bad-soft)", color: "var(--bad)", border: "1px solid color-mix(in srgb, var(--bad) 25%, transparent)" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
          >
            <AlertCircle size={16} />
            <span className="text-[0.875rem] font-medium">{error}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
