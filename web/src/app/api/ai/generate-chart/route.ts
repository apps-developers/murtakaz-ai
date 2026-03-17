import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/client";
import { getOrgKpiSummaryForAi } from "@/lib/ai/context";
import { requireOrgMember } from "@/lib/server-action-auth";
import { isAiEnabled, aiDisabledResponse } from "../_mock-stream";

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) return aiDisabledResponse();

  const { prompt } = (await req.json()) as { prompt: string };

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  let kpiContext = "";
  try {
    const session = await requireOrgMember();
    kpiContext = await getOrgKpiSummaryForAi(session.user.orgId, 20);
  } catch {
    // continue without context
  }

  const system = `You are a chart generation assistant for a KPI management platform.
Given a user request and KPI data, generate an ECharts chart configuration.

Rules:
- Return a valid ECharts option object as JSON
- Use clean, professional colors: #60a5fa (blue), #34d399 (green), #a78bfa (purple), #fb7185 (pink), #fbbf24 (yellow)
- The chart should be self-contained with sample data derived from the KPI context
- Support chart types: bar, line, pie, scatter, radar
- Include proper labels, tooltips, and legends
- Keep it simple and readable
- Title should be short and descriptive

${kpiContext}`;

  try {
    const { object } = await generateObject({
      model: getModel(),
      system,
      prompt,
      schema: z.object({
        title: z.string().describe("Short chart title"),
        chartType: z.enum(["bar", "line", "pie", "scatter", "radar"]).describe("Chart type"),
        option: z.record(z.string(), z.unknown()).describe("Complete ECharts option object (JSON)"),
      }),
    });

    return NextResponse.json({
      title: object.title,
      chartType: object.chartType,
      option: object.option,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
