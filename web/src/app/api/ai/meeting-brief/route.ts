import { NextRequest } from "next/server";
import { aiDisabledResponse, isAiFeatureEnabled, streamResponse } from "../_mock-stream";

type BriefType = "board" | "department" | "project" | "manager-1on1";

const BRIEFS: Record<BriefType, { en: string; ar: string }> = {
  board: {
    en: `## Pre-Meeting Brief: Board Meeting
### Date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
**Estimated reading time: 2 minutes**

---

### 3 Things Going Well ✅
1. **Overall health improved** — Organization health score reached 72% this quarter (up from 64% in Q4)
2. **Revenue Growth is at 91%** — exceeding the 85% target by 6pp; strongest performance in 3 years
3. **Approval compliance** — 89% of values submitted on time this month, up from 74% last quarter

### 3 Things to Discuss ⚠️
1. **People & Culture at 48%** — Employee Retention dropped to 41%, lowest in 12 months; HR action plan needed
2. **12 indicators with no data** — Data freshness is the #1 governance risk; owners have not submitted for current period
3. **4 critical risks open** — 2 have been open for 30+ days with no recorded mitigation action

### Key Question for the Board
*"What strategic interventions will close the gap between our strong financial performance and declining people metrics before Q2?"*

---
*AI-generated from approved data — verify figures before the meeting*`,

    ar: `## ملخص تحضيري: اجتماع مجلس الإدارة
### التاريخ: ${new Date().toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}
**وقت القراءة المقدَّر: دقيقتان**

---

### 3 أمور تسير بشكل جيد ✅
1. **تحسّن الصحة الإجمالية** — وصل مؤشر صحة الجهة إلى 72% هذا الربع (ارتفاعاً من 64% في الربع الرابع)
2. **مؤشر نمو الإيرادات عند 91%** — يتجاوز الهدف (85%) بفارق 6 نقاط؛ أقوى أداء منذ 3 سنوات
3. **التزام الموافقات** — 89% من قيم المؤشرات قُدِّمت في الموعد المحدد هذا الشهر، ارتفاعاً من 74% الربع الماضي

### 3 أمور للنقاش ⚠️
1. **محور الأفراد والثقافة عند 48%** — انخفض معدل الاحتفاظ بالموظفين إلى 41%، أدنى مستوى في 12 شهراً؛ يلزم خطة عمل من الموارد البشرية
2. **12 مؤشراً بلا بيانات** — اكتمال البيانات هو المخاطرة الحوكمية الأولى؛ لم يُقدِّم أصحابها قيماً للفترة الحالية
3. **4 مخاطر حرجة مفتوحة** — 2 منها مفتوحتان منذ أكثر من 30 يوماً دون إجراء تخفيفي مسجَّل

### السؤال الرئيسي للمجلس
*"ما التدخلات الاستراتيجية التي ستُسد الفجوة بين أدائنا المالي القوي وتراجع مؤشرات الأفراد قبل نهاية الربع الثاني؟"*

---
*مُولَّد بالذكاء الاصطناعي من البيانات المعتمدة — تحقق من الأرقام قبل الاجتماع*`,
  },

  department: {
    en: `## Pre-Meeting Brief: Department Review
### Scope: Operations Department
**Estimated reading time: 2 minutes**

---

### 3 Things Going Well ✅
1. **Process Cycle Time at 88%** — best performance in 6 months; down from 8.2 to 5.1 days average
2. **All 4 monthly metrics submitted on time** — 100% reporting compliance this month
3. **Risk 'Equipment failure' closed** — mitigation completed successfully last week

### 3 Things to Discuss ⚠️
1. **Cost Efficiency dropped 4pp** (82% → 78%) — is this a one-time variance or a trend?
2. **2 indicators have no baseline** — makes target comparison unreliable; needs historical data input
3. **Project 'Automation Phase 2'** — milestone 3 of 5 is 8 days overdue; blocking dependent metrics

### Key Question for the Team
*"What specific actions will bring Cost Efficiency back above 80% by end of Q2?"*

---
*AI-generated from approved data — verify figures before the meeting*`,

    ar: `## ملخص تحضيري: مراجعة الإدارة
### النطاق: إدارة العمليات
**وقت القراءة المقدَّر: دقيقتان**

---

### 3 أمور تسير بشكل جيد ✅
1. **وقت دورة العملية عند 88%** — أفضل أداء في 6 أشهر؛ انخفض متوسط الوقت من 8.2 إلى 5.1 أيام
2. **جميع المؤشرات الأربعة قُدِّمت في موعدها** — نسبة الامتثال 100% هذا الشهر
3. **إغلاق مخاطرة "تعطل المعدات"** — اكتملت إجراءات التخفيف بنجاح الأسبوع الماضي

### 3 أمور للنقاش ⚠️
1. **تراجع كفاءة التكلفة بـ 4 نقاط** (من 82% إلى 78%) — هل هذا انحراف لمرة واحدة أم اتجاه متصاعد؟
2. **مؤشران بلا خط أساسي** — يجعل مقارنة الهدف غير موثوقة؛ يلزم إدخال البيانات التاريخية
3. **مشروع 'المرحلة الثانية للأتمتة'** — المعلم 3 من 5 متأخر 8 أيام؛ يعيق المؤشرات التابعة

### السؤال الرئيسي للفريق
*"ما الإجراءات المحددة لإعادة كفاءة التكلفة فوق 80% بنهاية الربع الثاني؟"*

---
*مُولَّد بالذكاء الاصطناعي من البيانات المعتمدة — تحقق من الأرقام قبل الاجتماع*`,
  },

  project: {
    en: `## Pre-Meeting Brief: Project Review
### Project: Digital Transformation Initiative
**Estimated reading time: 2 minutes**

---

### 3 Things Going Well ✅
1. **Phase 1 fully delivered** — all 4 milestones in Phase 1 completed on time and within budget
2. **Stakeholder satisfaction at 87%** — higher than the 80% target after Phase 1 rollout
3. **Team velocity** — team is completing an average of 1.8 milestones/month, ahead of the 1.5 target

### 3 Things to Discuss ⚠️
1. **Milestone 7 is BLOCKED** — pending decision on cloud provider selection; 12 days delayed so far
2. **Risk 'Integration complexity'** — rated HIGH severity; no mitigation plan documented yet
3. **'System Uptime' metric** — dropped to 94% (target: 99.5%) following the Phase 2 deployment

### Key Question for the Team
*"What is the decision-making timeline for the cloud provider selection, and who has the authority to unblock Milestone 7?"*

---
*AI-generated from project data — verify with project manager before the meeting*`,

    ar: `## ملخص تحضيري: مراجعة المشروع
### المشروع: مبادرة التحول الرقمي
**وقت القراءة المقدَّر: دقيقتان**

---

### 3 أمور تسير بشكل جيد ✅
1. **تسليم المرحلة الأولى بالكامل** — جميع المعالم الأربعة في المرحلة الأولى اكتملت في الموعد وضمن الميزانية
2. **رضا أصحاب المصلحة عند 87%** — أعلى من هدف 80% بعد إطلاق المرحلة الأولى
3. **وتيرة الفريق** — يُنجز الفريق 1.8 معلم شهرياً في المتوسط، متجاوزاً هدف 1.5

### 3 أمور للنقاش ⚠️
1. **المعلم السابع محجوب** — بانتظار قرار اختيار مزود الحوسبة السحابية؛ تأخر 12 يوماً حتى الآن
2. **مخاطرة 'تعقيد التكامل'** — مصنَّفة بخطورة عالية؛ لم تُوثَّق خطة تخفيف بعد
3. **مؤشر 'وقت تشغيل النظام'** — انخفض إلى 94% (الهدف: 99.5%) بعد نشر المرحلة الثانية

### السؤال الرئيسي للفريق
*"ما الجدول الزمني لاتخاذ قرار اختيار مزود الحوسبة السحابية، ومن يملك الصلاحية لرفع الحجب عن المعلم السابع؟"*

---
*مُولَّد بالذكاء الاصطناعي من بيانات المشروع — تحقق مع مدير المشروع قبل الاجتماع*`,
  },

  "manager-1on1": {
    en: `## Pre-Meeting Brief: Manager 1:1
### Manager: Ahmed Al-Rashid | Operations
**Estimated reading time: 2 minutes**

---

### Wins to Acknowledge ✅
1. **100% on-time submissions** — all 8 assigned indicators submitted before deadline this month
2. **Process Cycle Time improved** — went from 7.1 to 5.1 days (target: ≤ 5 days — almost there!)
3. **Quality Rate at 93%** — consistently above the 90% target for 3 months running

### Topics to Discuss ⚠️
1. **Customer Satisfaction at 72%** — below the 80% target; what is the root cause?
2. **'Training Hours' metric** — submitted at 12 hours vs. 30-hour historical average; is there an issue with the team's development time?
3. **Upcoming deadline** — 2 quarterly indicators are due in 8 days; confirm data is ready

### Coaching Question
*"You're consistently meeting operational indicators — what would it take to close the gap on the customer-facing metrics in Q2?"*

---
*AI-generated from approved data — adapt based on your direct knowledge of this manager*`,

    ar: `## ملخص تحضيري: اجتماع فردي مع مدير
### المدير: أحمد الراشد | إدارة العمليات
**وقت القراءة المقدَّر: دقيقتان**

---

### إنجازات للإشادة بها ✅
1. **100% تقديم في الموعد** — جميع المؤشرات الثمانية المُعيَّنة قُدِّمت قبل الموعد النهائي هذا الشهر
2. **تحسّن وقت دورة العملية** — من 7.1 إلى 5.1 أيام (الهدف: ≤ 5 أيام — على وشك تحقيقه!)
3. **معدل الجودة عند 93%** — فوق هدف 90% باستمرار منذ 3 أشهر متتالية

### موضوعات للنقاش ⚠️
1. **رضا العملاء عند 72%** — دون الهدف (80%)؛ ما السبب الجذري؟
2. **مؤشر 'ساعات التدريب'** — قُدِّم بـ 12 ساعة مقابل متوسط 30 ساعة تاريخياً؛ هل هناك مشكلة في وقت التطوير؟
3. **موعد نهائي قادم** — مؤشران ربع سنويان موعدهما بعد 8 أيام؛ تأكد من جاهزية البيانات

### سؤال التوجيه
*"أنت تحقق المؤشرات التشغيلية باستمرار — ما الذي يلزم لسد الفجوة في المؤشرات المرتبطة بالعملاء خلال الربع الثاني؟"*

---
*مُولَّد بالذكاء الاصطناعي من البيانات المعتمدة — عدِّل بناءً على معرفتك المباشرة بهذا المدير*`,
  },
};

export async function POST(req: NextRequest) {
  if (!(await isAiFeatureEnabled())) return aiDisabledResponse();

  const { briefType = "board", lang = "en" } =
    (await req.json()) as { briefType?: BriefType; contextInput?: string; lang?: "en" | "ar" };

  const brief = BRIEFS[briefType] ?? BRIEFS.board;
  const text = lang === "ar" ? brief.ar : brief.en;

  return streamResponse(text);
}
