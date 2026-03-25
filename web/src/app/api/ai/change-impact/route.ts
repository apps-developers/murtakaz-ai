import { NextRequest, NextResponse } from "next/server";
import { aiDisabledResponse, isAiEnabled } from "../_mock-stream";

type ChangeType = "target" | "formula" | "structure" | "other";

const MOCK_BY_TYPE: Record<ChangeType, {
  summary: { en: string; ar: string };
  impacts: Array<{ label: string; before: string; after: string; direction: "positive" | "negative" | "neutral" }>;
  warnings: { en: string[]; ar: string[] };
  recommendation: { en: string; ar: string };
}> = {
  target: {
    summary: {
      en: "Reducing this target changes the entity's RAG status from RED to AMBER based on current achievement. The Growth pillar weighted health score would improve from 61% to 69%, and overall org health would increase by approximately 3pp.",
      ar: "يُغيّر تخفيض هذا الهدف حالة المؤشر من الحمراء إلى الصفراء بناءً على الإنجاز الحالي. سترتفع نقاط صحة محور النمو الموزونة من 61% إلى 69%، وستزيد صحة الجهة الإجمالية بنحو 3 نقاط مئوية.",
    },
    impacts: [
      { label: "Entity RAG Status", before: "🔴 RED (67%)", after: "🟡 AMBER (80%)", direction: "positive" },
      { label: "Pillar Health", before: "61%", after: "69%", direction: "positive" },
      { label: "Org Health Score", before: "68%", after: "71%", direction: "positive" },
      { label: "Target Ambition", before: "High (90%)", after: "Moderate (75%)", direction: "negative" },
    ],
    warnings: {
      en: [
        "3 peer organizations in this sector maintain targets ≥ 85% — reducing to 75% places this org below the sector benchmark.",
        "This change may reduce motivation for the entity owner if the revised target appears too easy to achieve.",
      ],
      ar: [
        "3 جهات مشابهة في هذا القطاع تحتفظ بأهداف ≥ 85% — التخفيض إلى 75% يضع الجهة دون المعيار القطاعي.",
        "قد يُقلل هذا التغيير من الدافعية إذا بدا الهدف المُعدَّل سهل التحقيق.",
      ],
    },
    recommendation: {
      en: "Consider setting an interim target at 80% (Amber threshold) with a commitment to return to 90% by year-end, rather than permanently lowering the target.",
      ar: "يُنصح بتحديد هدف مؤقت عند 80% (حد المنطقة الصفراء) مع الالتزام بالعودة إلى 90% بنهاية العام، بدلاً من خفض الهدف الدائم.",
    },
  },
  formula: {
    summary: {
      en: "Changing the formula will recalculate all historical values for this entity. The new formula introduces a weight-based calculation that may cause historical performance scores to shift by ±5–12% depending on the period.",
      ar: "سيُعيد تغيير المعادلة حساب جميع القيم التاريخية لهذا المؤشر. تُدخل المعادلة الجديدة حساباً قائماً على الأوزان قد يؤدي إلى تحرك درجات الأداء التاريخية بمقدار ±5–12% حسب الفترة.",
    },
    impacts: [
      { label: "Historical Values", before: "Preserved", after: "Recalculated", direction: "neutral" },
      { label: "Current Achievement", before: "82%", after: "~76% (est.)", direction: "negative" },
      { label: "RAG Status", before: "🟢 GREEN", after: "🟡 AMBER (likely)", direction: "negative" },
      { label: "Audit Trail", before: "Single version", after: "Version break logged", direction: "neutral" },
    ],
    warnings: {
      en: [
        "All historical reports and dashboards referencing this entity will show recalculated values — inform stakeholders before applying.",
        "The formula change introduces division by a variable that could be zero — add a null check to prevent formula errors.",
      ],
      ar: [
        "ستُظهر جميع التقارير ولوحات المعلومات التاريخية التي تشير إلى هذا المؤشر قيماً مُعاد حسابها — أبلغ أصحاب المصلحة قبل التطبيق.",
        "يُدخل تغيير المعادلة قسمة على متغير قد يكون صفراً — أضف فحص القيم الخالية لمنع أخطاء المعادلة.",
      ],
    },
    recommendation: {
      en: "Apply the formula change at the start of the new reporting period rather than mid-period to maintain historical data integrity. Document the rationale in the change request notes.",
      ar: "طبِّق تغيير المعادلة في بداية فترة التقارير الجديدة بدلاً من منتصف الفترة للحفاظ على سلامة البيانات التاريخية. وثِّق المبرر في ملاحظات طلب التغيير.",
    },
  },
  structure: {
    summary: {
      en: "This structural change affects 3 child entities and 2 initiatives linked to the current entity. Approval chains and ownership assignments will need to be reviewed after the change is applied.",
      ar: "يؤثر هذا التغيير الهيكلي على 3 مؤشرات تابعة ومبادرتين مرتبطتين بالكيان الحالي. ستحتاج سلاسل الموافقة وتعيينات الملكية إلى مراجعة بعد تطبيق التغيير.",
    },
    impacts: [
      { label: "Child entities affected", before: "3 linked", after: "Hierarchy updated", direction: "neutral" },
      { label: "Linked Initiatives", before: "2 active", after: "Reassignment needed", direction: "negative" },
      { label: "Approval Chain", before: "Defined", after: "Needs review", direction: "negative" },
      { label: "Dashboard Rollup", before: "Current pillar", after: "New parent entity", direction: "neutral" },
    ],
    warnings: {
      en: [
        "Dashboard rollup calculations will change immediately — verify that pillar health scores are not materially affected.",
        "Users currently assigned to this entity's child entities must be re-notified of any ownership changes.",
      ],
      ar: [
        "ستتغير حسابات تجميع لوحة المعلومات فوراً — تحقق من عدم تأثر نقاط صحة المحاور بشكل جوهري.",
        "يجب إخطار المستخدمين المعيَّنين حالياً لمؤشرات هذا الكيان الفرعية بأي تغييرات في الملكية.",
      ],
    },
    recommendation: {
      en: "Schedule this change during a low-activity period (e.g., period close) and notify all affected entity owners and approvers at least 3 days in advance.",
      ar: "جدوِل هذا التغيير خلال فترة نشاط منخفض (مثل إغلاق الفترة) وأخطر جميع مالكي المؤشرات والمعتمدين المتأثرين قبل 3 أيام على الأقل.",
    },
  },
  other: {
    summary: {
      en: "This change request has been analyzed for downstream impact. Based on the before/after comparison, the modification is low-risk with limited impact on current performance scores or reporting structures.",
      ar: "تم تحليل طلب التغيير هذا للأثر المنعكس. بناءً على مقارنة ما قبل وبعد التغيير، يُعد التعديل منخفض المخاطر مع تأثير محدود على درجات الأداء الحالية أو هياكل التقارير.",
    },
    impacts: [
      { label: "Performance Score", before: "Unchanged", after: "Unchanged", direction: "neutral" },
      { label: "Reporting", before: "Current", after: "Updated metadata", direction: "neutral" },
    ],
    warnings: {
      en: ["Document the reason for this change in the request notes for audit trail purposes."],
      ar: ["وثِّق سبب هذا التغيير في ملاحظات الطلب لأغراض مسار المراجعة."],
    },
    recommendation: {
      en: "This change is low-risk and can be approved without additional review. Ensure the change is logged in the system audit trail.",
      ar: "هذا التغيير منخفض المخاطر ويمكن اعتماده دون مراجعة إضافية. تأكد من تسجيل التغيير في مسار مراجعة النظام.",
    },
  },
};

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) return aiDisabledResponse();

  const { changeType = "other", locale } =
    (await req.json()) as {
      entityTitle?: string;
      changeType?: ChangeType;
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      locale?: string;
    };

  const isArabic = locale === "ar";
  const mock = MOCK_BY_TYPE[changeType] ?? MOCK_BY_TYPE.other;

  await new Promise<void>((r) => setTimeout(r, 600));

  return NextResponse.json({
    summary: isArabic ? mock.summary.ar : mock.summary.en,
    impacts: mock.impacts,
    warnings: isArabic ? mock.warnings.ar : mock.warnings.en,
    recommendation: isArabic ? mock.recommendation.ar : mock.recommendation.en,
  });
}
