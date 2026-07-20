/**
 * Per-request cost accounting for Qwen on Alibaba Cloud Model Studio.
 * Prices are USD per 1M tokens (international/Singapore list prices as of
 * mid-2026 — estimates for observability, not billing). Unknown models fall
 * back to the qwen-plus rate.
 */

interface Price {
  inPerM: number;
  outPerM: number;
}

const PRICES: Record<string, Price> = {
  "qwen-max": { inPerM: 1.6, outPerM: 6.4 },
  "qwen-plus": { inPerM: 0.4, outPerM: 1.2 },
  "qwen-turbo": { inPerM: 0.05, outPerM: 0.2 },
  "qwen-vl-max": { inPerM: 0.8, outPerM: 3.2 },
  "qwen-vl-plus": { inPerM: 0.21, outPerM: 0.63 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const key = Object.keys(PRICES).find((k) => model.startsWith(k));
  const p = key ? PRICES[key] : PRICES["qwen-plus"];
  return (inputTokens * p.inPerM + outputTokens * p.outPerM) / 1_000_000;
}

/** Render a small-dollar amount legibly, e.g. "$0.0031". */
export function formatUsd(x: number): string {
  if (x >= 0.01) return `$${x.toFixed(3)}`;
  return `$${x.toFixed(4)}`;
}
