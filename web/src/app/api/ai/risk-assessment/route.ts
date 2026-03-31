import { NextRequest, NextResponse } from "next/server";
import { aiDisabledResponse, isAiFeatureEnabled } from "../_mock-stream";

const KEYWORD_SEVERITY: Array<{
  keywords: string[];
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  likelihood: "LOW" | "MEDIUM" | "HIGH";
  mitigations: { en: string[]; ar: string[] };
  metricImpacts: { title: string; impact: string }[];
  reasoning: { en: string; ar: string };
}> = [
  {
    keywords: ["vendor", "supplier", "delivery", "supply chain", "procurement", "توريد", "مورد"],
    severity: "HIGH",
    likelihood: "MEDIUM",
    mitigations: {
      en: [
        "Identify and onboard at least one backup supplier with pre-negotiated standby terms",
        "Increase safety stock inventory to provide 2–3 weeks of buffer",
        "Establish weekly vendor status check-in meetings with escalation protocol",
        "Include delivery delay penalties in all new supplier contracts",
      ],
      ar: [
        "تحديد مورد احتياطي واحد على الأقل والتعاقد معه بشروط توقف مسبقة",
        "زيادة مخزون الأمان ليوفر مخزوناً كافياً لمدة أسبوعين إلى ثلاثة",
        "تفعيل اجتماعات متابعة أسبوعية مع المورد مع بروتوكول تصعيد واضح",
        "تضمين غرامات التأخير في جميع عقود الموردين الجديدة",
      ],
    },
    metricImpacts: [
      { title: "Production Output", impact: "Could drop 15–25% if delays exceed 2 weeks" },
      { title: "Customer Delivery SLA", impact: "At risk if production delays cascade" },
      { title: "Cost Per Unit", impact: "May increase 8–12% due to expedited alternatives" },
    ],
    reasoning: {
      en: "Vendor delivery risks carry HIGH severity due to direct operational impact and the limited alternative sourcing options typical in this sector. The MEDIUM likelihood reflects that while common, most delivery issues are resolved within acceptable timeframes.",
      ar: "تُصنَّف مخاطر توريد المورد بدرجة خطورة عالية نظراً للتأثير التشغيلي المباشر ومحدودية بدائل التوريد في هذا القطاع. تعكس الاحتمالية المتوسطة أن معظم مشكلات التسليم تُحل خلال أطر زمنية مقبولة.",
    },
  },
  {
    keywords: ["regulation", "compliance", "regulatory", "legal", "law", "audit", "تنظيم", "امتثال", "تشريع"],
    severity: "CRITICAL",
    likelihood: "LOW",
    mitigations: {
      en: [
        "Conduct a full regulatory gap assessment with legal counsel within 30 days",
        "Assign a dedicated compliance officer for this regulatory domain",
        "Implement automated compliance monitoring and alert system",
        "Schedule quarterly compliance reviews with senior leadership",
      ],
      ar: [
        "إجراء تقييم شامل للثغرات التنظيمية بمشاركة المستشار القانوني خلال 30 يوماً",
        "تعيين مسؤول امتثال مخصص لهذا النطاق التنظيمي",
        "تطبيق نظام رصد وتنبيه آلي للامتثال",
        "جدولة مراجعات امتثال ربع سنوية مع القيادة العليا",
      ],
    },
    metricImpacts: [
      { title: "Compliance Rate", impact: "Direct — non-compliance will be reflected immediately" },
      { title: "Operational Continuity", impact: "Regulatory action could pause operations" },
      { title: "Reputational Score", impact: "Public compliance failures damage trust" },
    ],
    reasoning: {
      en: "Regulatory compliance risks are classified CRITICAL due to potential financial penalties, operational suspension, and reputational damage. Although likelihood is LOW given current adherence rates, the consequence severity demands proactive management.",
      ar: "تُصنَّف مخاطر الامتثال التنظيمي بدرجة حرجة نظراً للعقوبات المالية المحتملة وتوقف العمليات والضرر بالسمعة. وعلى الرغم من انخفاض الاحتمالية، إلا أن خطورة العواقب تستوجب الإدارة الاستباقية.",
    },
  },
  {
    keywords: ["talent", "retention", "resignation", "turnover", "staff", "employee", "human", "موظف", "استقالة", "كفاءات"],
    severity: "HIGH",
    likelihood: "MEDIUM",
    mitigations: {
      en: [
        "Conduct anonymous employee engagement surveys to identify root causes",
        "Review compensation benchmarks against market rates and adjust if below median",
        "Implement structured career development and succession planning programs",
        "Create retention bonuses for critical skill positions at risk",
      ],
      ar: [
        "إجراء استطلاعات مجهولة لمشاركة الموظفين لتحديد الأسباب الجذرية",
        "مراجعة معايير التعويضات مقارنةً بمعدلات السوق والتعديل إذا كانت دون المتوسط",
        "تطبيق برامج منظمة للتطوير الوظيفي وتخطيط الخلافة",
        "إنشاء مكافآت احتفاظ للمناصب التي تمتلك مهارات حرجة",
      ],
    },
    metricImpacts: [
      { title: "Employee Retention Rate", impact: "Direct negative impact" },
      { title: "Productivity per Employee", impact: "Declining as experienced staff leave" },
      { title: "Training & Onboarding Cost", impact: "Will increase significantly with turnover" },
    ],
    reasoning: {
      en: "Talent retention risks are HIGH severity given the operational disruption and knowledge loss caused by experienced employee departures. MEDIUM likelihood reflects current market conditions and limited retention program maturity.",
      ar: "تُصنَّف مخاطر الاحتفاظ بالمواهب بدرجة خطورة عالية نظراً لما يسببه رحيل الموظفين ذوي الخبرة من تعطل تشغيلي وفقدان للمعرفة المؤسسية. تعكس الاحتمالية المتوسطة ظروف سوق العمل الحالية.",
    },
  },
];

const DEFAULT = {
  severity: "MEDIUM" as const,
  likelihood: "MEDIUM" as const,
  mitigations: {
    en: [
      "Document the risk in detail and assign a risk owner with clear accountability",
      "Develop a mitigation action plan with specific milestones and deadlines",
      "Monitor the risk status on a monthly basis and escalate if conditions worsen",
      "Identify early warning indicators to detect if this risk is materializing",
    ],
    ar: [
      "توثيق المخاطرة بتفصيل وتعيين مالك مخاطرة بمسؤوليات واضحة",
      "وضع خطة إجراءات تخفيف بمعالم ومواعيد نهائية محددة",
      "مراقبة حالة المخاطرة شهرياً والتصعيد إذا ساءت الظروف",
      "تحديد مؤشرات إنذار مبكر للكشف عن تحقق المخاطرة",
    ],
  },
  metricImpacts: [
    { title: "Operational Performance", impact: "Moderate negative impact expected" },
    { title: "Strategic Objectives", impact: "May delay achievement of linked goals" },
  ],
  reasoning: {
    en: "Based on the description provided, this risk carries MEDIUM severity due to the operational implications and moderate likelihood of occurrence. The impact scope is contained but requires structured management to prevent escalation.",
    ar: "بناءً على الوصف المقدَّم، تحمل هذه المخاطرة خطورة متوسطة نظراً للتداعيات التشغيلية واحتمالية الحدوث المعتدلة. نطاق التأثير محصور لكن يستوجب إدارة منهجية لمنع التصعيد.",
  },
};

export async function POST(req: NextRequest) {
  if (!(await isAiFeatureEnabled())) return aiDisabledResponse();

  const { description = "", locale } = (await req.json()) as { description?: string; locale?: string };
  const isArabic = locale === "ar";
  const lower = description.toLowerCase();

  const match = KEYWORD_SEVERITY.find((item) =>
    item.keywords.some((kw) => lower.includes(kw)),
  );

  const data = match ?? DEFAULT;

  await new Promise<void>((r) => setTimeout(r, 700));

  return NextResponse.json({
    suggestedSeverity: data.severity,
    likelihood: data.likelihood,
    mitigations: isArabic ? data.mitigations.ar : data.mitigations.en,
    metricImpacts: data.metricImpacts,
    reasoning: isArabic ? data.reasoning.ar : data.reasoning.en,
  });
}
