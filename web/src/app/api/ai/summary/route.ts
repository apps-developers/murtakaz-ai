import { NextRequest } from "next/server";
import { streamText } from "ai";
import { requireOrgMember } from "@/lib/server-action-auth";
import { getEntityContextForAiReport } from "@/actions/insights";
import { getSmartModel } from "@/lib/ai/client";
import { summarySystemPrompt } from "@/lib/ai/prompts";
import { isAiFeatureEnabled, aiDisabledResponse } from "../_mock-stream";

export async function POST(req: NextRequest) {
  if (!(await isAiFeatureEnabled())) return aiDisabledResponse();

  const { reportType, lang, period } = (await req.json()) as {
    reportType: "full" | "digest";
    lang: "en" | "ar";
    period?: string;
  };

  // Fetch real entity context from the database
  let entityContext = "";
  try {
    const session = await requireOrgMember();
    const entities = await getEntityContextForAiReport(session.user.orgId, 25);
    if (entities.length > 0) {
      const lines = entities.map(
        (e) =>
          `- ${e.title}: ${e.achievement}% achievement (target: ${e.target ?? "N/A"}${e.unit ? ` ${e.unit}` : ""}, status: ${e.status}, direction: ${e.direction ?? "INCREASE_IS_GOOD"})`,
      );
      entityContext =
        lang === "ar"
          ? `\n\nبيانات المؤشرات الحالية:\n${lines.join("\n")}`
          : `\n\nCurrent performance data:\n${lines.join("\n")}`;
    }
  } catch {
    // continue without context if auth fails
  }

  const periodLabel =
    period === "q1" ? "Q1" : period === "q2" ? "Q2" : period === "q3" ? "Q3" : period === "q4" ? "Q4" : "Year-to-date";

  const userPrompt =
    reportType === "full"
      ? lang === "ar"
        ? `اكتب تقرير مجلس إدارة كامل عن الفترة: ${periodLabel}. غطِّ الأداء العام، المؤشرات الرئيسية، التحديات، والتوصيات.${entityContext}`
        : `Write a full board report for the period: ${periodLabel}. Cover overall performance, key metrics, challenges, and recommendations.${entityContext}`
      : lang === "ar"
        ? `اكتب ملخصاً مختصراً عن الفترة: ${periodLabel}. أبرز المؤشرات والإجراءات المطلوبة.${entityContext}`
        : `Write a concise digest for the period: ${periodLabel}. Highlight key metric performance and required actions.${entityContext}`;

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
