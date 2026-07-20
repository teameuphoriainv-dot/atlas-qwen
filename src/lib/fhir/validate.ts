/**
 * Structural FHIR R4 validation for agent-proposed writes: the last deterministic
 * gate before anything reaches the FHIR server. Industry-standard rigor: never
 * trust model output shape, even after forced function calling — validate at the
 * write boundary (defense in depth alongside the Safety Sentinel and the human
 * confirm gate).
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

type Res = Record<string, unknown>;

function hasCodeable(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const cc = x as { text?: unknown; coding?: unknown[] };
  if (typeof cc.text === "string" && cc.text.length > 0) return true;
  if (Array.isArray(cc.coding) && cc.coding.length > 0) {
    const c0 = cc.coding[0] as { code?: unknown; system?: unknown };
    return typeof c0.code === "string" && c0.code.length > 0;
  }
  return false;
}

function str(x: unknown): x is string {
  return typeof x === "string" && x.length > 0;
}

const STATUS = {
  ServiceRequest: ["draft", "active", "on-hold", "revoked", "completed", "entered-in-error", "unknown"],
  MedicationRequest: ["active", "on-hold", "cancelled", "completed", "entered-in-error", "stopped", "draft", "unknown"],
  Observation: ["registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error", "unknown"],
};

export function validateResource(resourceType: string, resource: Res): ValidationResult {
  const errors: string[] = [];
  const r = resource ?? {};

  switch (resourceType) {
    case "ServiceRequest": {
      if (!str(r.status) || !STATUS.ServiceRequest.includes(r.status)) errors.push("status missing or invalid");
      if (!str(r.intent)) errors.push("intent is required (e.g. 'order')");
      if (!hasCodeable(r.code)) errors.push("code with a coding (LOINC/SNOMED) or text is required");
      break;
    }
    case "MedicationRequest": {
      if (!str(r.status) || !STATUS.MedicationRequest.includes(r.status)) errors.push("status missing or invalid");
      if (!str(r.intent)) errors.push("intent is required (e.g. 'order')");
      if (!hasCodeable(r.medicationCodeableConcept) && !r.medicationReference)
        errors.push("medicationCodeableConcept (RxNorm) or medicationReference is required");
      const di = r.dosageInstruction;
      if (!Array.isArray(di) || di.length === 0 || !str((di[0] as Res)?.text))
        errors.push("dosageInstruction[0].text is required (never write a med without dosing)");
      break;
    }
    case "Condition": {
      if (!hasCodeable(r.code)) errors.push("code with a coding (SNOMED/ICD) or text is required");
      break;
    }
    case "Observation": {
      if (!str(r.status) || !STATUS.Observation.includes(r.status)) errors.push("status missing or invalid");
      if (!hasCodeable(r.code)) errors.push("code with a coding (LOINC) or text is required");
      const hasValue =
        r.valueQuantity != null ||
        r.valueString != null ||
        r.valueCodeableConcept != null ||
        r.valueBoolean != null ||
        (Array.isArray(r.component) && r.component.length > 0);
      if (!hasValue) errors.push("a value[x] or component[] is required");
      break;
    }
    case "AllergyIntolerance": {
      if (!hasCodeable(r.code)) errors.push("code (substance) with a coding or text is required");
      break;
    }
    default:
      errors.push(`resourceType ${resourceType} is not writable`);
  }

  return { valid: errors.length === 0, errors };
}
