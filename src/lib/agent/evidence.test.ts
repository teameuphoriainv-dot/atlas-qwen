import { describe, it, expect } from "vitest";
import { extractEvidence } from "./evidence";

describe("per-claim evidence provenance", () => {
  it("extracts and strips valid FHIR references", () => {
    const { text, refs } = extractEvidence(
      "BP is elevated [Observation/bp-1] and he has T2DM [Condition/dm-2]. Recheck in 2 weeks.",
    );
    expect(refs).toEqual(["Observation/bp-1", "Condition/dm-2"]);
    expect(text).toBe("BP is elevated and he has T2DM. Recheck in 2 weeks.");
  });

  it("deduplicates repeated citations", () => {
    const { refs } = extractEvidence("A [Condition/x] then again [Condition/x].");
    expect(refs).toEqual(["Condition/x"]);
  });

  it("ignores bracketed text that is not a FHIR reference", () => {
    const { text, refs } = extractEvidence("Consider [urgent] review [not/a/ref] [Foo/123].");
    expect(refs).toEqual([]);
    expect(text).toContain("[urgent]");
    expect(text).toContain("[Foo/123]");
  });

  it("handles replies with no citations", () => {
    const { text, refs } = extractEvidence("All good.");
    expect(refs).toEqual([]);
    expect(text).toBe("All good.");
  });
});
