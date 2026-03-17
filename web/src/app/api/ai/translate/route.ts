import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/client";
import { translateSystemPrompt } from "@/lib/ai/prompts";
import { isAiEnabled, aiDisabledResponse } from "../_mock-stream";

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) return aiDisabledResponse();

  const { fields, direction } = (await req.json()) as {
    fields: { title?: string; description?: string; unit?: string };
    direction: "en_to_ar" | "ar_to_en";
  };

  if (!fields?.title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const isToAr = direction === "en_to_ar";

  const schema = isToAr
    ? z.object({
        titleAr: z.string().describe("Arabic translation of the title"),
        descriptionAr: z.string().optional().describe("Arabic translation of the description"),
        unitAr: z.string().optional().describe("Arabic translation of the unit"),
      })
    : z.object({
        title: z.string().describe("English translation of the title"),
        description: z.string().optional().describe("English translation of the description"),
        unit: z.string().optional().describe("English translation of the unit"),
      });

  try {
    const { object } = await generateObject({
      model: getModel(),
      system: translateSystemPrompt(direction),
      prompt: JSON.stringify(fields),
      schema,
    });

    return NextResponse.json(object);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
