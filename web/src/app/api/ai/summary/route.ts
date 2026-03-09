import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember } from "@/lib/server-action-auth";
import { getKpiContextForAiReport } from "@/actions/insights";

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "true") {
    return NextResponse.json({ error: "AI features are disabled." }, { status: 403 });
  }

  const { reportType, lang, period } = (await req.json()) as {
    reportType: "full" | "digest";
    lang: "en" | "ar";
    period?: string;
  };

  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL ?? "https://api.openai.com/v1/chat/completions";
  const model = process.env.AI_MODEL ?? "gpt-4o";

  if (!apiKey) {
    const fallback =
      lang === "ar"
        ? "المساعد الذكي غير مُهيّأ. يرجى ضبط متغير البيئة AI_API_KEY."
        : "AI assistant is not configured. Please set the AI_API_KEY environment variable.";
    return new Response(fallback, { status: 200 });
  }

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
    // continue without context if auth fails (e.g. called outside session)
  }

  const periodLabel =
    period === "q1" ? "Q1" : period === "q2" ? "Q2" : period === "q3" ? "Q3" : period === "q4" ? "Q4" : "Year-to-date";

  const systemPrompt =
    lang === "ar"
      ? "أنت محلل أداء استراتيجي. اكتب تقريراً احترافياً عن أداء مؤشرات الجهة بناءً على البيانات المعتمدة. أجب باللغة العربية."
      : "You are a strategic performance analyst. Write a professional performance narrative based on approved KPI data. Be structured, concise, and executive-ready.";

  const userPrompt =
    reportType === "full"
      ? lang === "ar"
        ? `اكتب تقرير مجلس إدارة كامل عن الفترة: ${periodLabel}. غطِّ الأداء العام، المؤشرات الرئيسية، التحديات، والتوصيات.${kpiContext}`
        : `Write a full board report for the period: ${periodLabel}. Cover overall performance, key KPIs, challenges, and recommendations.${kpiContext}`
      : lang === "ar"
        ? `اكتب ملخصاً مختصراً عن الفترة: ${periodLabel}. أبرز المؤشرات والإجراءات المطلوبة.${kpiContext}`
        : `Write a concise digest for the period: ${periodLabel}. Highlight key KPI performance and required actions.${kpiContext}`;

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!upstream.ok) {
      return new Response(await upstream.text(), { status: upstream.status });
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
