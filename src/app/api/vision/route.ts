import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { qwenClient, qwenModels } from "@/lib/llm/qwen";
import { withResilience } from "@/lib/llm/resilience";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  // base64 image (raw or a data URL — normalized to a data URL below).
  image: z.string().min(1),
  // "text" = plain OCR transcription; "meds" = structured medication-list
  // extraction for reconciliation (returns { meds: [...] } as well as text).
  mode: z.enum(["text", "meds"]).default("text"),
});

const MEDS_PROMPT =
  "This is a photo of a patient's medication list (pill bottles, a handwritten list, or a printout). " +
  "Extract every medication as JSON. Output ONLY a JSON object of the shape " +
  '{"medications":[{"name":"...","dose":"...","frequency":"..."}]} with no commentary and no markdown fences. ' +
  'Use empty strings for unreadable dose/frequency. If no medications are visible, output {"medications":[]}.';

interface ExtractedMed {
  name?: string;
  dose?: string;
  frequency?: string;
}

function parseMeds(raw: string): ExtractedMed[] {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : raw) as { medications?: ExtractedMed[] };
    return (parsed.medications ?? []).filter((x) => x.name).slice(0, 30);
  } catch {
    return [];
  }
}

/**
 * OCR via Qwen-VL (multimodal) on Alibaba Cloud Model Studio — replaces the
 * old Azure Document Intelligence integration so the entire model layer runs
 * on Alibaba Cloud. Single call, no polling.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const raw = parsed.data.image;
  const dataUrl = raw.startsWith("data:")
    ? raw
    : `data:image/png;base64,${raw}`;

  try {
    const client = qwenClient();
    const mode = parsed.data.mode;
    const prompt =
      mode === "meds"
        ? MEDS_PROMPT
        : "Transcribe ALL text visible in this image exactly as written, preserving line breaks and layout order. " +
          "Output ONLY the transcribed text — no commentary, no markdown fences.";
    const resp = await withResilience(
      () =>
        client.chat.completions.create({
          model: qwenModels().vision,
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      { timeoutMs: 45_000, retries: 1 },
    );
    const text = (resp.choices[0]?.message?.content ?? "").trim();
    if (mode === "meds") {
      return NextResponse.json({ text, meds: parseMeds(text) });
    }
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Qwen-VL OCR failed",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }
}
