/**
 * Per-claim evidence provenance (the pattern behind Abridge "Linked Evidence",
 * Navina's evidence-linked insights, and Regard's supported diagnoses): the
 * agent cites the FHIR resources behind each statement as inline [Type/id]
 * references. This module extracts and validates them deterministically —
 * references that don't look like real FHIR refs are dropped, so the UI never
 * renders a hallucinated citation format.
 */

const REF_TYPES = [
  "Condition",
  "Observation",
  "MedicationRequest",
  "MedicationStatement",
  "AllergyIntolerance",
  "ServiceRequest",
  "Procedure",
  "Encounter",
  "DiagnosticReport",
  "Immunization",
] as const;

const REF_RE = new RegExp(
  `\\[((?:${REF_TYPES.join("|")})\\/[A-Za-z0-9\\-.]{1,64})\\]`,
  "g",
);

export interface EvidenceResult {
  /** Reply text with the [Type/id] citations removed (for display). */
  text: string;
  /** Deduplicated, order-preserving list of cited FHIR references. */
  refs: string[];
}

export function extractEvidence(reply: string): EvidenceResult {
  const refs: string[] = [];
  const text = reply
    .replace(REF_RE, (_, ref: string) => {
      if (!refs.includes(ref)) refs.push(ref);
      return "";
    })
    // Tidy leftover doubled spaces / space-before-punctuation from removals.
    .replace(/ {2,}/g, " ")
    .replace(/ ([.,;:])/g, "$1")
    .trim();
  return { text, refs };
}
