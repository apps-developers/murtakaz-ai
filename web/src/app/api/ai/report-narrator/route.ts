import { NextRequest } from "next/server";
import { aiDisabledResponse, isAiFeatureEnabled, streamResponse } from "../_mock-stream";

type ReportSummary = {
  entityTypeName?: string;
  period?: string;
  totalEntities: number;
  green: number;
  amber: number;
  red: number;
  noData: number;
};

function buildNarrative(summary: ReportSummary, lang: "en" | "ar"): string {
  const { totalEntities, green, amber, red, noData, entityTypeName, period } = summary;
  const greenPct = totalEntities > 0 ? Math.round((green / totalEntities) * 100) : 0;
  const redPct = totalEntities > 0 ? Math.round((red / totalEntities) * 100) : 0;

  const overallHealth =
    greenPct >= 70 ? (lang === "ar" ? "🟢 جيد" : "🟢 Good") :
    greenPct >= 50 ? (lang === "ar" ? "🟡 يحتاج اهتماماً" : "🟡 Needs Attention") :
    (lang === "ar" ? "🔴 حرج" : "🔴 Critical");

  const scope = entityTypeName ?? (lang === "ar" ? "الجهة" : "Organization");
  const periodLabel = period ?? (lang === "ar" ? "الفترة الحالية" : "current period");

  if (lang === "ar") {
    let text = `## تقرير الأداء — ${scope} | ${periodLabel}\n\n`;
    text += `**الصحة الإجمالية: ${overallHealth}** (${greenPct}% من المؤشرات في المنطقة الخضراء)\n\n`;
    text += `### الملخص التنفيذي\n`;
    text += `من أصل ${totalEntities} مؤشر في هذا التقرير، حقق ${green} (${greenPct}%) أهدافه أو تجاوزها، `;
    text += `بينما ${amber} (${Math.round((amber / totalEntities) * 100)}%) في المنطقة الصفراء وتحتاج إلى متابعة، `;
    text += `و${red} (${redPct}%) في المنطقة الحمراء وتستوجب تدخلاً فورياً.`;

    if (noData > 0) {
      text += ` تجدر الإشارة إلى أن ${noData} مؤشر لا تزال دون بيانات للفترة الحالية مما يشكل مخاطرة على اكتمال البيانات.`;
    }

    text += `\n\n### أبرز النقاط\n`;
    if (green > 0) text += `✅ **الأداء الجيد:** ${green} مؤشر يحقق أو يتجاوز هدفه — يعكس أداءً قوياً في مجالاتها.\n`;
    if (amber > 0) text += `🟡 **يحتاج متابعة:** ${amber} مؤشر في المنطقة الصفراء — راجع خطط العمل للتحسين.\n`;
    if (red > 0) text += `🔴 **يستوجب تدخلاً:** ${red} مؤشر في المنطقة الحمراء — حدد الأسباب الجذرية وخصص موارد إضافية فوراً.\n`;
    if (noData > 0) text += `⚪ **ناقصة البيانات:** ${noData} مؤشر بلا قيم — أبلغ أصحابها بضرورة الإدخال الفوري.\n`;

    text += `\n### الإجراءات الموصى بها\n`;
    if (red > 0) text += `1. أجرِ تحليلاً للسبب الجذري للمؤشرات الحمراء — تحقق من الارتباطات بالمخاطر والمشاريع المتأثرة\n`;
    if (noData > 0) text += `2. تواصل فورياً مع أصحاب المؤشرات ذات البيانات الناقصة لضمان الامتثال\n`;
    if (amber > 0) text += `3. راجع خطط العمل للمؤشرات الصفراء لتجنب تحولها إلى الحمراء قبل نهاية الفترة\n`;

    return text;
  } else {
    let text = `## Performance Report — ${scope} | ${periodLabel}\n\n`;
    text += `**Overall Health: ${overallHealth}** (${greenPct}% of entities in Green zone)\n\n`;
    text += `### Executive Summary\n`;
    text += `Of the ${totalEntities} entities in this report, ${green} (${greenPct}%) are meeting or exceeding their targets, `;
    text += `${amber} (${Math.round((amber / totalEntities) * 100)}%) are in the Amber zone requiring attention, `;
    text += `and ${red} (${redPct}%) are in the Red zone requiring immediate intervention.`;

    if (noData > 0) {
      text += ` Notably, ${noData} entity${noData > 1 ? "ies" : ""} ha${noData > 1 ? "ve" : "s"} no data entered for the current period, representing a data freshness risk.`;
    }

    text += `\n\n### Highlights\n`;
    if (green > 0) text += `✅ **Performing Well:** ${green} entity${green > 1 ? "ies" : ""} on track or above target — strong performance in their respective areas.\n`;
    if (amber > 0) text += `🟡 **Needs Monitoring:** ${amber} entity${amber > 1 ? "ies" : ""} in Amber — review improvement action plans.\n`;
    if (red > 0) text += `🔴 **Requires Action:** ${red} entity${red > 1 ? "ies" : ""} in Red — identify root causes and allocate additional resources immediately.\n`;
    if (noData > 0) text += `⚪ **Missing Data:** ${noData} entity${noData > 1 ? "ies" : ""} without values — notify owners to submit data urgently.\n`;

    text += `\n### Recommended Actions\n`;
    if (red > 0) text += `1. Conduct root cause analysis for Red entities — investigate links to open risks and delayed projects\n`;
    if (noData > 0) text += `2. Contact owners of entities with missing data immediately to ensure compliance\n`;
    if (amber > 0) text += `3. Review action plans for Amber entities to prevent further decline before period close\n`;

    return text;
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAiFeatureEnabled())) return aiDisabledResponse();

  const { summary, lang = "en" } = (await req.json()) as { summary: ReportSummary; lang?: "en" | "ar" };
  const text = buildNarrative(summary, lang);

  return streamResponse(text);
}
