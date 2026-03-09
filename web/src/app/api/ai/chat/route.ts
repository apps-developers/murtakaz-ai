import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "true") {
    return NextResponse.json({ error: "AI features are disabled." }, { status: 403 });
  }

  const { message, locale } = (await req.json()) as { message: string; locale?: string };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL ?? "https://api.openai.com/v1/chat/completions";
  const model = process.env.AI_MODEL ?? "gpt-4o";

  if (!apiKey) {
    const fallback =
      locale === "ar"
        ? "المساعد الذكي غير مُهيّأ. يرجى ضبط متغير البيئة AI_API_KEY."
        : "AI assistant is not configured. Please set the AI_API_KEY environment variable.";
    return new Response(fallback, { status: 200 });
  }

  const systemPrompt =
    locale === "ar"
      ? "أنت مساعد ذكاء اصطناعي متخصص في أداء المؤشرات الاستراتيجية لمنظمة. أجب بناءً على البيانات المعتمدة فقط. لا تعدّل أي بيانات. أجب باللغة العربية."
      : "You are an AI assistant specialized in strategic KPI performance for an organization. Answer based on approved data only. You cannot modify any data. Be concise and data-driven.";

  try {
    const upstream = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return new Response(err, { status: upstream.status });
    }

    const reader = upstream.body!.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const raw = decoder.decode(value);
          for (const line of raw.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) controller.enqueue(new TextEncoder().encode(token));
            } catch {
              // skip malformed chunks
            }
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
}
