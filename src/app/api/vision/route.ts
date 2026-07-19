import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { qwenClient, qwenModels } from "@/lib/llm/qwen";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  // base64 image (raw or a data URL — normalized to a data URL below).
  image: z.string().min(1),
});

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
    const resp = await client.chat.completions.create({
      model: qwenModels().vision,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Transcribe ALL text visible in this image exactly as written, preserving line breaks and layout order. " +
                "Output ONLY the transcribed text — no commentary, no markdown fences.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    });
    const text = (resp.choices[0]?.message?.content ?? "").trim();
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
