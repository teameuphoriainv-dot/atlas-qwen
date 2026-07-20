import { qwenClient, qwenModels } from "@/lib/llm/qwen";
import { withResilience } from "@/lib/llm/resilience";
import { buildSystemPrompt, buildUserMessage } from "./prompt";
import { SUBMIT_ORDERS_TOOL } from "./tools";
import type { DraftOrder, ModelContext } from "@/lib/types";

export interface DraftResult {
  drafts: DraftOrder[];
  narration: string;
}

interface SubmitOrdersArgs {
  narration?: string;
  drafts?: DraftOrder[];
}

function parseSubmitOrders(raw: string | undefined | null): SubmitOrdersArgs {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SubmitOrdersArgs;
  } catch {
    // Fallback: pull the first JSON object out of a text reply.
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as SubmitOrdersArgs;
      } catch {
        /* fall through */
      }
    }
    return {};
  }
}

/**
 * Call Qwen (Alibaba Cloud Model Studio) with forced tool-calling to map a
 * natural-language request + coded context into structured draft orders.
 * Server-only. PHI never enters here — only ModelContext.
 */
export async function draftOrders(
  text: string,
  ctx: ModelContext,
): Promise<DraftResult> {
  const client = qwenClient();

  const response = await withResilience(
    () =>
      client.chat.completions.create({
        model: qwenModels().draft,
        max_tokens: 1500,
        tools: [SUBMIT_ORDERS_TOOL],
        tool_choice: { type: "function", function: { name: "submit_orders" } },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserMessage(text, ctx) },
        ],
      }),
    { timeoutMs: 40_000, retries: 1 },
  );

  const msg = response.choices[0]?.message;
  const toolCall = msg?.tool_calls?.find(
    (tc): tc is Extract<typeof tc, { type: "function" }> => tc.type === "function",
  );
  const input = toolCall
    ? parseSubmitOrders(toolCall.function.arguments)
    : parseSubmitOrders(msg?.content);
  if (!toolCall && !input.drafts) {
    throw new Error("Model did not return structured orders");
  }

  return {
    narration: input.narration ?? "",
    drafts: Array.isArray(input.drafts) ? input.drafts : [],
  };
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");
}

/**
 * Streaming variant: streams the narration as it's generated (the "narration"
 * field is first in the tool schema, so it arrives first in the tool-call JSON),
 * then returns the complete structured drafts once the call finishes. Forced
 * tool-use keeps the structured output reliable — only the narration is
 * streamed for perceived speed.
 */
export async function draftOrdersStream(
  text: string,
  ctx: ModelContext,
  onNarration: (partial: string) => void,
): Promise<DraftResult> {
  const client = qwenClient();

  const stream = await client.chat.completions.create({
    model: qwenModels().draft,
    max_tokens: 1500,
    stream: true,
    tools: [SUBMIT_ORDERS_TOOL],
    tool_choice: { type: "function", function: { name: "submit_orders" } },
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserMessage(text, ctx) },
    ],
  });

  let acc = "";
  let contentAcc = "";
  let lastNarration = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;
    const tcDelta = delta.tool_calls?.[0];
    if (tcDelta?.function?.arguments) acc += tcDelta.function.arguments;
    if (delta.content) contentAcc += delta.content;

    // Tolerant extraction of the (possibly unterminated) narration string value.
    const m = acc.match(/"narration"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (m) {
      const narr = unescapeJsonString(m[1]);
      if (narr !== lastNarration) {
        lastNarration = narr;
        onNarration(narr);
      }
    }
  }

  const input = acc ? parseSubmitOrders(acc) : parseSubmitOrders(contentAcc);

  return {
    narration: input.narration ?? lastNarration,
    drafts: Array.isArray(input.drafts) ? input.drafts : [],
  };
}
