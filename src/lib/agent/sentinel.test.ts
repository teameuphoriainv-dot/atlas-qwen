import { describe, it, expect } from "vitest";
import { runRuleChecks, extractSnapshotFacts } from "./sentinel";
import type { ProposedAction } from "./runAgent";

/** Minimal PHI-stripped snapshot in the shape runAgent builds (order matters:
 *  allergies section is delimited by the trailing "orders" key). */
const SNAPSHOT = JSON.stringify({
  conditions: {
    entry: [{ resource: { code: { coding: [{ code: "44054006", display: "Type 2 diabetes" }] } } }],
  },
  observations: null,
  medications: {
    entry: [{ resource: { medicationCodeableConcept: { coding: [{ code: "860975", display: "Metformin 1000 MG" }] } } }],
  },
  allergies: {
    entry: [{ resource: { code: { coding: [{ code: "7980", display: "Penicillin G" }], text: "Penicillin G" } } }],
  },
  orders: null,
});

function med(name: string, code: string): ProposedAction {
  return {
    resourceType: "MedicationRequest",
    summary: `Start ${name}`,
    resource: {
      medicationCodeableConcept: { text: name, coding: [{ code, display: name }] },
    },
  };
}

describe("Qwen Safety Sentinel — rule layer", () => {
  it("extracts allergy names and existing codes from the snapshot", () => {
    const facts = extractSnapshotFacts(SNAPSHOT);
    expect(facts.allergyNames.some((n) => n.includes("penicillin"))).toBe(true);
    expect(facts.existingCodes).toContain("860975");
    expect(facts.existingCodes).toContain("44054006");
  });

  it("blocks a proposed med that matches a recorded allergy", () => {
    const [review] = runRuleChecks([med("Penicillin VK 500mg", "834061")], SNAPSHOT);
    expect(review.verdict).toBe("block");
    expect(review.reasons[0]).toMatch(/allergy/i);
  });

  it("warns on duplicate therapy when the exact code is already charted", () => {
    const [review] = runRuleChecks([med("Metformin 1000 MG", "860975")], SNAPSHOT);
    expect(review.verdict).toBe("warn");
    expect(review.reasons[0]).toMatch(/duplicate/i);
  });

  it("passes a clean, unrelated proposal", () => {
    const [review] = runRuleChecks([med("Atorvastatin 20 MG", "617311")], SNAPSHOT);
    expect(review.verdict).toBe("pass");
    expect(review.reasons).toHaveLength(0);
  });

  it("survives a truncated (mid-JSON) snapshot without throwing", () => {
    const truncated = SNAPSHOT.slice(0, Math.floor(SNAPSHOT.length * 0.6));
    expect(() => runRuleChecks([med("Aspirin 81 MG", "243670")], truncated)).not.toThrow();
  });
});
