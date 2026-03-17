import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/client";
import { formulaSystemPrompt } from "@/lib/ai/prompts";
import { validateFormula } from "@/lib/ai/guardrails";
import { isAiEnabled, aiDisabledResponse } from "../_mock-stream";

type Variable = { code: string; displayName: string };

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) return aiDisabledResponse();

  const { description, variables } = (await req.json()) as {
    description: string;
    variables?: Variable[];
  };

  if (!description?.trim()) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }

  const variablesContext =
    variables && variables.length > 0
      ? `Available variables (access as vars.CODE):\n${variables.map((v) => `- vars.${v.code} (${v.displayName})`).join("\n")}`
      : "No variables defined yet. Use generic vars.ACTUAL and vars.TARGET as placeholders.";

  try {
    const { object } = await generateObject({
      model: getModel(),
      system: formulaSystemPrompt(variablesContext),
      prompt: description,
      schema: z.object({
        formula: z.string().describe("JavaScript expression string"),
        explanation: z.string().describe("Plain language explanation of the formula"),
        example: z.string().optional().describe("Example calculation with sample values"),
      }),
    });

    // Safety check
    const check = validateFormula(object.formula);
    if (!check.safe) {
      return NextResponse.json(
        { error: `Unsafe formula rejected: ${check.reason}` },
        { status: 422 },
      );
    }

    return NextResponse.json({
      formula: object.formula,
      explanation: object.explanation,
      example: object.example,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
