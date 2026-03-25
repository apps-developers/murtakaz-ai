import { NextRequest, NextResponse } from "next/server";
import { aiDisabledResponse, isAiEnabled } from "../_mock-stream";

const SECTOR_ENTITY_SETS: Record<string, Array<{
  title: string; titleAr: string;
  description?: string; descriptionAr?: string;
  unit: string; unitAr: string;
  direction: "increase" | "decrease" | "maintain";
  period: string;
  targetSuggestion: string;
  rationale?: string;
}>> = {
  general: [
    {
      title: "Customer Satisfaction Score (CSAT)",
      titleAr: "مؤشر رضا العملاء",
      unit: "%", unitAr: "٪",
      direction: "increase", period: "Quarterly",
      targetSuggestion: "≥ 85%",
      rationale: "CSAT is the most direct indicator of customer experience quality and loyalty risk.",
    },
    {
      title: "Process Cycle Time",
      titleAr: "وقت دورة العملية",
      unit: "days", unitAr: "أيام",
      direction: "decrease", period: "Monthly",
      targetSuggestion: "≤ 5 days",
      rationale: "Reducing cycle time improves efficiency and customer responsiveness.",
    },
    {
      title: "Employee Retention Rate",
      titleAr: "معدل الاحتفاظ بالموظفين",
      unit: "%", unitAr: "٪",
      direction: "increase", period: "Quarterly",
      targetSuggestion: "≥ 90%",
      rationale: "High retention reduces recruitment costs and preserves institutional knowledge.",
    },
    {
      title: "Cost Efficiency Ratio",
      titleAr: "نسبة كفاءة التكلفة",
      unit: "%", unitAr: "٪",
      direction: "increase", period: "Monthly",
      targetSuggestion: "≥ 80%",
      rationale: "Tracks how effectively budget is being utilized relative to planned targets.",
    },
  ],
  government: [
    {
      title: "Service Delivery Compliance Rate",
      titleAr: "معدل الامتثال في تقديم الخدمات",
      unit: "%", unitAr: "٪",
      direction: "increase", period: "Monthly",
      targetSuggestion: "≥ 95%",
      rationale: "Government entities must deliver mandated services within regulatory timelines.",
    },
    {
      title: "Citizen Satisfaction Index",
      titleAr: "مؤشر رضا المواطنين",
      unit: "%", unitAr: "٪",
      direction: "increase", period: "Quarterly",
      targetSuggestion: "≥ 80%",
      rationale: "Core accountability metric aligned with Vision 2030 quality of life goals.",
    },
    {
      title: "Digital Service Adoption Rate",
      titleAr: "معدل اعتماد الخدمات الرقمية",
      unit: "%", unitAr: "٪",
      direction: "increase", period: "Quarterly",
      targetSuggestion: "≥ 70%",
      rationale: "Accelerates the digital government transformation agenda.",
    },
    {
      title: "Average Request Processing Time",
      titleAr: "متوسط وقت معالجة الطلبات",
      unit: "hours", unitAr: "ساعات",
      direction: "decrease", period: "Monthly",
      targetSuggestion: "≤ 48 hours",
      rationale: "Reduces citizen wait time and improves service quality perception.",
    },
    {
      title: "Policy Compliance Rate",
      titleAr: "معدل الامتثال للسياسات",
      unit: "%", unitAr: "٪",
      direction: "increase", period: "Quarterly",
      targetSuggestion: "≥ 98%",
      rationale: "Ensures all operations adhere to government regulations and internal policies.",
    },
  ],
  healthcare: [
    {
      title: "Patient Satisfaction Score",
      titleAr: "مؤشر رضا المرضى",
      unit: "%", unitAr: "٪",
      direction: "increase", period: "Monthly",
      targetSuggestion: "≥ 90%",
      rationale: "Directly reflects care quality and drives patient retention.",
    },
    {
      title: "Average Length of Stay",
      titleAr: "متوسط مدة الإقامة",
      unit: "days", unitAr: "أيام",
      direction: "decrease", period: "Monthly",
      targetSuggestion: "≤ 4 days",
      rationale: "Shorter stays improve throughput and reduce hospital-acquired complications.",
    },
    {
      title: "Readmission Rate (30-day)",
      titleAr: "معدل إعادة الإدخال خلال 30 يوماً",
      unit: "%", unitAr: "٪",
      direction: "decrease", period: "Monthly",
      targetSuggestion: "≤ 8%",
      rationale: "High readmission rates signal care quality issues and increase costs.",
    },
    {
      title: "Staff-to-Patient Ratio",
      titleAr: "نسبة الكوادر إلى المرضى",
      unit: "ratio", unitAr: "نسبة",
      direction: "maintain", period: "Monthly",
      targetSuggestion: "1:6",
      rationale: "Optimal staffing ensures quality care without over-resourcing.",
    },
  ],
  finance: [
    {
      title: "Net Promoter Score (NPS)",
      titleAr: "مؤشر صافي المروجين",
      unit: "score", unitAr: "درجة",
      direction: "increase", period: "Quarterly",
      targetSuggestion: "≥ 50",
      rationale: "Top predictor of customer loyalty and long-term revenue growth in financial services.",
    },
    {
      title: "Loan Default Rate",
      titleAr: "معدل التعثر في السداد",
      unit: "%", unitAr: "٪",
      direction: "decrease", period: "Monthly",
      targetSuggestion: "≤ 2%",
      rationale: "Critical risk management indicator for financial stability.",
    },
    {
      title: "Cost-to-Income Ratio",
      titleAr: "نسبة التكلفة إلى الدخل",
      unit: "%", unitAr: "٪",
      direction: "decrease", period: "Quarterly",
      targetSuggestion: "≤ 45%",
      rationale: "Core efficiency metric in banking — lower is better.",
    },
    {
      title: "Digital Channel Transaction Share",
      titleAr: "نسبة المعاملات عبر القنوات الرقمية",
      unit: "%", unitAr: "٪",
      direction: "increase", period: "Monthly",
      targetSuggestion: "≥ 75%",
      rationale: "Reflects digital transformation progress and reduces branch operating costs.",
    },
  ],
  education: [
    {
      title: "Student Satisfaction Rate",
      titleAr: "معدل رضا الطلاب",
      unit: "%", unitAr: "٪",
      direction: "increase", period: "Semester",
      targetSuggestion: "≥ 85%",
      rationale: "Key indicator of education quality and institutional reputation.",
    },
    {
      title: "Course Completion Rate",
      titleAr: "معدل إتمام المقررات",
      unit: "%", unitAr: "٪",
      direction: "increase", period: "Semester",
      targetSuggestion: "≥ 90%",
      rationale: "Measures student engagement and program effectiveness.",
    },
    {
      title: "Graduate Employment Rate (6 months)",
      titleAr: "معدل توظيف الخريجين (6 أشهر)",
      unit: "%", unitAr: "٪",
      direction: "increase", period: "Annual",
      targetSuggestion: "≥ 80%",
      rationale: "Core outcome metric for academic institution accountability.",
    },
  ],
};

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) return aiDisabledResponse();

  const { sector } = (await req.json()) as { objective?: string; sector?: string; entityTypeCode?: string };
  const key = sector ?? "general";
  const entities = SECTOR_ENTITY_SETS[key] ?? SECTOR_ENTITY_SETS.general;

  await new Promise<void>((r) => setTimeout(r, 800));

  return NextResponse.json({ entities });
}
