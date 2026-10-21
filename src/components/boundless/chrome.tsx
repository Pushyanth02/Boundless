"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { History, Moon, Settings2, Sun } from "lucide-react";
import { useBoundless } from "@/lib/store";

/* Hydration-safe "mounted" flag without setState-in-effect. */
const emptySubscribe = () => () => {};

/* ── Wordmark: two overlapping circles ──────────────────────────── */

export function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 48 30" aria-hidden="true">
      <circle cx="17" cy="15" r="12" fill="none" stroke="var(--ink)" strokeWidth="2.2" />
      <circle cx="31" cy="15" r="12" fill="none" stroke="var(--ember)" strokeWidth="2.2" />
    </svg>
  );
}

/* ── Header ─────────────────────────────────────────────────────── */

interface ChromeProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onNavigate: (target: "top" | "how" | "engine" | "faq" | "input") => void;
  showSectionNav: boolean;
  ctaLabel: string;
  onCta: () => void;
}

export function SiteChrome({
  onOpenSettings,
  onOpenHistory,
  onNavigate,
  showSectionNav,
  ctaLabel,
  onCta,
}: ChromeProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const { openRouterKey } = useBoundless();

  return (
    <header
      className="sticky top-0 z-40 border-b border-hairline backdrop-blur-xl"
      style={{ background: "color-mix(in srgb, var(--paper) 82%, transparent)" }}
    >
      <div className="wrap flex h-[64px] items-center justify-between gap-4">
        <button
          onClick={() => onNavigate("top")}
          className="flex items-center gap-3 rounded-md cursor-pointer"
          aria-label="Boundless — back to top"
        >
          <Wordmark />
          <span className="display-sm !text-[1.22rem] leading-none pt-[2px]" style={{ fontWeight: 600 }}>
            Boundless
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-7" aria-label="Sections">
          {showSectionNav ? (
            <>
              <button className="link-b text-[0.9rem] cursor-pointer" onClick={() => onNavigate("how")}>
                How it works
              </button>
              <button className="link-b text-[0.9rem] cursor-pointer" onClick={() => onNavigate("engine")}>
                The engine
              </button>
              <button className="link-b text-[0.9rem] cursor-pointer" onClick={() => onNavigate("faq")}>
                FAQ
              </button>
            </>
          ) : (
            <button className="link-b text-[0.9rem] cursor-pointer" onClick={() => onNavigate("input")}>
              New analysis
            </button>
          )}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenHistory}
            className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--ink)] cursor-pointer"
            aria-label="Analysis history"
            title="History"
          >
            <History size={17} />
          </button>
          <button
            onClick={onOpenSettings}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--ink)] cursor-pointer"
            aria-label="AI settings"
            title="AI settings (OpenRouter)"
          >
            <Settings2 size={17} />
            {openRouterKey ? (
              <span
                className="absolute top-2 right-2 h-2 w-2 rounded-full"
                style={{ background: "var(--ok)" }}
                aria-label="API key configured"
              />
            ) : null}
          </button>
          {mounted ? (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--ink)] cursor-pointer"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          ) : (
            <span className="inline-flex h-10 w-10" />
          )}
          <button
            onClick={onCta}
            className="btn-ember !min-h-[40px] !px-3.5 sm:!px-5 !py-0 !text-[0.8125rem] sm:!text-[0.875rem] ml-1"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ── Footer (sticky to bottom via mt-auto) ──────────────────────── */

export function SiteFooter({ onNavigate }: { onNavigate: (t: "engine" | "faq") => void }) {
  return (
    <footer className="mt-auto border-t border-hairline" style={{ background: "var(--paper-2)" }}>
      <div className="wrap py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Wordmark size={26} />
          <div>
            <p className="display-sm !text-[1.05rem]" style={{ fontWeight: 600 }}>
              Boundless
            </p>
            <p className="body-2 !text-[0.8rem] !text-[var(--ink-3)]">
              Aligning your resume with endless possibilities.
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-6" aria-label="Footer">
          <button className="link-b !text-[0.85rem] cursor-pointer" onClick={() => onNavigate("engine")}>
            The engine
          </button>
          <button className="link-b !text-[0.85rem] cursor-pointer" onClick={() => onNavigate("faq")}>
            FAQ
          </button>
          <span className="mono !text-[0.72rem] text-[var(--ink-3)]">
            Built with pdf.js · mammoth · natural · framer-motion
          </span>
        </nav>
      </div>
    </footer>
  );
}
