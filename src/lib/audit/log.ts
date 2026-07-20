import { createHash } from "crypto";
import type { AuditEntry } from "@/lib/types";

/**
 * Tamper-evident audit log: every entry is SHA-256 hash-chained to the previous
 * one (blockchain-style, minus the theater). Any mutation, insertion, or
 * deletion of a past entry breaks the chain, and `verifyAuditChain()` reports
 * exactly where. In-memory per server instance for the demo; production swaps
 * the array for an append-only store and keeps the same chain semantics.
 */
const entries: AuditEntry[] = []; // newest first
const MAX = 100;
let seq = 0;

const GENESIS = "atlas-genesis";

function entryHash(e: Omit<AuditEntry, "hash">): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        seq: e.seq,
        at: e.at,
        patientRef: e.patientRef,
        action: e.action,
        orderSummaries: e.orderSummaries,
        prevHash: e.prevHash,
      }),
    )
    .digest("hex");
}

export function addAudit(entry: Omit<AuditEntry, "at" | "seq" | "prevHash" | "hash">): void {
  const prevHash = entries[0]?.hash ?? GENESIS;
  const base: Omit<AuditEntry, "hash"> = {
    ...entry,
    at: Date.now(),
    seq: seq++,
    prevHash,
  };
  entries.unshift({ ...base, hash: entryHash(base) });
  if (entries.length > MAX) entries.length = MAX;
}

export function listAudit(): AuditEntry[] {
  return [...entries];
}

export interface ChainVerification {
  valid: boolean;
  checked: number;
  brokenAtSeq?: number;
}

/** Walk the chain oldest→newest; recompute every hash and link. */
export function verifyAuditChain(list: AuditEntry[] = entries): ChainVerification {
  const asc = [...list].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  for (let i = 0; i < asc.length; i++) {
    const e = asc[i];
    const expectedPrev = i === 0 ? undefined : asc[i - 1].hash;
    if (i > 0 && e.prevHash !== expectedPrev) {
      return { valid: false, checked: i + 1, brokenAtSeq: e.seq };
    }
    const { hash, ...rest } = e;
    if (hash !== entryHash(rest)) {
      return { valid: false, checked: i + 1, brokenAtSeq: e.seq };
    }
  }
  return { valid: true, checked: asc.length };
}
