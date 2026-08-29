"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { DEMO } from "./data";

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    const timers = DEMO.loadingSteps.map((_, i) =>
      window.setTimeout(() => setDoneCount(i + 1), 650 * (i + 1)),
    );
    const finish = window.setTimeout(
      onComplete,
      650 * DEMO.loadingSteps.length + 550,
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(finish);
    };
  }, [onComplete]);

  const activeLabel = DEMO.loadingSteps[doneCount];

  return (
    <div className="screen-loading screen">
      <div className="wrap loading-inner">
        <span className="loading-ring" aria-hidden="true" />

        <h1 className="screen-title" id="screen-title" tabIndex={-1} style={{ marginTop: 28 }}>
          Analyzing your match
        </h1>
        <p className="load-sub">
          We&apos;re comparing your experience, skills, and keywords against the
          role.
        </p>

        <ul className="load-list" aria-live="polite">
          {DEMO.loadingSteps.map((label, i) => {
            const state =
              i < doneCount ? "done" : i === doneCount ? "active" : "pending";
            return (
              <li key={label} className={`load-item is-${state}`}>
                <span className={`load-dot load-dot--${state}`}>
                  {state === "done" && (
                    <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                  )}
                </span>
                <span>
                  {label}
                  {state === "active" ? "…" : ""}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="load-note">
          {activeLabel
            ? `${activeLabel}…`
            : "Finishing up…"}
        </p>
      </div>
    </div>
  );
}
