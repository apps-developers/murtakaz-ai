import { NextRequest, NextResponse } from "next/server";
import { aiDisabledResponse, isAiFeatureEnabled } from "../_mock-stream";

export async function POST(req: NextRequest) {
  if (!(await isAiFeatureEnabled())) return aiDisabledResponse();

  const { entityTitle, submittedValue, historicalAvg, unit = "", locale } =
    (await req.json()) as {
      entityTitle?: string;
      submittedValue?: number;
      historicalAvg?: number;
      unit?: string;
      locale?: string;
    };

  const title = entityTitle ?? "this entity";
  const submitted = submittedValue ?? 0;
  const avg = historicalAvg ?? 0;
  const deviation = avg !== 0 ? Math.round(((submitted - avg) / avg) * 100) : 0;
  const isLow = submitted < avg;
  const devAbs = Math.abs(deviation);
  const isArabic = locale === "ar";

  await new Promise<void>((r) => setTimeout(r, 500));

  const comment = isArabic
    ? `القيمة المُقدَّمة لـ"${title}" (${submitted}${unit}) ${isLow ? "أقل" : "أعلى"} بنسبة ${devAbs}% من المتوسط التاريخي البالغ ${avg}${unit}. لم يُقدَّم أي تفسير وافٍ لهذا الانحراف. يُرجى إعادة التحقق من مصدر البيانات وإرفاق وثيقة داعمة، ثم إعادة التقديم مع توضيح تفصيلي للسبب.`
    : `The submitted value for "${title}" (${submitted}${unit}) is ${devAbs}% ${isLow ? "below" : "above"} the 6-month historical average of ${avg}${unit}. No sufficient explanation was provided for this deviation. Please re-verify the source data, attach supporting documentation, and resubmit with a detailed note explaining the cause of the variance.`;

  const commentAr = isArabic
    ? comment
    : `القيمة المُقدَّمة لـ"${title}" (${submitted}${unit}) ${isLow ? "أقل" : "أعلى"} بنسبة ${devAbs}% من المتوسط التاريخي البالغ ${avg}${unit}. لم يُقدَّم أي تفسير وافٍ لهذا الانحراف. يُرجى إعادة التحقق من مصدر البيانات وإرفاق وثيقة داعمة، ثم إعادة التقديم مع توضيح تفصيلي للسبب.`;

  return NextResponse.json({ comment, commentAr });
}
