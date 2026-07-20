import { describe, it, expect } from "vitest";
import { validateResource } from "./validate";

describe("FHIR write validator", () => {
  it("accepts a complete ServiceRequest", () => {
    const r = validateResource("ServiceRequest", {
      status: "active",
      intent: "order",
      code: { coding: [{ system: "http://loinc.org", code: "58410-2", display: "CBC" }] },
    });
    expect(r.valid).toBe(true);
  });

  it("rejects a MedicationRequest without dosing (never write a med without a dose)", () => {
    const r = validateResource("MedicationRequest", {
      status: "active",
      intent: "order",
      medicationCodeableConcept: { coding: [{ code: "860975", display: "Metformin" }] },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/dosageInstruction/);
  });

  it("rejects an Observation with no value or component", () => {
    const r = validateResource("Observation", {
      status: "final",
      code: { coding: [{ code: "8480-6", display: "Systolic BP" }] },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/value/);
  });

  it("accepts an Observation with components (e.g. blood pressure)", () => {
    const r = validateResource("Observation", {
      status: "final",
      code: { text: "Blood pressure" },
      component: [{ valueQuantity: { value: 132 } }, { valueQuantity: { value: 86 } }],
    });
    expect(r.valid).toBe(true);
  });

  it("rejects an invalid status and an unwritable resourceType", () => {
    expect(validateResource("ServiceRequest", { status: "banana", intent: "order", code: { text: "x" } }).valid).toBe(false);
    expect(validateResource("Patient", {}).valid).toBe(false);
  });

  it("rejects a Condition with no code at all", () => {
    expect(validateResource("Condition", {}).valid).toBe(false);
  });
});
