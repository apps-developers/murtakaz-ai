import { NextRequest, NextResponse } from "next/server";
import { createMockStream } from "../_mock-stream";

function getMockChatReply(message: string, locale?: string): string {
  const lower = message.toLowerCase();
  const isAr = locale === "ar";

  if (lower.includes("health") || lower.includes("صح") || lower.includes("overall")) {
    return isAr
      ? "الصحة الإجمالية للجهة هذا الربع **72%**، ارتفاعاً من 64% في الربع السابق. يتصدر محور النمو بنسبة 88%، في حين يحتاج محور الأفراد والثقافة إلى اهتمام عاجل (48%)."
      : "The organization's overall health this quarter is **72%**, up from 64% last quarter. The Growth pillar leads at 88%, while People & Culture needs urgent attention at 48%.";
  }
  if (lower.includes("red") || lower.includes("أحمر") || lower.includes("below") || lower.includes("risk")) {
    return isAr
      ? "لدينا حالياً **8 مؤشرات حمراء**. أبرزها: معدل الاحتفاظ بالموظفين (41%، الهدف 90%)، ورضا العملاء (68%، الهدف 85%)، وكفاءة التكلفة (71%، الهدف 80%). يُنصح بمراجعة هذه المؤشرات وتحديد الأسباب الجذرية فوراً."
      : "We currently have **8 RED KPIs**. The most critical are: Employee Retention (41% vs 90% target), Customer Satisfaction (68% vs 85% target), and Cost Efficiency (71% vs 80% target). Recommend root cause review immediately.";
  }
  if (lower.includes("green") || lower.includes("أخضر") || lower.includes("best") || lower.includes("top")) {
    return isAr
      ? "أفضل المؤشرات أداءً هذا الربع: **نمو الإيرادات** (91%)، **معدل إكمال المشاريع** (89%)، **الامتثال التنظيمي** (98%). هذه المؤشرات تتجاوز أهدافها وتعكس أداءً مؤسسياً قوياً."
      : "Top performing KPIs this quarter: **Revenue Growth** (91%), **Project Completion Rate** (89%), **Regulatory Compliance** (98%). These KPIs exceed their targets and reflect strong organizational performance.";
  }
  if (lower.includes("submit") || lower.includes("pending") || lower.includes("overdue") || lower.includes("متأخ") || lower.includes("تقد")) {
    return isAr
      ? "**12 مؤشراً** بلا بيانات مُدخلة للفترة الحالية. المديرون المتأخرون: أحمد الراشد (5 مؤشرات متأخرة)، فاطمة النجدي (3 مؤشرات). يُنصح بإرسال تذكير فوري."
      : "**12 KPIs** have no data entered for the current period. Overdue managers: Ahmed Al-Rashid (5 KPIs), Fatima Al-Najdi (3 KPIs). Recommend sending an immediate reminder.";
  }
  if (lower.includes("trend") || lower.includes("اتجاه") || lower.includes("improving") || lower.includes("declining")) {
    return isAr
      ? "خلال الأرباع الأربعة الماضية، تحسّنت 15 مؤشراً بشكل مستمر، وتراجعت 5 مؤشرات. أبرز الاتجاهات الإيجابية في مؤشرات الكفاءة الرقمية (+18 نقطة). أبرز التراجعات في مؤشرات الأفراد (-11 نقطة في الاحتفاظ)."
      : "Over the past 4 quarters, 15 KPIs are on a consistent improvement trend and 5 are declining. Strongest positive trend in Digital Efficiency KPIs (+18pp). Steepest decline in People metrics (-11pp in retention).";
  }
  if (lower.includes("recommend") || lower.includes("توص") || lower.includes("action") || lower.includes("إجراء")) {
    return isAr
      ? "بناءً على الأداء الحالي، أوصي بـ:\n1. **فوري:** مراجعة خطة الاحتفاظ بالموظفين — الأدنى في 12 شهراً\n2. **هذا الأسبوع:** إغلاق 4 مخاطر حرجة مفتوحة منذ +30 يوماً\n3. **هذا الشهر:** إلزام أصحاب المؤشرات الـ 12 غير المُقدَّمة بإدخال البيانات"
      : "Based on current performance, I recommend:\n1. **Immediate:** Review the employee retention action plan — lowest in 12 months\n2. **This week:** Close 4 critical risks open for 30+ days\n3. **This month:** Enforce data submission for the 12 KPIs missing values";
  }
  return isAr
    ? "بناءً على البيانات المعتمدة، الصحة الإجمالية للجهة **72%** هذا الربع. لديك 8 مؤشرات حمراء و12 مؤشراً بلا بيانات. هل تريد تفاصيل حول محور بعينه أو مؤشر محدد؟"
    : "Based on approved data, your organization's overall health is **72%** this quarter. You have 8 RED KPIs and 12 KPIs missing data. Would you like details on a specific pillar or KPI?";
}

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "true") {
    return NextResponse.json({ error: "AI features are disabled." }, { status: 403 });
  }

  const { message, locale } = (await req.json()) as { message: string; locale?: string };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const apiUrl = "https://api.openai.com/v1/chat/completions";
  const model = process.env.AI_MODEL_SMART ?? "gpt-4o";

  if (!apiKey) {
    const mockReply = getMockChatReply(message, locale);
    return new Response(createMockStream(mockReply), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
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
