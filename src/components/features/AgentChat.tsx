"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, FlaskConical, ListPlus, Activity, FileText, ShieldAlert, ClipboardList, Camera, Stethoscope, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { mdToHtml } from "@/lib/markdown";
import { extractEvidence } from "@/lib/agent/evidence";
import { emit, streamBackendEvents, type BackendEvent } from "@/lib/telemetry";
import type { PatientContext } from "@/lib/types";

interface ProposedAction {
  resourceType: string;
  summary: string;
  resource: Record<string, unknown>;
  safety?: { verdict: "pass" | "warn" | "block" | "unreviewed"; reasons: string[] };
}

/** Badge style per Qwen Safety Sentinel verdict. */
const SAFETY_STYLE: Record<string, { label: string; cls: string }> = {
  pass: { label: "Sentinel ✓", cls: "bg-success/10 text-success" },
  warn: { label: "Sentinel ⚠ review", cls: "bg-warning/15 text-warning" },
  block: { label: "Sentinel ✕ flagged", cls: "bg-error/10 text-error" },
  unreviewed: { label: "Sentinel offline", cls: "bg-surface-alt text-text-muted" },
};
interface Msg {
  role: "user" | "atlas";
  text: string;
  actions?: ProposedAction[];
  status?: "" | "writing" | "done" | "error" | "rejected";
  result?: string;
  toolLog?: string[];
  saved?: boolean;
}

const CHIPS = [
  { icon: FileText, label: "Summarize patient", prompt: "Summarize this patient in 3 lines." },
  { icon: ListPlus, label: "Add a problem", prompt: "Add hyperlipidemia to the problem list." },
  { icon: Activity, label: "Record a vital", prompt: "Record a blood pressure of 132/86 mmHg." },
  { icon: FlaskConical, label: "Order a CBC", prompt: "Order a CBC with differential." },
  { icon: ShieldAlert, label: "Find care gaps", prompt: "Review this patient for care gaps and propose any overdue orders to close them." },
  { icon: Stethoscope, label: "Tiered differential", prompt: "Based only on this chart, give a tiered differential for the patient's active issues: Most Likely, Expanded, and Can't-Miss. One line each with the single best next diagnostic step. Cite chart evidence." },
  { icon: ClipboardList, label: "Progress note", prompt: "Write a concise SOAP progress note for today's visit based on the chart." },
];

interface Props {
  patientId: string | null;
  patientName: string;
  context: PatientContext | null;
  onWriteComplete: (ctx: PatientContext) => void;
}

/** Turn the agent's tool log into short, readable chips showing what it did. */
function traceChips(log: string[]): string[] {
  const out: string[] = [];
  for (const l of log) {
    if (l.startsWith("search ")) out.push(`🔍 ${l.split(" ")[1]}`);
    else if (l.startsWith("read ")) out.push(`📄 ${l.split(" ")[1].split("/")[0]}`);
    else if (l.startsWith("propose ")) out.push(`✎ ${l.split(" ")[1].replace(":", "")}`);
  }
  return [...new Set(out)].slice(0, 6);
}

/** Human stage line for the live working indicator, from a streamed AgentEvent. */
function stageLabel(e: BackendEvent): string {
  switch (e.kind) {
    case "route":
      return e.label.replace("router →", "routed to");
    case "fhir":
      return "reading the chart…";
    case "reason":
      return `thinking (${e.label.replace("reasoning ", "")})…`;
    case "propose":
      return "drafting a proposal…";
    case "sentinel":
      return "safety review…";
    default:
      return "working…";
  }
}

/** Build a chart item (display/code) from a proposed action's FHIR resource. */
function actionLabel(a: ProposedAction): { display: string; code: string; system: string } {
  const res = (a.resource ?? {}) as {
    code?: { text?: string; coding?: { code?: string; system?: string; display?: string }[] };
    medicationCodeableConcept?: { text?: string; coding?: { code?: string; system?: string; display?: string }[] };
  };
  const cc = res.code ?? res.medicationCodeableConcept ?? {};
  const coding = cc.coding?.[0] ?? {};
  return { display: cc.text ?? coding.display ?? a.summary, code: coding.code ?? "", system: coding.system ?? "" };
}

/** Optimistically merge confirmed writes into the chart (serverless store isn't shared). */
function mergeActions(ctx: PatientContext, actions: ProposedAction[]): PatientContext {
  const next: PatientContext = {
    ...ctx,
    problems: [...ctx.problems],
    medications: [...ctx.medications],
    allergies: [...ctx.allergies],
    vitals: [...ctx.vitals],
    labs: [...ctx.labs],
    orders: [...ctx.orders],
  };
  actions.forEach((a, i) => {
    const { display, code, system } = actionLabel(a);
    if (a.resourceType === "ServiceRequest") {
      next.orders.push({ id: `new-${i}-${display}`, resourceType: "ServiceRequest", display, code });
    } else if (a.resourceType === "Condition") {
      next.problems.push({ code: code || `new-${i}`, system, display });
    } else if (a.resourceType === "MedicationRequest") {
      next.medications.push({ code: code || `new-${i}`, system, display });
    } else if (a.resourceType === "AllergyIntolerance") {
      next.allergies.push({ code: code || `new-${i}`, system, display });
    } else if (a.resourceType === "Observation") {
      const res = (a.resource ?? {}) as {
        valueQuantity?: { value?: number; unit?: string };
        valueString?: string;
        component?: { valueQuantity?: { value?: number } }[];
      };
      let value = "";
      if (res.valueQuantity?.value != null) value = `${res.valueQuantity.value}${res.valueQuantity.unit ? " " + res.valueQuantity.unit : ""}`;
      else if (res.valueString) value = res.valueString;
      else if (res.component?.length) value = res.component.map((c) => c.valueQuantity?.value).filter(Boolean).join("/");
      next.vitals.push({ label: display, value: value || a.summary });
    }
  });
  return next;
}

export function AgentChat({ patientId, patientName, context, onWriteComplete }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, busy]);

  async function ask(text: string) {
    if (!text.trim() || !patientId || busy) return;
    const history = messages
      .slice(-6)
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    // Include current on-screen vitals so the agent reasons over edited values.
    const vitalsLine =
      context && context.vitals.length
        ? `Current on-screen vitals: ${context.vitals.map((v) => `${v.label} ${v.value}`).join(", ")}.\n\n`
        : "";
    try {
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: vitalsLine + text, patientId, history, stream: true }),
      });

      if (r.headers.get("content-type")?.includes("text/event-stream") && r.body) {
        // LIVE mode: agent events arrive as they happen — console + stage update in real time.
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        interface TurnPayload {
          reply?: string;
          proposedActions?: ProposedAction[];
          toolLog?: string[];
          usage?: { inputTokens?: number; outputTokens?: number; rounds?: number; estCostUsd?: number };
        }
        let turn: TurnPayload | null = null;
        let streamError: string | null = null;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const blocks = buf.split("\n\n");
          buf = blocks.pop() ?? "";
          for (const block of blocks) {
            const ev = block.match(/^event: (.+)$/m)?.[1];
            const dataRaw = block.match(/^data: (.+)$/m)?.[1];
            if (!ev || !dataRaw) continue;
            let data: unknown;
            try {
              data = JSON.parse(dataRaw);
            } catch {
              continue;
            }
            if (ev === "step") {
              const e = data as BackendEvent;
              emit(e);
              setStage(stageLabel(e));
            } else if (ev === "done") {
              turn = data as TurnPayload;
            } else if (ev === "error") {
              streamError = String((data as { details?: string; error?: string }).details ?? (data as { error?: string }).error ?? "Agent failed");
            }
          }
        }
        if (streamError) throw new Error(streamError);
        if (!turn) throw new Error("Stream ended without a result");

        const u = turn.usage ?? {};
        const total = (u.inputTokens ?? 0) + (u.outputTokens ?? 0);
        if (total) {
          const cost =
            typeof u.estCostUsd === "number" && u.estCostUsd > 0
              ? ` · ~$${u.estCostUsd >= 0.01 ? u.estCostUsd.toFixed(3) : u.estCostUsd.toFixed(4)}`
              : "";
          emit({
            kind: "info",
            label: `${total.toLocaleString()} tokens · ${u.rounds ?? 0} round(s)${cost}`,
            detail: `${u.inputTokens ?? 0} in / ${u.outputTokens ?? 0} out`,
          });
        }
        setMessages((m) => [
          ...m,
          { role: "atlas", text: turn!.reply || "(no reply)", actions: turn!.proposedActions || [], status: "", toolLog: turn!.toolLog || [] },
        ]);
      } else {
        // Fallback: plain JSON (validation errors, or a non-streaming deployment).
        const d = await r.json();
        if (!r.ok) throw new Error(d.details ?? d.error ?? "Agent failed");
        if (Array.isArray(d.events)) streamBackendEvents(d.events as BackendEvent[]);
        setMessages((m) => [
          ...m,
          { role: "atlas", text: d.reply || "(no reply)", actions: d.proposedActions || [], status: "", toolLog: d.toolLog || [] },
        ]);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "atlas", text: "Error: " + (e instanceof Error ? e.message : "failed") }]);
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  async function confirm(idx: number) {
    const msg = messages[idx];
    if (!msg.actions || !patientId) return;
    setMessages((m) => m.map((x, i) => (i === idx ? { ...x, status: "writing" } : x)));
    try {
      const r = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, actions: msg.actions }),
      });
      const d = await r.json();
      const w = (d.written || []).length;
      if (r.ok && w > 0) {
        (msg.actions ?? []).forEach((a) =>
          emit({ kind: "write", method: "POST", label: `${a.resourceType} committed`, detail: a.summary, status: "ok" }),
        );
      }
      setMessages((m) =>
        m.map((x, i) =>
          i === idx ? { ...x, status: r.ok ? "done" : "error", result: r.ok ? `Wrote ${w} item(s) to the chart.` : d.error } : x,
        ),
      );
      if (r.ok && context && msg.actions) {
        // Optimistically reflect the writes in the chart (serverless mock store isn't shared).
        onWriteComplete(mergeActions(context, msg.actions));
      }
    } catch {
      setMessages((m) => m.map((x, i) => (i === idx ? { ...x, status: "error", result: "Write failed" } : x)));
    }
  }

  function reject(idx: number) {
    setMessages((m) => m.map((x, i) => (i === idx ? { ...x, actions: [], status: "rejected", result: "Rejected." } : x)));
  }

  /**
   * Med-list reconciliation: photo → Qwen-VL structured extraction → the agent
   * reconciles against the chart and proposes confirm-gated writes (which the
   * Safety Sentinel then reviews). Full multimodal pipeline, one button.
   */
  async function reconcileFromPhoto(file: File) {
    if (!patientId || busy) return;
    setBusy(true);
    emit({ kind: "info", label: "Qwen-VL extracting medication list…", detail: file.name });
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read image"));
        reader.readAsDataURL(file);
      });
      const r = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mode: "meds" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Extraction failed");
      const meds = (d.meds ?? []) as { name: string; dose?: string; frequency?: string }[];
      if (meds.length === 0) {
        setMessages((m) => [...m, { role: "atlas", text: "I couldn't find any medications in that image. Try a clearer photo of the med list." }]);
        return;
      }
      emit({ kind: "info", label: `Qwen-VL extracted ${meds.length} medication(s)`, status: "ok" });
      const list = meds
        .map((x) => [x.name, x.dose, x.frequency].filter(Boolean).join(" "))
        .join("; ");
      setBusy(false);
      await ask(
        `I photographed the patient's home medication list. It contains: ${list}. ` +
          "Reconcile it against the chart: propose adding anything missing, and point out discrepancies (different dose, duplicates, or chart meds absent from the list). Do not guess missing doses.",
      );
      return;
    } catch (e) {
      setMessages((m) => [...m, { role: "atlas", text: "Error: " + (e instanceof Error ? e.message : "photo reconciliation failed") }]);
    } finally {
      setBusy(false);
    }
  }

  function saveNote(idx: number) {
    if (!context) return;
    const note = { title: "Atlas note", text: messages[idx].text, at: Date.now() };
    onWriteComplete({ ...context, notes: [note, ...(context.notes ?? [])] });
    setMessages((ms) => ms.map((x, i) => (i === idx ? { ...x, saved: true } : x)));
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={threadRef} className="flex-1 overflow-auto pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-text-muted">
              Ask anything about {patientName}, or tell me what to add to the chart. Try:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CHIPS.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => ask(prompt)}
                  disabled={busy || !patientId}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-left text-xs text-text transition-colors hover:border-primary hover:bg-primary-subtle/40 disabled:opacity-50"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 py-1">
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col gap-1.5 atlas-fade-in">
                {m.role === "user" ? (
                  <div className="self-end max-w-[88%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-surface">
                    {m.text}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 self-start max-w-[90%]">
                    {m.toolLog && m.toolLog.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {traceChips(m.toolLog).map((t, k) => (
                          <span key={k} className="rounded bg-primary-subtle/60 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {(() => {
                      const ev = extractEvidence(m.text);
                      return (
                        <>
                          <div
                            className="atlas-prose rounded-lg rounded-bl-sm bg-surface-alt px-3 py-2 text-sm text-text"
                            dangerouslySetInnerHTML={{ __html: mdToHtml(ev.text) }}
                          />
                          {ev.refs.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Evidence</span>
                              {ev.refs.map((ref) => (
                                <button
                                  key={ref}
                                  onClick={() => window.dispatchEvent(new CustomEvent("atlas-evidence", { detail: { ref } }))}
                                  title="Show in chart"
                                  className="inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-info transition-colors hover:border-info hover:bg-info/5"
                                >
                                  <Link2 className="h-2.5 w-2.5" /> {ref}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {context && (
                      <button
                        onClick={() => saveNote(i)}
                        disabled={m.saved}
                        className="self-start text-[11px] text-text-muted hover:text-primary disabled:text-success"
                      >
                        {m.saved ? "✓ Saved to chart" : "+ Save as note"}
                      </button>
                    )}
                  </div>
                )}
                {m.actions && m.actions.length > 0 && (
                  <div className="self-start w-[90%] flex flex-col gap-1.5">
                    {m.actions.map((a, j) => {
                      const safety = a.safety ? SAFETY_STYLE[a.safety.verdict] : null;
                      return (
                        <div key={j} className="rounded-md border border-border bg-surface p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-info">
                              {a.resourceType}
                            </div>
                            {safety && (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${safety.cls}`}>
                                {safety.label}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-text">{a.summary}</div>
                          {a.safety && a.safety.reasons.length > 0 && (
                            <ul className="mt-1 flex flex-col gap-0.5">
                              {a.safety.reasons.map((r, k) => (
                                <li key={k} className="text-[11px] leading-snug text-warning">
                                  ⚠ {r}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                    {m.status === "done" || m.status === "error" || m.status === "rejected" ? (
                      <div className={`text-xs ${m.status === "done" ? "text-success" : "text-text-muted"}`}>
                        {m.result}
                      </div>
                    ) : (
                      (() => {
                        const flagged = m.actions.some((a) => a.safety?.verdict === "block");
                        return (
                          <div className="flex flex-col gap-1">
                            {flagged && (
                              <div className="text-[11px] font-medium text-error">
                                The Safety Sentinel flagged item(s) above. Review the reasons before confirming.
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={flagged ? "destructive" : "primary"}
                                onClick={() => confirm(i)}
                                disabled={m.status === "writing"}
                              >
                                {m.status === "writing" ? "Writing…" : flagged ? "Confirm anyway" : `Confirm ${m.actions.length}`}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => reject(i)}>
                                Reject
                              </Button>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="self-start flex items-center gap-1.5 rounded-lg bg-surface-alt px-3 py-2 text-sm text-text-muted">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" /> {stage || "Atlas is working…"}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-end gap-2">
        <label
          className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-text-muted transition-colors hover:border-primary hover:text-primary ${busy || !patientId ? "pointer-events-none opacity-50" : ""}`}
          title="Reconcile meds from a photo (Qwen-VL)"
        >
          <Camera className="h-4 w-4" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) reconcileFromPhoto(f);
            }}
          />
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
          placeholder="Ask Atlas anything…"
          rows={1}
          className="min-h-[40px] max-h-24 flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <Button size="md" onClick={() => ask(input)} disabled={busy || !input.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
