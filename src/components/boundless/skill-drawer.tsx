"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import type { MissingSkill } from "./data";

interface SkillDrawerProps {
  skill: MissingSkill | null;
  /** Called after the exit animation finishes so the parent can unmount. */
  onExit: () => void;
}

const PRIORITY_LABEL: Record<MissingSkill["priority"], string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

/**
 * Missing-skill detail. Desktop: a side drawer. Mobile: a bottom sheet.
 * The same honest rule applies everywhere: suggest, never fabricate.
 */
export function SkillDrawer({ skill, onExit }: SkillDrawerProps) {
  const [rendered, setRendered] = useState(false);
  const [open, setOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const exitTimer = useRef<number | null>(null);
  const openRef = useRef(false);

  const close = () => {
    // openRef (not state) so the stale keydown closure can't bail early
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    exitTimer.current = window.setTimeout(onExit, 300);
  };

  useEffect(() => {
    if (!skill) return;

    lastFocused.current = document.activeElement as HTMLElement;

    let raf1 = 0;
    let raf2 = 0;
    const focusTimer: number[] = [];

    // Two frames: render the panel closed, then slide it open.
    raf1 = requestAnimationFrame(() => {
      setRendered(true);
      raf2 = requestAnimationFrame(() => {
        openRef.current = true;
        setOpen(true);
      });
    });
    focusTimer.push(
      window.setTimeout(() => closeRef.current?.focus(), 140),
    );

    document.documentElement.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      // Minimal focus trap: keep Tab inside the dialog.
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      focusTimer.forEach((t) => window.clearTimeout(t));
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = "";
      lastFocused.current?.focus?.();
    };
  }, [skill]);

  if (!skill || !rendered) return null;

  return (
    <>
      <div
        className={`drawer-backdrop ${open ? "is-open" : ""}`}
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className={`drawer ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="drawer-handle" aria-hidden="true" />

        <div className="drawer-top">
          <button className="text-btn" onClick={close}>
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            Back
          </button>
          <button
            ref={closeRef}
            className="icon-btn"
            onClick={close}
            aria-label="Close panel"
          >
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="drawer-body scroll-soft">
          <h2 className="drawer-skill" id="drawer-title">
            {skill.name}
          </h2>
          <div className="drawer-section">
            <span
              className={`priority priority--${skill.priority}`}
              style={{ justifySelf: "start" }}
            >
              {PRIORITY_LABEL[skill.priority]}
            </span>
          </div>

          <div className="drawer-section">
            <h3 className="drawer-label">Why it matters</h3>
            <p className="drawer-text">{skill.detail.why}</p>
          </div>

          <div className="drawer-section">
            <h3 className="drawer-label">Where it was detected</h3>
            <span className="detected-pill">{skill.detail.detected}</span>
          </div>

          <div className="drawer-section">
            <h3 className="drawer-label">Suggested resume improvement</h3>
            <p className="drawer-text">{skill.detail.suggestion}</p>
          </div>

          <p className="drawer-note">
            Only add skills you genuinely have. Boundless never invents
            experience for you.
          </p>
        </div>

        <div className="drawer-foot">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={close}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}
