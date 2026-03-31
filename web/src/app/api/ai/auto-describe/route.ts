import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/client";
import { describeSystemPrompt } from "@/lib/ai/prompts";
import { isAiFeatureEnabled, aiDisabledResponse } from "../_mock-stream";

export async function POST(req: NextRequest) {
  if (!(await isAiFeatureEnabled())) return aiDisabledResponse();

  const { title, userPrompt, previousDescription } = (await req.json()) as {
    title?: string;
    userPrompt?: string;
    previousDescription?: string;
  };

  if (!title?.trim() && !userPrompt?.trim()) {
    return NextResponse.json({
      description: "",
      descriptionAr: "",
    });
  }

  const iterativeContext = previousDescription
    ? `\n\nThe current description is: "${previousDescription}"\nThe user wants to refine it with this instruction: "${userPrompt}"`
    : "";

  const prompt = userPrompt?.trim()
    ? `Entity Title: "${title ?? ""}"\nUser instruction: ${userPrompt}${iterativeContext}`
    : `Entity Title: "${title}"`;

  try {
    const { object } = await generateObject({
      model: getModel(),
      system: describeSystemPrompt + (iterativeContext ? "\nRefine the description based on the user's instruction while keeping it professional." : ""),
      prompt,
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
