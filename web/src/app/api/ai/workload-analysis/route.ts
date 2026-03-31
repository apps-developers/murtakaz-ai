import { NextRequest, NextResponse } from "next/server";
import { aiDisabledResponse, isAiFeatureEnabled } from "../_mock-stream";

export async function POST(req: NextRequest) {
  if (!(await isAiFeatureEnabled())) return aiDisabledResponse();

  const { locale } = (await req.json()) as { locale?: string };
  const isArabic = locale === "ar";

  await new Promise<void>((r) => setTimeout(r, 700));

  if (isArabic) {
    return NextResponse.json({
      summary:
        "⚠️ تم رصد اختلال في توزيع عبء العمل. يمتلك أحمد الراشد 18 مؤشراً (متوسط الجهة: 6)؛ 8 منها متأخرة. في المقابل، لدى سارة الأحمدي ومحمد العتيبي سعة غير مستغلة. كما تم رصد 4 مؤشرات بلا مالك معيَّن في محور العمليات.",
      overloaded: [
        { name: "أحمد الراشد", role: "مدير — العمليات", entityCount: 18, overdueCount: 8, ragStatus: "overloaded" },
        { name: "فاطمة النجدي", role: "مدير — تقنية المعلومات", entityCount: 14, overdueCount: 3, ragStatus: "overloaded" },
        { name: "سارة الأحمدي", role: "مدير — الموارد البشرية", entityCount: 2, overdueCount: 0, ragStatus: "underloaded" },
        { name: "محمد العتيبي", role: "مدير — المالية", entityCount: 3, overdueCount: 0, ragStatus: "underloaded" },
        { name: "نورة الزهراني", role: "مدير — خدمة العملاء", entityCount: 6, overdueCount: 1, ragStatus: "balanced" },
      ],
      unassignedCount: 4,
      recommendations: [
        "نقل 5–7 مؤشرات من أحمد الراشد إلى سارة الأحمدي أو محمد العتيبي لتحقيق التوازن",
        "تعيين ملاك فوريين للمؤشرات الأربعة غير المعيَّنة في محور العمليات",
      ],
    });
  }

  return NextResponse.json({
    summary:
      "⚠️ Workload imbalance detected across the team. Ahmed Al-Rashid owns 18 entities (org average: 6) with 8 currently overdue. Sarah Al-Ahmadi and Mohammed Al-Otaibi have significant available capacity. 4 entities in the Operations pillar have no assigned owner.",
    overloaded: [
      { name: "Ahmed Al-Rashid", role: "Manager — Operations", entityCount: 18, overdueCount: 8, ragStatus: "overloaded" },
      { name: "Fatima Al-Najdi", role: "Manager — IT", entityCount: 14, overdueCount: 3, ragStatus: "overloaded" },
      { name: "Sarah Al-Ahmadi", role: "Manager — HR", entityCount: 2, overdueCount: 0, ragStatus: "underloaded" },
      { name: "Mohammed Al-Otaibi", role: "Manager — Finance", entityCount: 3, overdueCount: 0, ragStatus: "underloaded" },
      { name: "Noura Al-Zahrani", role: "Manager — Customer Service", entityCount: 6, overdueCount: 1, ragStatus: "balanced" },
    ],
    unassignedCount: 4,
    recommendations: [
      "Redistribute 5–7 of Ahmed Al-Rashid's entities to Sarah Al-Ahmadi or Mohammed Al-Otaibi to balance workload",
      "Immediately assign owners to the 4 unassigned entities in the Operations pillar",
      "Reduce Fatima Al-Najdi's load from 14 to no more than 10 entities before the next reporting period",
      "Establish a policy cap of 10 entities per manager to ensure data quality and timely submissions",
    ],
  });
}
