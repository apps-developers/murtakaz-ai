import { NextRequest } from "next/server";
import { aiDisabledResponse, isAiFeatureEnabled, streamResponse } from "../_mock-stream";

const MOCK_EN = `## Root Cause Analysis

### Pattern Detected: Sustained Decline
The entity has shown a consistent downward trend over the past 4 reporting periods. This is not a one-time data entry anomaly — the trajectory indicates a structural issue.

### Contributing Factors Found:

**1. 🔴 Linked Risk — HIGH Severity (Open 32 days)**
A high-severity risk associated with this strategic area has been open for 32 days with no recorded mitigation action. This risk directly affects the operational conditions under which this metric is measured.

**2. 🟡 Correlated Metric Decline**
Two related metrics in the same pillar have also declined over the same period, suggesting the root cause is systemic rather than isolated to this one metric.

**3. ⚠️ Project Milestone Delays**
The linked initiative has 2 of its 5 milestones in BLOCKED status. The deliverables from those milestones were expected to drive improvement in this metric.

**4. 📅 Seasonal Pattern**
Historical data shows a similar dip at this time last year, which recovered after Q2 close. This may partly explain the current underperformance.

### Recommended Actions:
1. Immediately review and assign ownership to the open risk item — escalate to pillar owner if unresolved within 5 days
2. Unblock the 2 BLOCKED milestones in the linked initiative — identify what resources or decisions are needed
3. Review Q1 last year to understand how the recovery was achieved and replicate those conditions
4. Consider updating the target if external conditions have materially changed since baseline was set`;

const MOCK_AR = `## تحليل السبب الجذري

### النمط المرصود: تراجع مستمر
أظهر المؤشر اتجاهاً هبوطياً متواصلاً على مدار آخر 4 فترات تقارير. هذا ليس خطأً في إدخال البيانات — يشير المسار إلى مشكلة هيكلية.

### العوامل المساهمة المكتشفة:

**1. 🔴 خطر مرتبط — خطورة عالية (مفتوح منذ 32 يوماً)**
هناك خطر عالي الخطورة مرتبط بهذا المجال الاستراتيجي لم يُتخذ أي إجراء للتخفيف من آثاره خلال الـ 32 يوماً الماضية. يؤثر هذا الخطر مباشرةً على الظروف التشغيلية التي يُقاس فيها هذا المؤشر.

**2. 🟡 تراجع مؤشرات مترابطة**
تراجع أيضاً مؤشران مرتبطان في نفس المحور خلال الفترة ذاتها، مما يشير إلى أن السبب الجذري منهجي وليس معزولاً في هذا المؤشر فحسب.

**3. ⚠️ تأخر معالم المشروع**
2 من أصل 5 معالم في المبادرة المرتبطة بحالة "محجوبة". كان من المتوقع أن تُسهم مخرجات تلك المعالم في تحسين هذا المؤشر.

**4. 📅 نمط موسمي**
تُظهر البيانات التاريخية انخفاضاً مشابهاً في هذا الوقت من العام الماضي، تعافى بعد نهاية الربع الثاني.

### الإجراءات الموصى بها:
1. مراجعة عنصر الخطر المفتوح وتعيين مالك فوراً — تصعيده لمالك المحور إذا ظل دون حل خلال 5 أيام
2. رفع الحجب عن المعلمتين المحجوبتين — تحديد الموارد أو القرارات اللازمة
3. مراجعة الربع الأول من العام الماضي لفهم كيفية التعافي واستنساخ تلك الظروف
4. النظر في تحديث هدف المؤشر إذا تغيرت الظروف الخارجية تغييراً جوهرياً منذ تحديد الخط الأساسي`;

export async function POST(req: NextRequest) {
  if (!(await isAiFeatureEnabled())) return aiDisabledResponse();

  const { locale } = (await req.json()) as { entityId?: string; locale?: string };
  const text = locale === "ar" ? MOCK_AR : MOCK_EN;

  return streamResponse(text);
}
