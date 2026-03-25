import { NextRequest } from "next/server";
import { aiDisabledResponse, isAiEnabled, streamResponse } from "../_mock-stream";

const INSIGHTS: Record<string, { en: string; ar: string }> = {
  executive: {
    en: "📊 Your organization's overall health is 72% this quarter — up from 64% in Q4. The Growth pillar leads at 88%, driven by strong Revenue Growth (91%) and Customer Acquisition (83%) metrics. ⚠️ People & Culture requires immediate attention at 48% — Employee Retention has dropped to its lowest point in 12 months. Recommend prioritizing HR retention programs before Q2 closes.",
    ar: "📊 وصلت الصحة الإجمالية للمنظمة إلى 72% هذا الربع، ارتفاعاً من 64% في الربع الرابع. يتصدر محور النمو بنسبة 88% مدفوعاً بقوة مؤشر نمو الإيرادات (91%). ⚠️ يحتاج محور الأفراد والثقافة إلى تدخل فوري بنسبة 48% — انخفض معدل الاحتفاظ بالموظفين إلى أدنى مستوياته خلال 12 شهراً.",
  },
  governance: {
    en: "⚠️ You have 18 change requests pending review — 5 of which have been waiting more than 14 days. The average approval turnaround time increased to 8.4 days this month, up from 2.9 days last month. This coincides with 2 approver accounts being inactive. Recommend redistributing the approval workload to prevent further backlog.",
    ar: "⚠️ لديك 18 طلب تغيير بانتظار المراجعة — 5 منها تنتظر منذ أكثر من 14 يوماً. ارتفع متوسط وقت الموافقة إلى 8.4 أيام هذا الشهر. يُنصح بإعادة توزيع عبء الموافقة لتجنب تراكم المهام.",
  },
  "risk-escalation": {
    en: "🚨 You have 4 CRITICAL risks — up from 2 last month. Two of these have been open for more than 30 days with no recorded mitigation action. The risk 'Key vendor delivery delay' is linked to 3 performance indicators that are all currently in RED status. This is your highest-priority risk cluster and requires executive-level attention.",
    ar: "🚨 لديك 4 مخاطر حرجة، ارتفاعاً من 2 الشهر الماضي. اثنتان منهما مفتوحتان منذ أكثر من 30 يوماً دون إجراء تخفيفي مسجَّل. تؤثر مخاطرة 'تأخر توريد المورد الرئيسي' على 3 مؤشرات أداء جميعها في الحالة الحمراء.",
  },
  "initiative-health": {
    en: "📋 15 of 23 initiatives (65%) are on track this quarter. 4 initiatives are flagged AT_RISK due to blocked milestones. The 'Digital Transformation' initiative is the most critical: 6 of 12 milestones are overdue and 3 associated metrics are declining. Resource reallocation is recommended before the end of Q2.",
    ar: "📋 15 من أصل 23 مبادرة (65%) تسير وفق الخطة هذا الربع. 4 مبادرات مُحددة بوصفها مهددة بسبب معالم محجوبة. مبادرة 'التحول الرقمي' هي الأكثر إلحاحاً: 6 من 12 معلماً متأخرة و3 مؤشرات مرتبطة في تراجع.",
  },
  "employee-contribution": {
    en: "👥 Team contribution compliance this month is 78% — 3 managers have submitted all their performance values, 2 are 5+ days overdue. Ahmed Al-Rashid leads with 100% on-time submissions across all 8 assigned metrics. The Operations department has the highest overdue rate (34%) — targeted follow-up is recommended.",
    ar: "👥 معدل الامتثال في تقديم المساهمات هذا الشهر 78% — 3 مديرين قدموا جميع قيم مؤشراتهم، و2 متأخران بأكثر من 5 أيام. إدارة العمليات لديها أعلى معدل تأخير (34%).",
  },
  "entity-performance": {
    en: "📈 Performance improved overall this quarter: 52% of indicators are GREEN (up from 41%), 28% AMBER, and 20% RED. The biggest improvement was in the Finance category (+18pp). However, 12 indicators still have no data entered for the current period — data freshness remains your most critical governance risk.",
    ar: "📈 تحسّن الأداء الإجمالي هذا الربع: 52% من المؤشرات خضراء (ارتفاعاً من 41%)، و28% صفراء، و20% حمراء. أبرز تحسن في الفئة المالية (+18 نقطة). لا تزال 12 مؤشراً دون بيانات للفترة الحالية.",
  },
  manager: {
    en: "📋 You have 6 performance indicators assigned to you this month. 3 are GREEN, 2 are AMBER, and 1 is overdue for data entry (Customer Satisfaction Score — 8 days past deadline). Your average submission time is 2.3 days before deadline — one of the best in the organization. Consider entering your CSAT value today to maintain your compliance record.",
    ar: "📋 لديك 6 مؤشرات مُعيَّنة لك هذا الشهر. 3 خضراء، 2 صفراء، و1 متأخر في إدخال البيانات (مؤشر رضا العملاء — تأخر 8 أيام). يُنصح بإدخال قيمتك اليوم.",
  },
  "project-execution": {
    en: "🏗️ Project execution health is AMBER at 61%. 8 of 15 active projects are on schedule. The 'ERP Integration' and 'Customer Portal' projects are both behind schedule with multiple blocked milestones. Combined, these two projects account for 6 of the 9 overdue milestones across the portfolio. Executive escalation is recommended.",
    ar: "🏗️ صحة تنفيذ المشاريع في الحالة الصفراء بنسبة 61%. 8 من 15 مشروعاً نشطاً في الموعد المحدد. مشروعا 'تكامل نظام ERP' و'بوابة العملاء' متأخران مع معالم محجوبة متعددة.",
  },
};

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) return aiDisabledResponse();

  const { dashboardType } = (await req.json()) as { dashboardType?: string };
  const key = dashboardType ?? "executive";
  const insight = INSIGHTS[key] ?? INSIGHTS.executive;

  const isArabic = req.headers.get("accept-language")?.startsWith("ar") ?? false;
  const text = isArabic ? insight.ar : insight.en;

  return streamResponse(text);
}
