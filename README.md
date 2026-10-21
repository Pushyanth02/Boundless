# Boundless — Resume intelligence, honestly scored.

Upload a resume. Paste a job description. Get a **real** match score — parsed with pdf.js,
scored by a deterministic offline NLP engine, audited against 16 ATS rules, and optionally
sharpened by AI with your own OpenRouter key.

> **v2 — the redesign.** The original `main` branch was a beautiful static prototype: the UI
> existed, the engine did not — every score was hardcoded. This branch is the rework: a real
> document pipeline, a real scoring engine, a real backend, and an optional AI layer. The
> GitHub Pages demo of the prototype remains untouched on `main`.

---

## What it does

1. **Extract** — server-side parsing of PDF (via `unpdf` / pdf.js), DOCX (via `mammoth`),
   TXT/MD, or pasted text. Section headers, date ranges, degrees, contact points and
   quantified achievements are identified structurally.
2. **Understand** — the offline engine tokenizes and stems both documents, runs TF-IDF
   salience over the job description, and matches skills through a 450+ entry taxonomy with
   alias-, stem- and fuzzy-matching (Jaro–Winkler ≥ 0.92), plus conservative implication
   rules (PostgreSQL experience satisfies a "SQL" requirement; GitHub Actions satisfies CI/CD).
3. **Score** — four weighted dimensions compose the match score, and 16 deterministic ATS
   rules audit parseability, formatting and keyword coverage separately:

| Dimension | Weight | Signals |
|---|---|---|
| Skills | 35% | required ×3 / preferred ×1 weighted coverage, mention-weighted |
| Keywords | 25% | TF-IDF salient-term coverage + stem-level cosine similarity |
| Experience | 25% | detected years vs the role's seniority band |
| Education | 15% | degree band vs the JD's stated expectation |

The ATS audit checks contact discoverability, standard sections, machine readability,
length, quantified achievements, action verbs, bullet ratio, date consistency, title
alignment, keyword density, skills section, education detail, pronoun discipline,
extraction artifacts and location — each with a pass/warn/fail verdict, a weighted score
and a concrete fix.

4. **(Optional) Enhance** — bring your own OpenRouter key and any model on the platform
   (Claude, GPT, Gemini, Llama, DeepSeek…) to get gap narratives, an ATS interpretation, a
   tailored summary rewrite and stronger bullet suggestions. The key lives in your browser's
   localStorage, is forwarded only with your own requests, and is **never** persisted
   server-side. The AI's structured JSON output is validated with zod before display — and if
   it fails, your offline results remain fully intact.

## Architecture

```
src/
├─ app/
│  ├─ page.tsx                  # screen machine: landing → input → processing → results
│  ├─ layout.tsx                # Fraunces + Geist fonts, themes, toaster
│  └─ api/
│     ├─ analyze/               # POST — parse doc → run engine → persist → result JSON
│     ├─ enhance/               # POST — BYOK OpenRouter second pass (zod-validated)
│     ├─ history/ (+[id]/)      # GET/DELETE — analysis history (SQLite/Prisma)
│     └─ openrouter/test/       # POST — validate the user's key against /api/v1/key
├─ lib/
│  ├─ analysis/                # THE ENGINE (deterministic, zero network)
│  │  ├─ taxonomy.ts            # 450+ skills, 17 categories, alias-aware
│  │  ├─ text.ts                # tokenizer, Porter stemmer, stopwords, n-grams
│  │  ├─ sections.ts            # resume section detection
│  │  ├─ resume-parser.ts       # contact, dates, degree, metrics, years of experience
│  │  ├─ jd-parser.ts           # title, seniority, required vs nice-to-have split
│  │  ├─ matcher.ts             # alias + stem + Jaro-Winkler + implication matching
│  │  ├─ tfidf.ts               # TF-IDF salience + cosine similarity
│  │  ├─ ats-rules.ts           # 16-rule weighted audit
│  │  ├─ scoring.ts             # dimension scores, overall, recommendations
│  │  └─ index.ts               # defensive orchestrator
│  ├─ parse-document.ts         # unpdf / mammoth / text extraction
│  ├─ openrouter.ts             # prompt builder, BYOK client, zod schema
│  ├─ store.ts                  # zustand settings (key, model, mode) + samples
│  └─ db.ts                     # Prisma client
└─ components/
   ├─ ui/                       # shadcn/ui (New York)
   └─ boundless/                # landing, input, processing, results, AI panel,
                                # settings dialog, history drawer, chrome, primitives
```

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui ·
Prisma + SQLite · Framer Motion · Zustand · Zod · sonner ·
`natural` (NLP) · `unpdf`/pdf.js · `mammoth`.

## Getting started

```bash
# 1. install
npm install        # or bun install / pnpm install

# 2. environment
cp .env.example .env
# DATABASE_URL=file:./dev.db  (SQLite — no server needed)

# 3. database
npm run db:push

# 4. run
npm run dev       # → http://localhost:3000
```

Optional: verify the offline engine determinism — `npm run engine:check` runs the
engine's self-check (positive and negative controls, sanity assertions).

## Notes

- **Privacy:** resumes are parsed in server memory and stored in the local SQLite
  database only (for the in-app history). Nothing is sent anywhere unless you enable
  the AI layer with your own OpenRouter key.
- **Branching:** `main` preserves the original static prototype (deployed on GitHub
  Pages). `redesign` is this full-stack rework.

---

*Aligning your resume with endless possibilities.*
