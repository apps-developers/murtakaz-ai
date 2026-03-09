import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "true") {
    return NextResponse.json({ error: "AI features are disabled." }, { status: 403 });
  }

  const { entityTitle, enteredValue, historicalAvg, unit, locale } = (await req.json()) as {
    entityTitle?: string;
    enteredValue?: number;
    historicalAvg?: number;
    unit?: string;
    locale?: string;
  };

  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL ?? "https://api.openai.com/v1/chat/completions";
  const model = process.env.AI_MODEL ?? "gpt-4o";

  if (!apiKey) {
    const fallback =
      locale === "ar"
        ? "القيمة المُدخلة تختلف عن المتوسط التاريخي. يرجى مراجعة البيانات والتحقق من صحتها."
        : "The entered value differs significantly from the historical average. Please review the data and verify its accuracy.";
    return NextResponse.json({ note: fallback });
  }

  const isArabic = locale === "ar";
  const systemPrompt = isArabic
    ? "أنت مساعد لكتابة ملاحظات تفسيرية لمؤشرات الأداء. اكتب ملاحظة قصيرة ومهنية (جملة أو جملتان) تشرح سبب الانحراف في القيمة المُدخلة عن المتوسط التاريخي. استخدم لغة موضوعية ومهنية."
    : "You are an assistant helping KPI managers write explanatory notes. Write a short professional note (1-2 sentences) explaining the deviation of the entered value from the historical average. Be objective and professional.";

  const deviation = enteredValue != null && historicalAvg != null
    ? Math.abs(enteredValue - historicalAvg)
    : null;

  const userPrompt = isArabic
    ? `المؤشر: ${entityTitle ?? "غير محدد"}\nالقيمة المُدخلة: ${enteredValue ?? "—"}${unit ?? ""}\nالمتوسط التاريخي: ${historicalAvg ?? "—"}${unit ?? ""}${deviation != null ? `\nالانحراف: ${deviation}${unit ?? ""}` : ""}\n\nاكتب ملاحظة تفسيرية موجزة.`
    : `KPI: ${entityTitle ?? "Unknown"}\nEntered value: ${enteredValue ?? "—"}${unit ?? ""}\nHistorical average: ${historicalAvg ?? "—"}${unit ?? ""}${deviation != null ? `\nDeviation: ${deviation}${unit ?? ""}` : ""}\n\nWrite a brief explanatory note.`;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: res.status });
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const note = data.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({ note });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
