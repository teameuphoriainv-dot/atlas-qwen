/**
 * Resilience layer for model calls: timeout, bounded retry with exponential
 * backoff, and a circuit breaker. Production posture: a flaky upstream should
 * degrade Atlas gracefully (clear errors, fast failure) instead of hanging
 * requests or hammering a struggling endpoint.
 */

export interface ResilienceOpts {
  timeoutMs?: number; // per attempt
  retries?: number; // additional attempts after the first
  backoffMs?: number; // base backoff, doubles per retry
  retryOn?: (e: unknown) => boolean;
}

export interface BreakerState {
  consecutiveFailures: number;
  openedAt: number | null;
}

export class CircuitBreaker {
  private state: BreakerState = { consecutiveFailures: 0, openedAt: null };

  constructor(
    private readonly threshold = 4, // failures before opening
    private readonly cooldownMs = 30_000, // how long the circuit stays open
  ) {}

  /** Throws immediately if the circuit is open (fail fast, no upstream call). */
  guard(): void {
    if (this.state.openedAt === null) return;
    const elapsed = Date.now() - this.state.openedAt;
    if (elapsed < this.cooldownMs) {
      const waitS = Math.ceil((this.cooldownMs - elapsed) / 1000);
      throw new Error(`Model circuit open (retry in ~${waitS}s) — upstream repeatedly failing`);
    }
    // Half-open: allow the next call through as a trial.
    this.state.openedAt = null;
    this.state.consecutiveFailures = this.threshold - 1;
  }

  onSuccess(): void {
    this.state = { consecutiveFailures: 0, openedAt: null };
  }

  onFailure(): void {
    this.state.consecutiveFailures++;
    if (this.state.consecutiveFailures >= this.threshold) {
      this.state.openedAt = Date.now();
    }
  }

  get isOpen(): boolean {
    return this.state.openedAt !== null && Date.now() - this.state.openedAt < this.cooldownMs;
  }
}

function defaultRetryOn(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  // Retry timeouts, rate limits, and 5xx-ish upstream failures; never 4xx logic errors.
  return /timeout|timed out|429|rate|5\d\d|ECONNRESET|ENOTFOUND|fetch failed/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Shared breaker for all Qwen chat calls in this server instance. */
export const qwenBreaker = new CircuitBreaker();

export async function withResilience<T>(
  fn: () => Promise<T>,
  opts: ResilienceOpts = {},
  breaker: CircuitBreaker = qwenBreaker,
): Promise<T> {
  const { timeoutMs = 45_000, retries = 2, backoffMs = 600, retryOn = defaultRetryOn } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    breaker.guard();
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error(`Model call timeout after ${timeoutMs}ms`)), timeoutMs),
        ),
      ]);
      breaker.onSuccess();
      return result;
    } catch (e) {
      lastErr = e;
      breaker.onFailure();
      if (attempt < retries && retryOn(e) && !breaker.isOpen) {
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}
