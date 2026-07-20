/**
 * Smart model router: picks the right Qwen tier per request so simple asks are
 * fast/cheap and complex clinical reasoning gets the strongest model. The
 * routing decision is surfaced in the Live System Console, so the multi-model
 * orchestration is visible, not hidden.
 *
 * Tiers (all Alibaba Cloud Model Studio):
 *   qwen-turbo — trivial read-only Q&A (fast, cheap)
 *   qwen-plus  — standard interactive agent turns (default)
 *   qwen-max   — complex clinical reasoning: care gaps, interactions,
 *                multi-order requests, notes, med reconciliation
 */

export interface RouteDecision {
  model: string;
  tier: "simple" | "standard" | "complex";
  reason: string;
}

const COMPLEX_PATTERNS: [RegExp, string][] = [
  [/care gap|overdue|screening|preventive/i, "care-gap review"],
  [/interact|contraindic|conflict|safe to|risk/i, "interaction analysis"],
  [/reconcil/i, "med reconciliation"],
  [/note|soap|assessment and plan/i, "clinical note drafting"],
  [/\band\b.*\b(order|start|add|record)\b|\b(order|start|add|record)\b.*\band\b/i, "multi-action request"],
  [/why|explain|differential|workup/i, "clinical reasoning"],
];

const WRITE_VERBS = /\b(order|start|add|record|prescribe|stop|discontinue|write|place|renew)\b/i;

export function routeAgentModel(message: string): RouteDecision {
  // Explicit override always wins (also the escape hatch if a tier misbehaves).
  const forced = process.env.ATLAS_AGENT_MODEL;
  if (forced) return { model: forced, tier: "standard", reason: "ATLAS_AGENT_MODEL override" };

  const simple = process.env.QWEN_ROUTER_SIMPLE || "qwen-turbo";
  const standard = process.env.QWEN_AGENT_MODEL || "qwen-plus";
  const complex = process.env.QWEN_ROUTER_COMPLEX || "qwen-max";

  for (const [re, label] of COMPLEX_PATTERNS) {
    if (re.test(message)) return { model: complex, tier: "complex", reason: label };
  }
  if (WRITE_VERBS.test(message)) {
    return { model: standard, tier: "standard", reason: "chart-mutating request" };
  }
  if (message.length <= 80) {
    return { model: simple, tier: "simple", reason: "short read-only ask" };
  }
  return { model: standard, tier: "standard", reason: "default" };
}
