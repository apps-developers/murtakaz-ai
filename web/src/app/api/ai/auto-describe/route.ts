import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/client";
import { describeSystemPrompt } from "@/lib/ai/prompts";
import { isAiEnabled, aiDisabledResponse } from "../_mock-stream";

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) return aiDisabledResponse();

  const { title } = (await req.json()) as { title?: string };

  if (!title?.trim()) {
    return NextResponse.json({
      description: "",
      descriptionAr: "",
    });
  }

  try {
    const { object } = await generateObject({
      model: getModel(),
      system: describeSystemPrompt,
      prompt: `KPI Title: "${title}"`,
      schema: z.object({
        description: z.string().describe("Professional English description (1-2 sentences)"),
        descriptionAr: z.string().describe("Professional Arabic description in MSA (1-2 sentences)"),
      }),
    });

    return NextResponse.json({
      description: object.description,
      descriptionAr: object.descriptionAr,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
