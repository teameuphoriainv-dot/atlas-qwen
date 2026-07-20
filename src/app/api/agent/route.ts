import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runAgent, type AgentEvent } from "@/lib/agent/runAgent";
import { makeBuiltinFhir, makeRemoteFhir } from "@/lib/fhir/remote";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  patientId: z.string().min(1),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
  fhir: z.object({ baseUrl: z.string().url(), token: z.string().min(1) }).optional(),
  // stream: true → Server-Sent Events: live `step` events while the agent works,
  // then one `done` (or `error`) event. Default JSON response is kept for the
  // Chrome extension and API consumers.
  stream: z.boolean().optional(),
});

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { message, patientId, history, fhir, stream } = parsed.data;

  const client = fhir ? makeRemoteFhir(fhir.baseUrl, fhir.token) : makeBuiltinFhir();
  const opts = {
    message,
    history,
    patientRef: `Patient/${patientId}`,
    fhir: client,
  };

  if (!stream) {
    try {
      const turn = await runAgent(opts);
      return NextResponse.json(turn);
    } catch (e) {
      return NextResponse.json(
        { error: "Agent failed", details: e instanceof Error ? e.message : String(e) },
        { status: 502 },
      );
    }
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sse(event, data)));
        } catch {
          /* client went away — the loop finishes server-side regardless */
        }
      };
      try {
        const turn = await runAgent({
          ...opts,
          onEvent: (e: AgentEvent) => send("step", e),
        });
        send("done", turn);
      } catch (e) {
        send("error", { error: "Agent failed", details: e instanceof Error ? e.message : String(e) });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
