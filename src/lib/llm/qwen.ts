import OpenAI from "openai";
import { getQwenEnv } from "@/lib/env";

/**
 * Alibaba Cloud Model Studio (DashScope) client — PROOF OF ALIBABA CLOUD USAGE.
 *
 * Every model call in Atlas (agent loop, order drafting, Qwen-VL OCR) goes through
 * this client against the Alibaba Cloud DashScope OpenAI-compatible endpoint:
 *   https://dashscope-intl.aliyuncs.com/compatible-mode/v1
 * (override with QWEN_BASE_URL for the Beijing region endpoint).
 *
 * Models:
 *   QWEN_MODEL        — order drafting (structured tool-call output), default qwen-max
 *   QWEN_AGENT_MODEL  — interactive agent loop (latency-sensitive),   default qwen-plus
 *   QWEN_VL_MODEL     — document/image OCR via multimodal Qwen-VL,    default qwen-vl-max
 */

let cached: OpenAI | null = null;

export function qwenClient(): OpenAI {
  if (cached) return cached;
  const { QWEN_API_KEY, QWEN_BASE_URL } = getQwenEnv();
  cached = new OpenAI({ apiKey: QWEN_API_KEY, baseURL: QWEN_BASE_URL });
  return cached;
}

export function qwenModels() {
  const { QWEN_MODEL, QWEN_AGENT_MODEL, QWEN_VL_MODEL } = getQwenEnv();
  return { draft: QWEN_MODEL, agent: QWEN_AGENT_MODEL, vision: QWEN_VL_MODEL };
}
