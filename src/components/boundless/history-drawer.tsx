"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FileClock, Loader2, Sparkles, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AnalysisResult, HistoryItem } from "@/lib/analysis/types";
import { scoreColor } from "./primitives";

interface HistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (id: string, result: AnalysisResult) => void;
}

export function HistoryDrawer({ open, onOpenChange, onLoad }: HistoryDrawerProps) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history");
      const data = (await res.json()) as { items: HistoryItem[] };
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const remove = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/history/${id}`, { method: "DELETE" });
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
      toast.success("Analysis deleted");
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const openOne = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { result: AnalysisResult | null };
      if (!data.result) throw new Error();
      onOpenChange(false);
      onLoad(id, data.result);
    } catch {
      toast.error("Could not load that analysis");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="card-b !rounded-l-[var(--radius-xl)] border-l border-hairline w-full sm:max-w-[420px] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-hairline">
          <SheetTitle className="display-sm !text-[1.25rem] flex items-center gap-2.5" style={{ fontWeight: 600 }}>
            <FileClock size={18} style={{ color: "var(--ember)" }} /> History
          </SheetTitle>
          <SheetDescription className="body-2 !text-[0.82rem]">
            Recent analyses, stored locally in this sandbox.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--ember)" }} />
            </div>
          ) : !items || items.length === 0 ? (
            <p className="body-2 text-center py-12 !text-[var(--ink-3)]">
              No analyses yet — your reports will collect here.
            </p>
          ) : (
            items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                className="card-flat p-4 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <button className="text-left min-w-0 flex-1 cursor-pointer" onClick={() => openOne(item.id)}>
                    <p className="font-medium text-[0.9rem] truncate" style={{ fontWeight: 600 }}>
                      {item.jobTitle ?? "Untitled role"}
                    </p>
                    <p className="mono !text-[0.65rem] text-[var(--ink-3)] mt-1 truncate">
                      {new Date(item.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {item.fileName ? ` · ${item.fileName}` : ""}
                    </p>
                  </button>
                  <button
                    onClick={() => remove(item.id)}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-3)] hover:text-[var(--bad)] hover:bg-[var(--bad-soft)] cursor-pointer shrink-0"
                    aria-label={`Delete analysis for ${item.jobTitle ?? "role"}`}
                  >
                    {deleting === item.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  <span
                    className="mono !text-[0.72rem] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--paper)", color: scoreColor(item.overall) }}
                  >
                    match {item.overall}
                  </span>
                  <span
                    className="mono !text-[0.72rem] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--paper)", color: scoreColor(item.atsScore) }}
                  >
                    ats {item.atsScore}
                  </span>
                  <span className="chip mono !text-[0.62rem] !py-0.5">
                    {item.mode === "ai" ? (
                      <>
                        <Sparkles size={10} style={{ color: "var(--ember)" }} /> AI
                      </>
                    ) : (
                      "offline"
                    )}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
