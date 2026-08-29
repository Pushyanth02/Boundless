"use client";

import { useEffect, useState } from "react";

interface ScoreRingProps {
  /** Match score, 0-100 */
  value: number;
  /** Short verdict read out to screen readers */
  label: string;
  size?: number;
  stroke?: number;
}

/**
 * Radial match score. The ring draws in over ~900ms while the number
 * counts up, so the score reads as a conclusion being reached rather
 * than a slot-machine result. Reduced motion: both settle instantly.
 */
export function ScoreRing({ value, label, size = 232, stroke = 10 }: ScoreRingProps) {
  const [drawn, setDrawn] = useState(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    let countRaf = 0;

    raf = requestAnimationFrame(() => {
      setDrawn(true);

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        setDisplay(value);
        return;
      }

      const duration = 900;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(eased * value));
        if (t < 1) countRaf = requestAnimationFrame(tick);
      };
      countRaf = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(countRaf);
    };
  }, [value]);

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = drawn ? value / 100 : 0;

  return (
    <div
      className="score-ring"
      role="img"
      aria-label={`Overall match score ${value} out of 100, ${label}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <div className="score-ring-center">
        <span className="score-number">
          {display}
          <span className="score-unit">%</span>
        </span>
        <span className="score-ring-label">Overall match</span>
      </div>
    </div>
  );
}
