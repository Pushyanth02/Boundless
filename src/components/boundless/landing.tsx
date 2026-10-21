"use client";

import { useRef, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  FileText,
  Gauge,
  KeyRound,
  Radar,
  ScanText,
  Sparkles,
  Workflow,
} from "lucide-react";
import { ScoreRing } from "./primitives";

const EASE = [0.16, 1, 0.3, 1] as const;

/* Hydration-safe media query (no setState in effect). */
const subscribeMobile = (cb: () => void) => {
  const mql = window.matchMedia("(max-width: 640px)");
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};
const useIsMobile = () =>
  useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 640px)").matches,
    () => false
  );

/* ── Reusable reveal wrapper ────────────────────────────────────── */

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? undefined : { opacity: 0, y: 22 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.75, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ── Hero specimen card — a living miniature of the results ─────── */

const FLOAT_CHIPS = [
  { label: "TypeScript", top: "-7%", left: "-6%", dur: 6.5, ok: true },
  { label: "Kubernetes", top: "16%", right: "-5%", dur: 7.5, ok: false },
  { label: "PostgreSQL", bottom: "15%", left: "-7%", dur: 8, ok: true },
  { label: "GraphQL", bottom: "-8%", right: "-4%", dur: 6, ok: true },
];

function SpecimenCard() {
  const reduce = useReducedMotion();
  const isMobile = useIsMobile();

  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, y: 34, rotate: 1.5 }}
      animate={reduce ? undefined : { opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 1.05, delay: 0.45, ease: EASE }}
      className="relative mx-auto w-full max-w-[440px]"
    >
      {/* ember glow */}
      <div
        className="ember-glow absolute -inset-10 -z-10 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--ember) 26%, transparent), transparent)" }}
        aria-hidden="true"
      />
      {/* floating chips — pulled inward on small screens so nothing overflows */}
      {FLOAT_CHIPS.map((chip, i) => (
        <motion.span
          key={chip.label}
          className={`chip absolute z-10 shadow-sm ${chip.ok ? "chip-ok" : "chip-warn"}`}
          style={{
            top: chip.top,
            left: chip.left && (isMobile ? "1%" : chip.left),
            right: chip.right && (isMobile ? "1%" : chip.right),
            bottom: chip.bottom,
          }}
          initial={reduce ? undefined : { opacity: 0, scale: 0.8 }}
          animate={
            reduce
              ? undefined
              : {
                  opacity: 1,
                  scale: 1,
                  y: [0, -11, 0],
                  transition: {
                    opacity: { delay: 1 + i * 0.16, duration: 0.5 },
                    scale: { delay: 1 + i * 0.16, duration: 0.5 },
                    y: { repeat: Infinity, duration: chip.dur, ease: "easeInOut", delay: i * 0.5 },
                  },
                }
          }
        >
          {chip.ok ? <BadgeCheck size={13} /> : <Radar size={13} />}
          {chip.label}
        </motion.span>
      ))}

      <div className="card-b grain relative overflow-hidden p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Match report</p>
            <p className="display-sm mt-1.5 !text-[1.28rem]" style={{ fontWeight: 600 }}>
              Senior Full Stack Developer
            </p>
          </div>
          <span className="chip chip-ember mono !text-[0.68rem]">OFFLINE ENGINE</span>
        </div>

        <div className="mt-5 flex items-center gap-6">
          <ScoreRing score={87} size={128} thickness={9} label="Match" delay={0.9} />
          <div className="flex-1 space-y-3 min-w-0">
            {[
              { label: "Skills", v: 84 },
              { label: "Keywords", v: 79 },
              { label: "Experience", v: 92 },
            ].map((d, i) => (
              <div key={d.label}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="eyebrow !text-[0.62rem]">{d.label}</span>
                  <span className="mono !text-[0.7rem] tabular-nums">{d.v}</span>
                </div>
                <div className="meter">
                  <div
                    className="meter-fill"
                    style={{
                      width: `${d.v}%`,
                      background: "var(--ember)",
                      transitionDelay: `${1.05 + i * 0.14}s`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="divider my-5" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex -space-x-1.5 flex-wrap">
            {["React", "Node.js", "SQL", "REST", "TS"].map((s, i) => (
              <motion.span
                key={s}
                className="chip chip-ok !px-2 !py-0.5 !text-[0.7rem]"
                initial={reduce ? undefined : { opacity: 0, y: 8 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ delay: 1.25 + i * 0.09, duration: 0.45, ease: EASE }}
              >
                {s}
              </motion.span>
            ))}
          </div>
          <span className="mono !text-[0.7rem] text-[var(--ink-3)]">18 / 27 skills</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Landing ────────────────────────────────────────────────────── */

interface LandingProps {
  onStart: () => void;
}

const MARQUEE_WORDS = [
  "TypeScript", "React", "Kubernetes", "TF-IDF", "Porter Stemmer", "PostgreSQL", "pdf.js",
  "mammoth", "Jaro–Winkler", "Next.js", "GraphQL", "Framer Motion", "Docker", "AWS",
  " cosine similarity", "skill taxonomy", "Python", "Figma", "CI/CD", "PyTorch",
];

export function Landing({ onStart }: LandingProps) {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex-1 flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px 480px at 78% -8%, color-mix(in srgb, var(--ember) 7%, transparent), transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div className="wrap grid lg:grid-cols-[1.08fr_0.92fr] gap-14 lg:gap-8 items-center pt-[clamp(3.5rem,9vh,6.5rem)] pb-[clamp(3rem,8vh,5.5rem)]">
          <div>
            <motion.p
              className="eyebrow"
              initial={reduce ? undefined : { opacity: 0, y: 12 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              Boundless · Resume Intelligence
            </motion.p>
            <motion.h1
              className="display-xl mt-5"
              initial={reduce ? undefined : { opacity: 0, y: 26 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.08, ease: EASE }}
            >
              Your resume,
              <br />
              <em className="display-it" style={{ color: "var(--ember)" }}>honestly</em> scored.
            </motion.h1>
            <motion.p
              className="lede mt-6"
              initial={reduce ? undefined : { opacity: 0, y: 22 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.18, ease: EASE }}
            >
              Upload a resume, paste a job description, and get a real match score — parsed with
              pdf.js, scored by a deterministic NLP engine, audited against 16 ATS rules, and
              optionally sharpened by AI with your own OpenRouter key.
            </motion.p>
            <motion.div
              className="mt-9 flex flex-wrap items-center gap-4"
              initial={reduce ? undefined : { opacity: 0, y: 18 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.3, ease: EASE }}
            >
              <button className="btn-ember group !pr-5" onClick={onStart}>
                Analyze my resume
                <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <a className="btn-ghost-b" href="#how">
                How the engine works
              </a>
            </motion.div>

            <motion.div
              className="mt-10 flex flex-wrap gap-x-8 gap-y-3"
              initial={reduce ? undefined : { opacity: 0 }}
              animate={reduce ? undefined : { opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.55 }}
            >
              {[
                ["450+", "skills in taxonomy"],
                ["16", "ATS audit rules"],
                ["2", "engine modes"],
                ["0", "keys required offline"],
              ].map(([n, l]) => (
                <div key={l} className="flex items-baseline gap-2">
                  <span className="mono !text-[1.05rem] font-semibold" style={{ color: "var(--ember)" }}>
                    {n}
                  </span>
                  <span className="body-2 !text-[0.8rem]">{l}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <SpecimenCard />
        </div>
      </section>

      {/* ── Marquee ───────────────────────────────────────────────── */}
      <section aria-hidden="true" className="border-y border-hairline overflow-hidden py-3.5" style={{ background: "var(--paper-2)" }}>
        <div className="marquee-track flex w-max gap-3 whitespace-nowrap">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((w, i) => (
            <span key={`${w}-${i}`} className="mono !text-[0.72rem] text-[var(--ink-3)]">
              {w} <span style={{ color: "var(--ember)" }}>·</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────── */}
      <section id="how" className="wrap scroll-mt-24 py-[clamp(3.5rem,9vh,6rem)]">
        <Reveal>
          <p className="eyebrow">Method</p>
          <h2 className="display-lg mt-3 max-w-[16ch]">Three honest passes.</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              n: "01",
              icon: FileText,
              title: "Extract",
              body: "pdf.js and mammoth pull every word out of your PDF or DOCX — server-side, in memory, then gone. Section headers, dates, degrees, metrics and contact points are identified structurally.",
            },
            {
              n: "02",
              icon: BrainCircuit,
              title: "Understand",
              body: "The offline engine stems and tokenizes both documents, runs TF-IDF salience over the job description, and matches skills through a 450+ entry taxonomy with alias- and fuzzy-matching.",
            },
            {
              n: "03",
              icon: Gauge,
              title: "Score",
              body: "Four weighted dimensions — skills, keywords, experience, education — compose the match score. Sixteen deterministic ATS rules audit parseability, formatting and keyword coverage separately.",
            },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 0.12}>
              <div className="card-b grain h-full p-6">
                <div className="flex items-center justify-between">
                  <span className="num-marker">{s.n}</span>
                  <s.icon size={19} strokeWidth={1.75} style={{ color: "var(--ember)" }} />
                </div>
                <h3 className="display-sm mt-4 !text-[1.3rem]" style={{ fontWeight: 600 }}>
                  {s.title}
                </h3>
                <p className="body-2 mt-2.5 !text-[0.9rem]">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── The engine ───────────────────────────────────────────── */}
      <section id="engine" className="scroll-mt-24 border-y border-hairline" style={{ background: "var(--paper-2)" }}>
        <div className="wrap py-[clamp(3.5rem,9vh,6rem)]">
          <Reveal>
            <p className="eyebrow">Two modes · one pipeline</p>
            <h2 className="display-lg mt-3 max-w-[22ch]">
              Deterministic by default. <em className="display-it" style={{ color: "var(--ember)" }}>Augmented</em> by choice.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <Reveal delay={0.1}>
              <div className="card-b grain h-full p-7">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--ember-soft)", color: "var(--ember)" }}>
                    <ScanText size={18} />
                  </span>
                  <h3 className="display-sm !text-[1.35rem]" style={{ fontWeight: 600 }}>
                    Offline NLP engine
                  </h3>
                </div>
                <p className="body-2 mt-4">
                  The core pipeline is fully offline and deterministic: Porter stemming, TF-IDF
                  vectors, cosine similarity, Jaro–Winkler fuzzy matching and a hand-built skill
                  taxonomy. Same inputs, same score — every time. No key, no network, no drift.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "450+ skills · 17 categories · alias-aware",
                    "TF-IDF salience & stem-level cosine similarity",
                    "Required vs nice-to-have requirement split",
                    "16-rule ATS audit with weighted pass/warn/fail",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 body-2 !text-[0.88rem]">
                      <BadgeCheck size={15} className="mt-[3px] shrink-0" style={{ color: "var(--ok)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.22}>
              <div className="card-ember grain h-full p-7">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--ember) 14%, transparent)", color: "var(--ember)" }}>
                    <Sparkles size={18} />
                  </span>
                  <h3 className="display-sm !text-[1.35rem]" style={{ fontWeight: 600 }}>
                    AI-enhanced layer · BYOK
                  </h3>
                </div>
                <p className="body-2 mt-4">
                  Bring your own OpenRouter key to unlock a second pass: an AI coach that reads the
                  engine&apos;s findings and writes gap narratives, an ATS interpretation, a tailored
                  summary rewrite and stronger bullet suggestions — validated against a strict
                  schema before it reaches you.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Any OpenRouter model — Claude, GPT, Gemini, Llama…",
                    "Key stored in your browser, sent per-request, never persisted",
                    "Structured JSON output, zod-validated",
                    "Fails soft — offline results always stay intact",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 body-2 !text-[0.88rem]">
                      <KeyRound size={15} className="mt-[3px] shrink-0" style={{ color: "var(--ember)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="wrap scroll-mt-24 py-[clamp(3.5rem,9vh,6rem)]">
        <Reveal>
          <p className="eyebrow">Questions</p>
          <h2 className="display-lg mt-3">Asked, answered.</h2>
        </Reveal>
        <div className="mt-9 max-w-[760px] space-y-3">
          {[
            {
              q: "Do I need an API key?",
              a: "No. The default engine is fully offline — parsing, scoring and the ATS audit all run locally on the server without any external calls. The AI layer is strictly optional and activates only with your own OpenRouter key.",
            },
            {
              q: "What happens to my resume?",
              a: "It is parsed in server memory, analyzed, and stored in the local database only so you can revisit your history in this session. Nothing is sent to third parties unless you explicitly enable the AI layer with your key.",
            },
            {
              q: "What is an ATS score, exactly?",
              a: "Applicant Tracking Systems pre-screen resumes before a human sees them. Boundless runs 16 deterministic checks that approximate how parsers read your document — contact discoverability, standard sections, parse quality, quantified achievements, date consistency, keyword coverage and more.",
            },
            {
              q: "Which formats can I upload?",
              a: "PDF (via pdf.js), DOCX (via mammoth), and plain text or Markdown. Image-based PDFs can't be parsed — you'll be told honestly if extraction yields nothing, and you can paste the text instead.",
            },
          ].map((f, i) => (
            <Reveal key={f.q} delay={i * 0.08}>
              <details className="card-flat group px-5 py-4 [&_summary]:cursor-pointer">
                <summary className="flex items-center justify-between gap-4 list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-semibold !text-[0.98rem]" style={{ fontWeight: 600 }}>
                    {f.q}
                  </span>
                  <span className="num-marker transition-transform duration-300 group-open:rotate-45">+</span>
                </summary>
                <p className="body-2 mt-3 !text-[0.9rem]">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-14">
          <div className="card-ember grain relative overflow-hidden p-[clamp(1.75rem,4vw,3rem)]">
            <Workflow size={120} className="absolute -right-6 -bottom-8 opacity-[0.07]" aria-hidden="true" />
            <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <h2 className="display-md max-w-[18ch]">
                  See what the machine <em className="display-it" style={{ color: "var(--ember)" }}>actually sees</em>.
                </h2>
                <p className="body-2 mt-3 max-w-[48ch]">
                  One resume, one job description, one honest score — in about three seconds.
                </p>
              </div>
              <button className="btn-ember group shrink-0" onClick={onStart}>
                Start an analysis
                <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
