"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Landing } from "@/components/boundless/landing";
import { InputScreen } from "@/components/boundless/input-screen";
import { LoadingScreen } from "@/components/boundless/loading-screen";
import { ResultsScreen } from "@/components/boundless/results-screen";
import { SkillDrawer } from "@/components/boundless/skill-drawer";
import { SiteFooter, SiteHeader } from "@/components/boundless/site-chrome";
import type { Screen } from "@/components/boundless/types";
import type { MissingSkill, ResumeFile } from "@/components/boundless/data";

/**
 * Boundless
 *
 * One page, five states: landing, input, loading, results, plus a detail
 * drawer. State lives here at the top so "New analysis" can return you to
 * the input screen with your resume and job description intact.
 */
export default function Page() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [resumeFile, setResumeFile] = useState<ResumeFile | null>(null);
  const [jd, setJd] = useState("");
  const [activeSkill, setActiveSkill] = useState<MissingSkill | null>(null);

  const firstRender = useRef(true);

  const goTo = useCallback((next: Screen) => {
    setScreen(next);
    window.scrollTo(0, 0);
  }, []);

  // After a screen change, move focus to its heading so keyboard and
  // screen-reader users land in the new context (not skipped on load).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      document.getElementById("screen-title")?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, [screen]);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const navigateToSection = useCallback(
    (id: string) => {
      if (screen !== "landing") {
        goTo("landing");
        window.setTimeout(() => scrollToSection(id), 140);
      } else {
        scrollToSection(id);
      }
    },
    [screen, goTo, scrollToSection],
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteHeader
        screen={screen}
        onHome={() => goTo("landing")}
        onHowItWorks={() => navigateToSection("how-it-works")}
        onAbout={() => navigateToSection("about")}
        onStart={() => goTo("input")}
      />

      <main className="site-main" id="main">
        {screen === "landing" && (
          <Landing
            onStart={() => goTo("input")}
            onSeeHow={() => scrollToSection("how-it-works")}
          />
        )}

        {screen === "input" && (
          <InputScreen
            resumeFile={resumeFile}
            onResumeFile={setResumeFile}
            jd={jd}
            onJd={setJd}
            onAnalyze={() => goTo("loading")}
            onBack={() => goTo("landing")}
          />
        )}

        {screen === "loading" && <LoadingScreen onComplete={() => goTo("results")} />}

        {screen === "results" && (
          <ResultsScreen
            onOpenSkill={setActiveSkill}
            onNewAnalysis={() => goTo("input")}
          />
        )}
      </main>

      <SiteFooter />

      <SkillDrawer skill={activeSkill} onExit={() => setActiveSkill(null)} />
    </div>
  );
}
