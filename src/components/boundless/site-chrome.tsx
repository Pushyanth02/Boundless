"use client";

import type { Screen } from "./types";

/**
 * The Boundless mark: two overlapping circles.
 * One circle is the resume, the other is the role. The overlap is the match.
 * A single geometric stroke, no more.
 */
export function OverlapMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="wordmark-mark"
    >
      <circle cx="9" cy="12" r="5.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="15" cy="12" r="5.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

interface SiteHeaderProps {
  screen: Screen;
  onHome: () => void;
  onHowItWorks: () => void;
  onAbout: () => void;
  onStart: () => void;
}

export function SiteHeader({
  screen,
  onHome,
  onHowItWorks,
  onAbout,
  onStart,
}: SiteHeaderProps) {
  // During analysis the header stays calm: no call to action.
  const showCta = screen !== "loading";
  const ctaLabel = screen === "results" ? "New analysis" : "Start analysis";

  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <button className="wordmark" onClick={onHome} aria-label="Boundless, back to start">
          <OverlapMark />
          Boundless
        </button>

        <nav className="main-nav" aria-label="Primary">
          <button className="nav-link" onClick={onHowItWorks}>
            How it works
          </button>
          <button className="nav-link" onClick={onAbout}>
            About
          </button>
        </nav>

        {showCta && (
          <button className="btn btn-primary btn-sm" onClick={onStart}>
            {ctaLabel}
          </button>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <span className="footer-brand">
          <span className="footer-mark">
            <OverlapMark size={16} />
          </span>
          Aligning your resume with endless possibilities.
        </span>
        <span>© {new Date().getFullYear()} Boundless</span>
      </div>
    </footer>
  );
}
