import { z } from "zod";

/**
 * Server-side environment, split by concern so FHIR reads don't require the
 * Qwen key (only needed for drafting / the agent / OCR).
 * Access ONLY from server code. QWEN_API_KEY must never reach the client.
 */

const fhirSchema = z.object({
  FHIR_BASE_URL: z.string().url().default("https://hapi.fhir.org/baseR4"),
  DEMO_PATIENT_ID: z.string().optional(),
});

const qwenSchema = z.object({
  QWEN_API_KEY: z.string().min(1, "QWEN_API_KEY is required"),
  // Alibaba Cloud Model Studio (DashScope) OpenAI-compatible endpoint.
  // International: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
  // Beijing:       https://dashscope.aliyuncs.com/compatible-mode/v1
  QWEN_BASE_URL: z
    .string()
    .url()
    .default("https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
  QWEN_MODEL: z.string().default("qwen-max"),
  QWEN_AGENT_MODEL: z.string().default("qwen-plus"),
  QWEN_VL_MODEL: z.string().default("qwen-vl-max"),
});

let fhirCache: z.infer<typeof fhirSchema> | null = null;
let qwenCache: z.infer<typeof qwenSchema> | null = null;

function fail(prefix: string, error: z.ZodError): never {
  const issues = error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  throw new Error(`${prefix} Check .env.local — ${issues}`);
}

/** FHIR config — never requires the Qwen key. */
export function getFhirEnv() {
  if (fhirCache) return fhirCache;
  const parsed = fhirSchema.safeParse(process.env);
  if (!parsed.success) fail("Invalid FHIR environment.", parsed.error);
  fhirCache = parsed.data;
  return fhirCache;
}

/** Alibaba Cloud Model Studio (Qwen) config — drafting, agent, and OCR paths. */
export function getQwenEnv() {
  if (qwenCache) return qwenCache;
  const parsed = qwenSchema.safeParse(process.env);
  if (!parsed.success) fail("Invalid Qwen environment.", parsed.error);
  qwenCache = parsed.data;
  return qwenCache;
}

/** Public, client-safe flags (NEXT_PUBLIC_*). */
export const publicEnv = {
  useMockFhir: process.env.NEXT_PUBLIC_USE_MOCK_FHIR === "true",
};
