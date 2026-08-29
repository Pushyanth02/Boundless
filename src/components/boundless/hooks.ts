"use client";

import { useEffect, useState } from "react";

/**
 * Returns true one frame after mount.
 * Used to trigger CSS enter transitions (bars filling, rings drawing)
 * after the browser has painted the initial, "empty" state.
 */
export function useEntered(): boolean {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return entered;
}

/** Formats a File size in bytes as a short human label. */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
