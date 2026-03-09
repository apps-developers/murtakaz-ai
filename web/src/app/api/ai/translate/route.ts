import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "true") {
    return NextResponse.json({ error: "AI features are disabled." }, { status: 403 });
  }

  const { fields, direction } = (await req.json()) as {
    fields: { title?: string; description?: string; unit?: string };
    direction: "en_to_ar" | "ar_to_en";
  };

  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL ?? "https://api.openai.com/v1/chat/completions";
  const model = process.env.AI_MODEL ?? "gpt-4o";

  if (!apiKey) {
    return NextResponse.json({
      titleAr: fields.title ? `[ترجمة] ${fields.title}` : undefined,
      descriptionAr: fields.description ? `[ترجمة] ${fields.description}` : undefined,
      unitAr: fields.unit ? `[ترجمة] ${fields.unit}` : undefined,
    });
  }

  const isToAr = direction === "en_to_ar";

  const systemPrompt = isToAr
    ? `You are a professional translator specializing in strategic management and KPI terminology.
Translate the provided fields from English to Arabic.
Return a JSON object with fields: titleAr, descriptionAr (optional), unitAr (optional).
Only include fields that were provided. Preserve technical terms appropriately.
IMPORTANT: Return ONLY valid JSON, no markdown.`
    : `You are a professional translator specializing in strategic management and KPI terminology.
Translate the provided fields from Arabic to English.
Return a JSON object with fields: title, description (optional), unit (optional).
Only include fields that were provided. Preserve technical terms appropriately.
IMPORTANT: Return ONLY valid JSON, no markdown.`;

  const userContent = JSON.stringify(fields);

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
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: res.status });
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as Record<string, string>;

    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
