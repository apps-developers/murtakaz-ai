import { NextRequest } from "next/server";
import { streamText } from "ai";
import { requireOrgMember } from "@/lib/server-action-auth";
import { getKpiContextForAiReport } from "@/actions/insights";
import { getSmartModel } from "@/lib/ai/client";
import { summarySystemPrompt } from "@/lib/ai/prompts";
import { isAiEnabled, aiDisabledResponse } from "../_mock-stream";

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) return aiDisabledResponse();

  const { reportType, lang, period } = (await req.json()) as {
    reportType: "full" | "digest";
    lang: "en" | "ar";
    period?: string;
  };

  // Fetch real KPI context from the database
  let kpiContext = "";
  try {
    const session = await requireOrgMember();
    const kpis = await getKpiContextForAiReport(session.user.orgId, 25);
    if (kpis.length > 0) {
      const lines = kpis.map(
        (k) =>
          `- ${k.title}: ${k.achievement}% achievement (target: ${k.target ?? "N/A"}${k.unit ? ` ${k.unit}` : ""}, status: ${k.status}, direction: ${k.direction ?? "INCREASE_IS_GOOD"})`,
      );
      kpiContext =
        lang === "ar"
          ? `\n\nبيانات المؤشرات الحالية:\n${lines.join("\n")}`
          : `\n\nCurrent KPI data:\n${lines.join("\n")}`;
    }
  } catch {
    // continue without context if auth fails
  }

  const periodLabel =
    period === "q1" ? "Q1" : period === "q2" ? "Q2" : period === "q3" ? "Q3" : period === "q4" ? "Q4" : "Year-to-date";

  const userPrompt =
    reportType === "full"
      ? lang === "ar"
        ? `اكتب تقرير مجلس إدارة كامل عن الفترة: ${periodLabel}. غطِّ الأداء العام، المؤشرات الرئيسية، التحديات، والتوصيات.${kpiContext}`
        : `Write a full board report for the period: ${periodLabel}. Cover overall performance, key KPIs, challenges, and recommendations.${kpiContext}`
      : lang === "ar"
        ? `اكتب ملخصاً مختصراً عن الفترة: ${periodLabel}. أبرز المؤشرات والإجراءات المطلوبة.${kpiContext}`
        : `Write a concise digest for the period: ${periodLabel}. Highlight key KPI performance and required actions.${kpiContext}`;

  try {
    const result = streamText({
      model: getSmartModel(),
      system: summarySystemPrompt(lang),
      prompt: userPrompt,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
}
