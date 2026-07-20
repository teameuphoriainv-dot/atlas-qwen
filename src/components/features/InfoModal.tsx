"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Database,
  Info,
  Link2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const SEEN_KEY = "atlas_intro_seen_v1";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Multi-model Qwen orchestration",
    body: "A smart router picks qwen-turbo, plus, or max per request; a second, independent Qwen model (the Safety Sentinel) adversarially reviews every proposed write before you see it.",
  },
  {
    icon: Database,
    title: "Built on real FHIR R4",
    body: "Atlas reads the chart and writes coded orders as structured FHIR resources, live against Epic (SMART-on-FHIR) and HAPI, with a structural validator at the write boundary.",
  },
  {
    icon: Link2,
    title: "Evidence-linked answers",
    body: "Replies cite the exact chart resources behind each claim. Click a citation chip and the chart section lights up.",
  },
  {
    icon: ShieldCheck,
    title: "HIPAA-aligned architecture",
    body: "PHI-isolation is enforced in code: the AI reasons only over de-identified coded data. Names, MRNs, and DOBs never reach the model.",
  },
  {
    icon: CheckCircle2,
    title: "Clinician-confirmed & tamper-evident audit",
    body: "Nothing is written without an explicit confirm, flagged items require a deliberate override, and the audit log is hash-chained so history can't be silently altered.",
  },
  {
    icon: Activity,
    title: "Watch it work, live",
    body: "The Live System Console (bottom-left) streams routing decisions, FHIR calls, reasoning rounds, safety verdicts, tokens, and cost in real time.",
  },
];

/**
 * Welcome / tutorial popup for the live demo. Auto-opens on a visitor's first
 * load (localStorage-gated) and is reopenable anytime via the floating info tab.
 */
export function InfoModal() {
  const [open, setOpen] = useState(false);

  // Open automatically the first time this browser sees the demo. Deferred to a
  // post-paint task so it stays hydration-safe (server renders the modal closed).
  useEffect(() => {
    let firstVisit = true;
    try {
      firstVisit = !localStorage.getItem(SEEN_KEY);
    } catch {
      firstVisit = true;
    }
    if (!firstVisit) return;
    const t = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode — fine, it just reopens next load */
    }
  }

  return (
    <>
      {/* Floating tab to (re)open the tutorial */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-1/2 top-4 z-[55] flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-primary/20 bg-surface/90 px-3.5 py-1.5 text-xs font-medium text-primary shadow-md backdrop-blur transition-colors hover:border-primary hover:bg-primary-subtle/50"
        aria-label="How Atlas works"
      >
        <Info className="h-3.5 w-3.5" aria-hidden /> How Atlas works
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm atlas-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="atlas-intro-title"
          onClick={close}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-surface shadow-xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header band */}
            <div className="relative bg-primary px-6 py-5 text-white">
              <button
                type="button"
                onClick={close}
                className="absolute right-3 top-3 rounded-md p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                  EHR Copilot
                </span>
              </div>
              <h2 id="atlas-intro-title" className="mt-1 text-2xl font-bold">
                Atlas: an autopilot agent on Qwen
              </h2>
              <p className="mt-1 text-sm text-white/80">
                Reads the chart, reasons over it, and drafts coded chart actions.
                A second AI reviews them. You hold the pen.
              </p>
            </div>

            {/* Features */}
            <div className="flex flex-col gap-4 px-6 py-5">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle/60 text-primary">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text">{title}</h3>
                    <p className="text-sm leading-snug text-text-muted">{body}</p>
                  </div>
                </div>
              ))}

              {/* Synthetic-data disclosure */}
              <div className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-xs text-text-muted">
                This public demo runs on <strong>synthetic patients</strong> — no
                real PHI is ever used.
              </div>

              <Button size="md" onClick={close} className="mt-1 w-full justify-center">
                Start the demo
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
