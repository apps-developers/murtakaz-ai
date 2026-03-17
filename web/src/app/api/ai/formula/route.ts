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

  const { description, variables, previousFormula } = (await req.json()) as {
    description: string;
    variables?: Variable[];
    previousFormula?: string;
  };

  if (!description?.trim()) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }

  const variablesContext =
    variables && variables.length > 0
      ? `Available variables (access as vars.CODE):\n${variables.map((v) => `- vars.${v.code} (${v.displayName})`).join("\n")}`
      : "No variables defined yet. You may suggest new variables the user should create.";

  const iterativeContext = previousFormula
    ? `\n\nThe user previously had this formula: ${previousFormula}\nThey want to update it based on the new description below.`
    : "";

  try {
    const { object } = await generateObject({
      model: getModel(),
      system: formulaSystemPrompt(variablesContext) + iterativeContext,
      prompt: description,
      schema: z.object({
        formula: z.string().describe("JavaScript expression string"),
        explanation: z.string().describe("Plain language explanation of the formula"),
        example: z.string().optional().describe("Example calculation with sample values"),
        suggestedVariables: z.array(z.object({
          code: z.string().describe("Variable code (UPPER_SNAKE_CASE)"),
          displayName: z.string().describe("Human-readable name for the variable"),
          dataType: z.enum(["NUMBER", "PERCENTAGE"]).describe("Variable data type"),
        })).optional().describe("New variables needed for this formula that don't already exist"),
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
      suggestedVariables: object.suggestedVariables ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
