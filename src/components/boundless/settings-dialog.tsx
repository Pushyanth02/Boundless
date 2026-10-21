"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURATED_MODELS } from "@/lib/openrouter";
import { useBoundless } from "@/lib/store";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { openRouterKey, setKey, model, setModel } = useBoundless();
  const [draft, setDraft] = useState(openRouterKey);
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; label?: string; error?: string } | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customModel, setCustomModel] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(openRouterKey);
      setTestResult(null);
      const isCurated = CURATED_MODELS.some((m) => m.slug === model);
      setCustomMode(!isCurated);
      setCustomModel(isCurated ? "" : model);
    }
  }, [open, openRouterKey, model]);

  const test = async () => {
    if (!draft || draft.length < 20) {
      setTestResult({ ok: false, error: "Enter a key first (starts with sk-or-…)." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/openrouter/test", {
        method: "POST",
        headers: { "x-openrouter-key": draft },
      });
      const data = (await res.json()) as { ok: boolean; label?: string; error?: string };
      setTestResult(data);
      if (data.ok) {
        setKey(draft.trim());
        toast.success("OpenRouter key validated");
      }
    } catch {
      setTestResult({ ok: false, error: "Network error — try again." });
    } finally {
      setTesting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    // Persist the draft when closing so an untested key isn't lost.
    if (!open) {
      const trimmed = draft.trim();
      if (trimmed.length >= 20 && trimmed !== openRouterKey) {
        setKey(trimmed);
      } else if (trimmed.length === 0 && openRouterKey) {
        setKey("");
      }
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] card-b !rounded-[var(--radius-xl)] p-6 gap-0">
        <DialogHeader className="text-left">
          <DialogTitle className="display-sm !text-[1.3rem]" style={{ fontWeight: 600 }}>
            AI settings
          </DialogTitle>
          <DialogDescription className="body-2 !text-[0.85rem]">
            Bring your own OpenRouter key to unlock the AI layer. The offline engine never needs
            this.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Key */}
          <div>
            <label htmlFor="or-key" className="eyebrow flex items-center gap-2">
              <KeyRound size={13} style={{ color: "var(--ember)" }} /> OpenRouter API key
            </label>
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <input
                  id="or-key"
                  type={show ? "text" : "password"}
                  className="field !pr-10"
                  placeholder="sk-or-v1-…"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setTestResult(null);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer"
                  aria-label={show ? "Hide key" : "Show key"}
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button className="btn-ghost-b !min-h-[42px] !px-4 !py-0 shrink-0" onClick={test} disabled={testing}>
                {testing ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                Test
              </button>
            </div>
            {testResult ? (
              <p
                className="!mt-2 text-[0.8rem] flex items-center gap-1.5"
                style={{ color: testResult.ok ? "var(--ok)" : "var(--bad)" }}
                role="status"
              >
                {testResult.ok ? <Check size={13} /> : null}
                {testResult.ok ? testResult.label : testResult.error}
              </p>
            ) : null}
            <p className="body-2 !text-[0.75rem] !mt-2 !text-[var(--ink-3)]">
              Stored only in this browser (localStorage) and forwarded exclusively to OpenRouter
              with your own requests — never persisted on the server.{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="link-b"
              >
                Get a key <ExternalLink size={10} className="inline" />
              </a>
            </p>
          </div>

          {/* Model */}
          <div>
            <label htmlFor="or-model" className="eyebrow">
              Model
            </label>
            <div className="mt-2">
              {customMode ? (
                <div className="flex gap-2">
                  <input
                    id="or-model"
                    className="field"
                    placeholder="vendor/model-slug e.g. qwen/qwen-2.5-72b-instruct"
                    value={customModel}
                    onChange={(e) => {
                      setCustomModel(e.target.value);
                      if (e.target.value.trim()) setModel(e.target.value.trim());
                    }}
                    spellCheck={false}
                  />
                  <button
                    className="btn-ghost-b !min-h-[42px] !px-4 !py-0 shrink-0"
                    onClick={() => {
                      setCustomMode(false);
                      setModel(CURATED_MODELS[0].slug);
                    }}
                  >
                    Curated list
                  </button>
                </div>
              ) : (
                <Select
                  value={model}
                  onValueChange={(v) => {
                    if (v === "__custom__") {
                      setCustomMode(true);
                    } else {
                      setModel(v);
                    }
                  }}
                >
                  <SelectTrigger id="or-model" className="field !h-[44px] !w-full">
                    <SelectValue placeholder="Choose a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURATED_MODELS.map((m) => (
                      <SelectItem key={m.slug} value={m.slug}>
                        <span className="font-medium">{m.label}</span>
                        <span className="mono !text-[0.68rem] text-[var(--ink-3)] ml-2">{m.note}</span>
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">
                      <span style={{ color: "var(--ember)" }}>Custom slug…</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Clear */}
          {openRouterKey ? (
            <button
              className="link-b mono !text-[0.72rem] cursor-pointer inline-flex items-center gap-1.5"
              onClick={() => {
                setKey("");
                setDraft("");
                setTestResult(null);
                toast("Key removed from this browser");
              }}
            >
              <Trash2 size={12} /> remove stored key
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
