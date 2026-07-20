// @vitest-environment node
import { describe, it, expect } from "vitest";
import { withResilience, CircuitBreaker } from "./resilience";

const fail = (msg: string) => () => Promise.reject(new Error(msg));

describe("LLM resilience layer", () => {
  it("retries transient failures and succeeds", async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      return calls < 2 ? Promise.reject(new Error("429 rate limited")) : Promise.resolve("ok");
    };
    const out = await withResilience(fn, { retries: 2, backoffMs: 1 }, new CircuitBreaker());
    expect(out).toBe("ok");
    expect(calls).toBe(2);
  });

  it("does not retry non-transient errors", async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      return Promise.reject(new Error("400 invalid request"));
    };
    await expect(withResilience(fn, { retries: 3, backoffMs: 1 }, new CircuitBreaker())).rejects.toThrow("400");
    expect(calls).toBe(1);
  });

  it("opens the circuit after repeated failures and fails fast", async () => {
    const breaker = new CircuitBreaker(3, 60_000);
    for (let i = 0; i < 3; i++) {
      await expect(
        withResilience(fail("503 upstream down"), { retries: 0, backoffMs: 1 }, breaker),
      ).rejects.toThrow("503");
    }
    expect(breaker.isOpen).toBe(true);
    await expect(
      withResilience(() => Promise.resolve("should not run"), {}, breaker),
    ).rejects.toThrow(/circuit open/i);
  });

  it("times out a hung call", async () => {
    const hang = () => new Promise<never>(() => {});
    await expect(
      withResilience(hang, { timeoutMs: 30, retries: 0 }, new CircuitBreaker()),
    ).rejects.toThrow(/timeout/i);
  });
});
