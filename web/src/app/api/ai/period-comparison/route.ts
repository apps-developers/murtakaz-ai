import { NextRequest } from "next/server";
import { aiDisabledResponse, isAiEnabled, streamResponse } from "../_mock-stream";

const PERIOD_LABELS: Record<string, { en: string; ar: string }> = {
  ytd: { en: "Year-to-Date", ar: "من بداية العام" },
  q1: { en: "Q1", ar: "الربع الأول" },
  q2: { en: "Q2", ar: "الربع الثاني" },
  q3: { en: "Q3", ar: "الربع الثالث" },
  q4: { en: "Q4", ar: "الربع الرابع" },
  m1: { en: "January", ar: "يناير" }, m2: { en: "February", ar: "فبراير" },
  m3: { en: "March", ar: "مارس" }, m4: { en: "April", ar: "أبريل" },
  m5: { en: "May", ar: "مايو" }, m6: { en: "June", ar: "يونيو" },
  m7: { en: "July", ar: "يوليو" }, m8: { en: "August", ar: "أغسطس" },
  m9: { en: "September", ar: "سبتمبر" }, m10: { en: "October", ar: "أكتوبر" },
  m11: { en: "November", ar: "نوفمبر" }, m12: { en: "December", ar: "ديسمبر" },
};

function buildComparison(pA: string, pB: string, lang: "en" | "ar"): string {
  const labelA = (PERIOD_LABELS[pA] ?? { en: pA, ar: pA })[lang];
  const labelB = (PERIOD_LABELS[pB] ?? { en: pB, ar: pB })[lang];

  if (lang === "ar") {
    return `## مقارنة الأداء: ${labelA} مقابل ${labelB}

### ملاحظات رئيسية
لا توجد ملاحظات.`;
  }

  return `## Performance Comparison: ${labelA} → ${labelB}

### Key Insights
No insights.`;
}

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) return aiDisabledResponse();

  const { periodA = "q1", periodB = "q2", lang = "en" } =
    (await req.json()) as { periodA?: string; periodB?: string; lang?: "en" | "ar" };

  const text = buildComparison(periodA, periodB, lang);
  return streamResponse(text);
}
