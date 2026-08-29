"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  FileText,
  X,
} from "lucide-react";
import {
  DEMO,
  MAX_RESUME_MB,
  MIN_JD_CHARS,
  type ResumeFile,
} from "./data";
import { formatFileSize } from "./hooks";

interface InputScreenProps {
  resumeFile: ResumeFile | null;
  onResumeFile: (file: ResumeFile | null) => void;
  jd: string;
  onJd: (text: string) => void;
  onAnalyze: () => void;
  onBack: () => void;
}

export function InputScreen({
  resumeFile,
  onResumeFile,
  jd,
  onJd,
  onAnalyze,
  onBack,
}: InputScreenProps) {
  const [dragDepth, setDragDepth] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [jdError, setJdError] = useState<string | null>(null);
  const [showJdError, setShowJdError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const jdRef = useRef<HTMLTextAreaElement>(null);

  const jdLen = jd.trim().length;
  const dragging = dragDepth > 0;

  /* ── File handling ─────────────────────────────────────────── */

  const acceptFile = (file: File) => {
    const isSupported = /\.(pdf|docx?)$/i.test(file.name);
    const isSmallEnough = file.size <= MAX_RESUME_MB * 1024 * 1024;

    if (!isSupported) {
      setFileError("That file type is not supported. Please use a PDF or DOCX.");
      return;
    }
    if (!isSmallEnough) {
      setFileError(`That file is larger than ${MAX_RESUME_MB} MB. Try a lighter export.`);
      return;
    }
    setFileError(null);
    onResumeFile({ name: file.name, sizeLabel: formatFileSize(file.size) });
  };

  const openPicker = () => fileInputRef.current?.click();

  const removeFile = () => {
    onResumeFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const applyDemoFile = () => {
    setFileError(null);
    onResumeFile({ ...DEMO.demoResume });
  };

  /* ── Validation + submit ───────────────────────────────────── */

  const handleAnalyze = () => {
    if (processing) return;

    const nextFileError = resumeFile
      ? null
      : "Add your resume to run the analysis.";
    const nextJdError = !jdLen
      ? "Paste the job description so we have something to compare against."
      : jdLen < MIN_JD_CHARS
        ? `Add a little more of the posting. At least ${MIN_JD_CHARS} characters gives the analysis enough to work with.`
        : null;

    setFileError(nextFileError);
    setJdError(nextJdError);
    setShowJdError(true);

    if (nextFileError || nextJdError) {
      // Guide the eye to the first thing that needs attention.
      const target = nextFileError ? zoneRef.current : jdRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
      return;
    }

    setProcessing(true);
    setMessageIndex(0);
  };

  /* Processing: the button swaps to rotating, meaningful states.
     No fake percentages, just what the analysis is doing. */
  useEffect(() => {
    if (!processing) return;
    const timers: number[] = [];
    DEMO.analyzeMessages.forEach((_, i) => {
      if (i > 0) timers.push(window.setTimeout(() => setMessageIndex(i), i * 550));
    });
    timers.push(window.setTimeout(onAnalyze, 1250));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [processing, onAnalyze]);

  const handleJdChange = (value: string) => {
    onJd(value);
    if (value.trim().length >= MIN_JD_CHARS) {
      setJdError(null);
      setShowJdError(false);
    }
  };

  const jdInvalid = Boolean(showJdError && jdError);

  return (
    <div className="wrap screen">
      <div className="results-top">
        <button className="text-btn" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          Back to home
        </button>
      </div>

      <h1 className="screen-title" id="screen-title" tabIndex={-1}>
        Start your analysis
      </h1>
      <p className="screen-sub">
        Add your resume and the job description you are targeting. Everything
        runs on sample data in this demo.
      </p>

      <div className="input-grid">
        {/* ── Resume panel ─────────────────────────────────── */}
        <section className="panel" aria-label="Resume upload">
          <div className="field-head">
            <span className="field-label">Resume</span>
            <span className="block-meta">
              {resumeFile ? "Ready" : `PDF or DOCX · Max ${MAX_RESUME_MB}MB`}
            </span>
          </div>

          <p aria-live="polite" className="sr-only">
            {resumeFile
              ? `Resume attached: ${resumeFile.name}`
              : "No resume attached yet."}
          </p>

          {resumeFile ? (
            <div className="file-card">
              <span className="file-icon" aria-hidden="true">
                <FileText size={20} strokeWidth={1.75} />
              </span>
              <span className="file-meta">
                <span className="file-name">{resumeFile.name}</span>
                <span className="file-size">{resumeFile.sizeLabel}</span>
              </span>
              <span className="file-ok">
                <Check size={14} strokeWidth={2.25} aria-hidden="true" />
                Ready to analyze
              </span>
              <span className="file-actions">
                <button className="text-btn" onClick={openPicker}>
                  Replace
                </button>
                <button
                  className="icon-btn"
                  onClick={removeFile}
                  aria-label="Remove resume"
                >
                  <X size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </span>
            </div>
          ) : (
            <div
              ref={zoneRef}
              className={`dropzone ${dragging ? "is-dragover" : ""} ${
                fileError ? "is-error" : ""
              }`}
              role="button"
              tabIndex={0}
              aria-label="Resume upload area. Drop a PDF or DOCX file, or press Enter to browse."
              onClick={openPicker}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openPicker();
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragDepth((d) => d + 1);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragDepth((d) => Math.max(0, d - 1));
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragDepth(0);
                const file = e.dataTransfer.files?.[0];
                if (file) acceptFile(file);
              }}
            >
              <span className="dz-icon" aria-hidden="true">
                <FileText size={22} strokeWidth={1.75} />
              </span>
              <p className="dz-title">
                {dragging ? "Drop to upload" : "Drop your resume here"}
              </p>
              <p className="dz-hint">PDF or DOCX · Max {MAX_RESUME_MB}MB</p>
              <div className="dz-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPicker();
                  }}
                >
                  Choose file
                </button>
                <button
                  className="text-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyDemoFile();
                  }}
                >
                  or use the demo file
                </button>
              </div>
            </div>
          )}

          {fileError && (
            <p className="field-error" role="alert">
              <CircleAlert size={15} strokeWidth={1.75} aria-hidden="true" />
              {fileError}
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) acceptFile(file);
            }}
          />
        </section>

        {/* ── Job description panel ────────────────────────── */}
        <section className="panel" aria-label="Job description">
          <div className="field-head">
            <label className="field-label" htmlFor="jd-input">
              Job description
            </label>
            <button
              className="text-btn"
              onClick={() => {
                onJd(DEMO.sampleJobDescription);
                setJdError(null);
                setShowJdError(false);
              }}
            >
              Use sample
            </button>
          </div>

          <textarea
            id="jd-input"
            ref={jdRef}
            className={`jd-textarea ${jdInvalid ? "is-error" : ""}`}
            placeholder="Paste the job description here…"
            value={jd}
            aria-describedby="jd-hint"
            aria-invalid={jdInvalid}
            onChange={(e) => handleJdChange(e.target.value)}
            spellCheck={false}
          />

          <div className="jd-foot">
            <span className="jd-hint" id="jd-hint">
              Include responsibilities and requirements for the most accurate
              match.
            </span>
            <span className="char-counter" aria-hidden="true">
              {jdLen} characters
            </span>
          </div>

          {jdInvalid && jdError && (
            <p className="field-error" role="alert">
              <CircleAlert size={15} strokeWidth={1.75} aria-hidden="true" />
              {jdError}
            </p>
          )}
        </section>
      </div>

      {/* ── Analyze CTA ─────────────────────────────────────── */}
      <div className="analyze-bar">
        <button
          className="btn btn-primary btn-lg"
          onClick={handleAnalyze}
          disabled={processing}
          aria-live="polite"
        >
          {processing ? (
            <>
              <span className="spinner" aria-hidden="true" />
              {DEMO.analyzeMessages[messageIndex]}
            </>
          ) : (
            <>
              Analyze match
              <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
            </>
          )}
        </button>
        <p className="analyze-hint">Demo analysis · Runs on sample data</p>
      </div>
    </div>
  );
}
