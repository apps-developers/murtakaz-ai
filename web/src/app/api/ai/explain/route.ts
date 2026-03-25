import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/client";
import { getEntityContextForAi } from "@/lib/ai/context";
import { isAiEnabled, aiDisabledResponse } from "../_mock-stream";

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) return aiDisabledResponse();

  const { entityId, locale } = (await req.json()) as {
    entityId: string;
    locale?: string;
  };

  if (!entityId) {
    return new Response(JSON.stringify({ error: "entityId is required." }), { status: 400 });
  }

  let context = "";
  try {
    context = (await getEntityContextForAi(entityId)) ?? "No data found for this entity.";
  } catch {
    context = "Could not load entity data.";
  }

  const isArabic = locale === "ar";

  const system = isArabic
    ? `أنت مساعد ذكي في منصة إدارة مؤشرات الأداء "رافد". اشرح المؤشر التالي بشكل موجز ومهني. اشرح ما يقيسه هذا المؤشر، وأهميته، وموقعه في الهيكل التنظيمي. استخدم العربية الفصحى.`
    : `You are a performance expert in the "Rafed" performance management platform. Explain the following indicator concisely and professionally. Cover what it measures, why it matters, its position in the organizational structure, and any notable trends from recent values. Keep it under 200 words.`;

  try {
    const result = streamText({
      model: getModel(),
      system,
      prompt: context,
      maxOutputTokens: 400,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
}
