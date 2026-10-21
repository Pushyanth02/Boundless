"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/* ── Count-up hook ─────────────────────────────────────────────── */

export function useCountUp(target: number, duration = 1.1, delay = 0.15): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, duration, delay]);
  return value;
}

/* ── Score → semantic color ─────────────────────────────────────── */

export function scoreColor(score: number): string {
  if (score >= 80) return "var(--ok)";
  if (score >= 60) return "var(--ember)";
  if (score >= 40) return "var(--warn)";
  return "var(--bad)";
}

export function scoreColorClass(score: number): string {
  if (score >= 80) return "text-[var(--ok)]";
  if (score >= 60) return "text-[var(--ember)]";
  if (score >= 40) return "text-[var(--warn)]";
  return "text-[var(--bad)]";
}

/* ── Animated score ring ───────────────────────────────────────── */

interface ScoreRingProps {
  score: number;
  size?: number;
  thickness?: number;
  label?: string;
  sublabel?: string;
  delay?: number;
  showCount?: boolean;
  className?: string;
}

export function ScoreRing({
  score,
  size = 168,
  thickness = 10,
  label,
  sublabel,
  delay = 0.15,
  showCount = true,
  className,
}: ScoreRingProps) {
  const value = useCountUp(score, 1.15, delay);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score)) / 100;
  const color = scoreColor(score);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className ?? ""}`}
      role="img"
      aria-label={`${label ?? "Score"}: ${score} out of 100${sublabel ? ` — ${sublabel}` : ""}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={thickness}
        />
        {/* ember tick at 12 o'clock */}
        <line
          x1={size / 2}
          y1={thickness / 2 + 1}
          x2={size / 2}
          y2={thickness / 2 + 7}
          stroke="var(--ember)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: `stroke-dashoffset 1.35s cubic-bezier(0.16,1,0.3,1) ${delay}s, stroke 0.4s ease`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {showCount ? (
          <span
            className="display-sm tabular-nums"
            style={{ color, fontSize: size >= 150 ? undefined : "1.5rem" }}
          >
            {value}
          </span>
        ) : null}
        {label ? <span className="eyebrow !tracking-[0.14em]">{label}</span> : null}
      </div>
    </div>
  );
}

/* ── Animated meter bar ─────────────────────────────────────────── */

interface MeterProps {
  value: number;
  delay?: number;
  color?: string;
  className?: string;
}

export function Meter({ value, delay = 0.1, color, className }: MeterProps) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(100, Math.max(0, value))), 80 + delay * 1000);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div
      ref={ref}
      className={`meter ${className ?? ""}`}
      role="meter"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="meter-fill"
        style={{ width: `${width}%`, background: color ?? scoreColor(value) }}
      />
    </div>
  );
}
