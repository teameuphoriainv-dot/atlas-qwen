import type OpenAI from "openai";
import { qwenClient } from "@/lib/llm/qwen";
import { withResilience } from "@/lib/llm/resilience";
import { estimateCostUsd } from "@/lib/llm/pricing";
import { routeAgentModel } from "@/lib/llm/router";
import { FHIR_TOOLS, buildAgentSystemPrompt } from "./fhirTools";
import { sanitize, sanitizeBundle } from "./sanitize";
import type { FhirClient } from "@/lib/fhir/remote";
import type { SafetyReview } from "./sentinel";

export interface ProposedAction {
  resourceType: string;
  summary: string;
  resource: Record<string, unknown>;
  /** Attached by the Qwen Safety Sentinel after the loop completes. */
  safety?: SafetyReview;
}

/** A structured telemetry step for the Live System Console (real timings/labels). */
export interface AgentEvent {
  kind: "fhir" | "reason" | "propose" | "route" | "sentinel";
  label: string;
  detail?: string;
  ms?: number;
  status?: "ok" | "error";
}

export interface AgentTurn {
  reply: string;
  proposedActions: ProposedAction[];
  toolLog: string[]; // human-readable trace for the UI
  events: AgentEvent[]; // structured trace for the Live System Console
  usage: { inputTokens: number; outputTokens: number; rounds: number; estCostUsd: number };
}

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

function parseArgs(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Run one agent turn: a bounded tool-call loop against Qwen on Alibaba Cloud
 * Model Studio. Reads auto-execute (sanitized into context); writes are
 * collected as proposed actions for clinician confirmation.
 */
export async function runAgent(opts: {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  patientRef: string;
  fhir: FhirClient;
}): Promise<AgentTurn> {
  const client = qwenClient();
  // Smart router: qwen-turbo/plus/max by request complexity (see lib/llm/router).
  const route = routeAgentModel(opts.message);
  const AGENT_MODEL = route.model;

  const proposedActions: ProposedAction[] = [];
  const toolLog: string[] = [];
  const events: AgentEvent[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let rounds = 0;
  let estCostUsd = 0;

  events.push({
    kind: "route",
    label: `router → ${route.model}`,
    detail: `${route.tier} · ${route.reason}`,
    status: "ok",
  });

  // Pre-load a PHI-stripped chart snapshot so the agent reasons in 1-2 rounds
  // instead of many sequential searches (huge latency win).
  let snapshot = "";
  const ref = opts.patientRef;
  try {
    const snapStart = Date.now();
    const [cond, obs, meds, alg, srv] = await Promise.all([
      opts.fhir.search("Condition", `subject=${ref}&_count=50`).catch(() => null),
      opts.fhir.search("Observation", `patient=${ref}&_count=50`).catch(() => null),
      opts.fhir.search("MedicationStatement", `subject=${ref}&_count=50`).catch(() => null),
      opts.fhir.search("AllergyIntolerance", `patient=${ref}&_count=50`).catch(() => null),
      opts.fhir.search("ServiceRequest", `subject=${ref}&_count=50`).catch(() => null),
    ]);
    snapshot = JSON.stringify({
      conditions: cond ? sanitizeBundle(cond) : null,
      observations: obs ? sanitizeBundle(obs) : null,
      medications: meds ? sanitizeBundle(meds) : null,
      allergies: alg ? sanitizeBundle(alg) : null,
      orders: srv ? sanitizeBundle(srv) : null,
    }).slice(0, 9000);
    toolLog.push("search Condition", "search Observation", "search AllergyIntolerance");
    events.push({
      kind: "fhir",
      label: "Snapshot ×5 resources",
      detail: "Condition · Observation · Medication · Allergy · ServiceRequest",
      ms: Date.now() - snapStart,
      status: "ok",
    });
  } catch {
    /* fall back to on-demand tools */
  }

  const messages: Msg[] = [
    { role: "system", content: buildAgentSystemPrompt(opts.patientRef, snapshot) },
    ...(opts.history ?? []),
    { role: "user", content: opts.message },
  ];

  /** Run the Qwen Safety Sentinel over proposed writes, then assemble the turn. */
  async function finish(reply: string): Promise<AgentTurn> {
    if (proposedActions.length > 0) {
      const sentStart = Date.now();
      const { reviewProposedActions } = await import("./sentinel");
      const result = await reviewProposedActions(proposedActions, snapshot);
      result.reviews.forEach((review, i) => {
        proposedActions[i].safety = review;
      });
      const worst = result.reviews.reduce(
        (acc, r) => (r.verdict === "block" ? "block" : r.verdict === "warn" && acc !== "block" ? "warn" : acc),
        "pass" as string,
      );
      events.push({
        kind: "sentinel",
        label: `sentinel ${result.modelRan ? result.model : "rules-only"} · ${worst}`,
        detail: result.reviews
          .flatMap((r) => r.reasons)
          .slice(0, 2)
          .join("; ") || `${proposedActions.length} action(s) reviewed`,
        ms: Date.now() - sentStart,
        status: worst === "block" ? "error" : "ok",
      });
    }
    return {
      reply,
      proposedActions,
      toolLog,
      events,
      usage: { inputTokens, outputTokens, rounds, estCostUsd },
    };
  }

  for (let round = 0; round < 5; round++) {
    const roundStart = Date.now();
    const resp = await withResilience(
      () =>
        client.chat.completions.create({
          model: AGENT_MODEL,
          max_tokens: 1500,
          tools: FHIR_TOOLS,
          messages,
        }),
      { timeoutMs: 30_000, retries: 1 },
    );
    rounds++;
    inputTokens += resp.usage?.prompt_tokens ?? 0;
    outputTokens += resp.usage?.completion_tokens ?? 0;
    estCostUsd += estimateCostUsd(
      AGENT_MODEL,
      resp.usage?.prompt_tokens ?? 0,
      resp.usage?.completion_tokens ?? 0,
    );
    events.push({
      kind: "reason",
      label: `reasoning round ${round + 1}`,
      detail: `${resp.usage?.completion_tokens ?? 0} tok out · ${AGENT_MODEL}`,
      ms: Date.now() - roundStart,
      status: "ok",
    });

    const msg = resp.choices[0]?.message;
    const toolCalls = (msg?.tool_calls ?? []).filter(
      (tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
        tc.type === "function",
    );

    if (!msg || toolCalls.length === 0) {
      return finish((msg?.content ?? "").trim());
    }

    messages.push({
      role: "assistant",
      content: msg.content ?? "",
      tool_calls: msg.tool_calls,
    });

    for (const tc of toolCalls) {
      const input = parseArgs(tc.function.arguments);
      const push = (content: string) =>
        messages.push({ role: "tool", tool_call_id: tc.id, content });
      try {
        if (tc.function.name === "search_fhir") {
          const rt = String(input.resourceType);
          const q = String(input.query ?? "");
          toolLog.push(`search ${rt} ${q}`);
          const opStart = Date.now();
          const data = await opts.fhir.search(rt, q);
          events.push({ kind: "fhir", label: `GET ${rt}`, detail: q || undefined, ms: Date.now() - opStart, status: "ok" });
          push(JSON.stringify(sanitizeBundle(data)).slice(0, 9000));
        } else if (tc.function.name === "read_fhir") {
          const rt = String(input.resourceType);
          const id = String(input.id);
          toolLog.push(`read ${rt}/${id}`);
          const opStart = Date.now();
          const data = await opts.fhir.read(rt, id);
          events.push({ kind: "fhir", label: `GET ${rt}/${id}`, ms: Date.now() - opStart, status: "ok" });
          push(JSON.stringify(sanitize(data)).slice(0, 6000));
        } else if (tc.function.name === "propose_write") {
          const action: ProposedAction = {
            resourceType: String(input.resourceType),
            summary: String(input.summary ?? ""),
            resource: (input.resource as Record<string, unknown>) ?? {},
          };
          proposedActions.push(action);
          toolLog.push(`propose ${action.resourceType}: ${action.summary}`);
          events.push({ kind: "propose", label: `propose ${action.resourceType}`, detail: action.summary, status: "ok" });
          push("Queued for clinician confirmation. NOT yet written.");
        } else {
          push(`Unknown tool: ${tc.function.name}`);
        }
      } catch (e) {
        events.push({ kind: "fhir", label: `${tc.function.name} failed`, detail: e instanceof Error ? e.message : String(e), status: "error" });
        push(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return finish("I gathered a lot but hit the step limit — ask me to continue.");
}
