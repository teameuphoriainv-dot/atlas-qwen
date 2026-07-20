// @vitest-environment node
import { describe, it, expect } from "vitest";
import { addAudit, listAudit, verifyAuditChain } from "./log";
import type { AuditEntry } from "@/lib/types";

describe("tamper-evident audit chain", () => {
  it("chains entries and verifies clean", () => {
    addAudit({ patientRef: "Patient/t1", action: "drafted", orderSummaries: ["CBC"] });
    addAudit({ patientRef: "Patient/t1", action: "confirmed", orderSummaries: ["CBC"] });
    addAudit({ patientRef: "Patient/t1", action: "rejected", orderSummaries: ["MRI"] });

    const entries = listAudit();
    expect(entries.length).toBeGreaterThanOrEqual(3);
    expect(entries[0].hash).toBeTruthy();
    expect(entries[0].prevHash).toBe(entries[1].hash);

    const check = verifyAuditChain(entries);
    expect(check.valid).toBe(true);
    expect(check.checked).toBe(entries.length);
  });

  it("detects tampering with a past entry", () => {
    const entries: AuditEntry[] = JSON.parse(JSON.stringify(listAudit()));
    const victim = entries[entries.length - 2] ?? entries[0];
    victim.orderSummaries = ["Oxycodone 80mg x 500"]; // the classic reason audit logs exist
    const check = verifyAuditChain(entries);
    expect(check.valid).toBe(false);
    expect(check.brokenAtSeq).toBe(victim.seq);
  });

  it("detects deletion of a middle entry", () => {
    const entries: AuditEntry[] = JSON.parse(JSON.stringify(listAudit()));
    entries.splice(1, 1);
    expect(verifyAuditChain(entries).valid).toBe(false);
  });
});
