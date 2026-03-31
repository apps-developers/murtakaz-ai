import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { getModel } from "@/lib/ai/client";
import { suggestNoteSystemPrompt } from "@/lib/ai/prompts";
import { isAiFeatureEnabled, aiDisabledResponse } from "../_mock-stream";

export async function POST(req: NextRequest) {
  if (!(await isAiFeatureEnabled())) return aiDisabledResponse();

  const { entityTitle, enteredValue, historicalAvg, unit, locale } = (await req.json()) as {
    entityTitle?: string;
    enteredValue?: number;
    historicalAvg?: number;
    unit?: string;
    locale?: string;
  };

  const isArabic = locale === "ar";

  const deviation =
    enteredValue != null && historicalAvg != null
      ? Math.abs(enteredValue - historicalAvg)
      : null;

  const userPrompt = isArabic
    ? `المؤشر: ${entityTitle ?? "غير محدد"}\nالقيمة المُدخلة: ${enteredValue ?? "—"}${unit ?? ""}\nالمتوسط التاريخي: ${historicalAvg ?? "—"}${unit ?? ""}${deviation != null ? `\nالانحراف: ${deviation}${unit ?? ""}` : ""}\n\nاكتب ملاحظة تفسيرية موجزة.`
    : `Entity: ${entityTitle ?? "Unknown"}\nEntered value: ${enteredValue ?? "—"}${unit ?? ""}\nHistorical average: ${historicalAvg ?? "—"}${unit ?? ""}${deviation != null ? `\nDeviation: ${deviation}${unit ?? ""}` : ""}\n\nWrite a brief explanatory note.`;

  try {
    const { text } = await generateText({
      model: getModel(),
      system: suggestNoteSystemPrompt(locale ?? "en"),
      prompt: userPrompt,
      maxOutputTokens: 200,
    });

    return NextResponse.json({ note: text.trim() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
