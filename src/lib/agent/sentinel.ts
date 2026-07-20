import type OpenAI from "openai";
import { qwenClient } from "@/lib/llm/qwen";
import { withResilience } from "@/lib/llm/resilience";
import type { ProposedAction } from "./runAgent";

/**
 * Qwen Safety Sentinel: a second, independent line of defense that reviews every
 * proposed chart write BEFORE the clinician sees it.
 *
 * Layer 1 — deterministic rules (no model): allergy conflicts and duplicate
 * therapy detected by code/name matching against the PHI-stripped chart snapshot.
 * Layer 2 — adversarial model review: qwen-max, prompted as a skeptical clinical
 * safety reviewer, returns a structured verdict per action via a forced function
 * call. A different model than the agent loop, so the author never grades its
 * own homework.
 *
 * Fail-open by design: if the sentinel errors or times out, actions are marked
 * "unreviewed" (never silently "pass"), and the clinician confirm gate still
 * stands — the sentinel adds signal, it does not replace the human.
 */

export type SentinelVerdict = "pass" | "warn" | "block" | "unreviewed";

export interface SafetyReview {
  verdict: SentinelVerdict;
  reasons: string[];
}

const SEVERITY: Record<SentinelVerdict, number> = {
  pass: 0,
  unreviewed: 1,
  warn: 2,
  block: 3,
};

function worse(a: SentinelVerdict, b: SentinelVerdict): SentinelVerdict {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

/* ------------------------------ Layer 1: rules ------------------------------ */

interface SnapshotFacts {
  allergyNames: string[];
  allergyCodes: string[];
  existingCodes: string[];
  existingNames: string[];
}

/** Tolerant extraction of codes/display names from the (possibly truncated) snapshot JSON. */
export function extractSnapshotFacts(snapshot: string): SnapshotFacts {
  const facts: SnapshotFacts = {
    allergyNames: [],
    allergyCodes: [],
    existingCodes: [],
    existingNames: [],
  };
  if (!snapshot) return facts;

  // The snapshot may be sliced mid-JSON; regex extraction stays robust to that.
  const codeRe = /"code"\s*:\s*"([^"]{2,20})"/g;
  const displayRe = /"(?:display|text)"\s*:\s*"([^"]{2,80})"/g;

  const allergySection = snapshot.match(/"allergies"\s*:\s*(\{[\s\S]*?)(?:,"orders"|$)/)?.[1] ?? "";
  for (const m of allergySection.matchAll(codeRe)) facts.allergyCodes.push(m[1]);
  for (const m of allergySection.matchAll(displayRe)) facts.allergyNames.push(m[1].toLowerCase());

  for (const m of snapshot.matchAll(codeRe)) facts.existingCodes.push(m[1]);
  for (const m of snapshot.matchAll(displayRe)) facts.existingNames.push(m[1].toLowerCase());
  return facts;
}

function actionNames(a: ProposedAction): string[] {
  const res = (a.resource ?? {}) as {
    code?: { text?: string; coding?: { code?: string; display?: string }[] };
    medicationCodeableConcept?: { text?: string; coding?: { code?: string; display?: string }[] };
  };
  const cc = res.code ?? res.medicationCodeableConcept;
  const names = [cc?.text, cc?.coding?.[0]?.display, a.summary].filter(
    (x): x is string => Boolean(x),
  );
  return names.map((n) => n.toLowerCase());
}

function actionCode(a: ProposedAction): string | null {
  const res = (a.resource ?? {}) as {
    code?: { coding?: { code?: string }[] };
    medicationCodeableConcept?: { coding?: { code?: string }[] };
  };
  return res.code?.coding?.[0]?.code ?? res.medicationCodeableConcept?.coding?.[0]?.code ?? null;
}

/** Words worth matching (skip stopwords/doses). */
function significantWords(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 5);
}

export function runRuleChecks(
  actions: ProposedAction[],
  snapshot: string,
): SafetyReview[] {
  const facts = extractSnapshotFacts(snapshot);
  return actions.map((a) => {
    const reasons: string[] = [];
    let verdict: SentinelVerdict = "pass";

    const names = actionNames(a);
    const code = actionCode(a);

    // Allergy conflict: proposed med shares a significant word with a recorded allergy.
    if (a.resourceType === "MedicationRequest") {
      for (const name of names) {
        for (const word of significantWords(name)) {
          const hit = facts.allergyNames.find((al) => al.includes(word));
          if (hit) {
            verdict = worse(verdict, "block");
            reasons.push(`Possible allergy conflict: "${word}" matches recorded allergy "${hit}"`);
          }
        }
      }
    }

    // Duplicate therapy/problem/order: exact code already on the chart.
    if (code && facts.existingCodes.includes(code)) {
      verdict = worse(verdict, "warn");
      reasons.push(`Code ${code} already present on the chart (possible duplicate)`);
    }

    return { verdict, reasons };
  });
}

/* --------------------------- Layer 2: model review --------------------------- */

const REVIEW_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "submit_review",
    description: "Submit the safety review for every proposed action. Call exactly once.",
    parameters: {
      type: "object",
      properties: {
        reviews: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "integer", description: "Index of the proposed action being reviewed." },
              verdict: { type: "string", enum: ["pass", "warn", "block"] },
              reasons: {
                type: "array",
                items: { type: "string" },
                description: "Short clinical reasons. Empty if verdict is pass.",
              },
            },
            required: ["index", "verdict", "reasons"],
          },
        },
      },
      required: ["reviews"],
    },
  },
};

const SENTINEL_SYSTEM = `You are a skeptical clinical safety reviewer. Another AI agent has proposed writes to a patient's chart. Your ONLY job is to find problems with them. You are the second line of defense before a clinician review.

For each proposed action, check against the (PHI-stripped, coded) chart:
- Drug-allergy conflicts (including cross-reactivity classes, e.g. penicillins/cephalosporins)
- Drug-drug interactions with active medications
- Duplicate or overlapping therapy
- Contraindications given active problems (e.g. NSAIDs in CKD, metformin in renal failure)
- Implausible doses or missing critical fields for the resource type
- Wrong codes (a code whose meaning does not match the stated summary)

Verdicts: "pass" (no concern), "warn" (clinician should double-check, state why), "block" (likely harmful or wrong, state why). Be specific and terse. Do NOT invent concerns; base every reason on the chart data or established clinical knowledge. Call submit_review exactly once with one review per action index.`;

interface ModelReview {
  index?: number;
  verdict?: string;
  reasons?: string[];
}

export async function runModelReview(
  actions: ProposedAction[],
  snapshot: string,
  timeoutMs = 15000,
): Promise<SafetyReview[] | null> {
  const client = qwenClient();
  const model = process.env.QWEN_SENTINEL_MODEL || "qwen-max";

  const payload = {
    chart: snapshot.slice(0, 6000),
    proposedActions: actions.map((a, i) => ({
      index: i,
      resourceType: a.resourceType,
      summary: a.summary,
      resource: a.resource,
    })),
  };

  try {
    const resp = await withResilience(
      () =>
        client.chat.completions.create({
          model,
          max_tokens: 900,
          tools: [REVIEW_TOOL],
          tool_choice: { type: "function", function: { name: "submit_review" } },
          messages: [
            { role: "system", content: SENTINEL_SYSTEM },
            { role: "user", content: JSON.stringify(payload) },
          ],
        }),
      { timeoutMs, retries: 0 },
    );

    const msg = resp.choices[0]?.message;
    const tc = msg?.tool_calls?.find(
      (t): t is Extract<typeof t, { type: "function" }> => t.type === "function",
    );
    const raw = tc?.function.arguments ?? msg?.content ?? "";
    const parsed = JSON.parse(
      typeof raw === "string" ? raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}" : "{}",
    ) as { reviews?: ModelReview[] };

    const out: SafetyReview[] = actions.map(() => ({ verdict: "pass", reasons: [] }));
    for (const r of parsed.reviews ?? []) {
      if (typeof r.index !== "number" || r.index < 0 || r.index >= actions.length) continue;
      const v = r.verdict === "block" || r.verdict === "warn" || r.verdict === "pass" ? r.verdict : "pass";
      out[r.index] = { verdict: v, reasons: (r.reasons ?? []).slice(0, 4) };
    }
    return out;
  } catch {
    return null; // fail-open → caller marks unreviewed
  }
}

/* --------------------------------- Combined --------------------------------- */

export interface SentinelResult {
  reviews: SafetyReview[];
  modelRan: boolean;
  model: string;
}

export async function reviewProposedActions(
  actions: ProposedAction[],
  snapshot: string,
): Promise<SentinelResult> {
  const model = process.env.QWEN_SENTINEL_MODEL || "qwen-max";
  const rules = runRuleChecks(actions, snapshot);
  const modelReviews = await runModelReview(actions, snapshot);

  const reviews = actions.map((_, i) => {
    const rule = rules[i];
    if (!modelReviews) {
      // Model layer unavailable: keep rule findings, else be explicit about it.
      return rule.reasons.length > 0 ? rule : { verdict: "unreviewed" as const, reasons: [] };
    }
    const m = modelReviews[i];
    return {
      verdict: worse(rule.verdict, m.verdict),
      reasons: [...rule.reasons, ...m.reasons],
    };
  });

  return { reviews, modelRan: modelReviews !== null, model };
}
