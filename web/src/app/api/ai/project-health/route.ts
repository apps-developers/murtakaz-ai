import { NextRequest } from "next/server";
import { aiDisabledResponse, isAiFeatureEnabled, streamResponse } from "../_mock-stream";

function buildNarrative(
  projectTitle: string,
  milestonesTotal: number,
  milestonesComplete: number,
  milestonesBlocked: number,
  risksCount: number,
  daysRemaining: number | null,
  isArabic: boolean,
): string {
  const completionPct = milestonesTotal > 0
    ? Math.round((milestonesComplete / milestonesTotal) * 100)
    : 0;

  const timelineNote = daysRemaining != null
    ? (isArabic ? ` مع ${daysRemaining} يوماً متبقياً في الجدول الزمني` : ` with ${daysRemaining} days remaining on the timeline`)
    : "";

  if (isArabic) {
    let health = completionPct >= 70 ? "🟢 في المسار الصحيح" : completionPct >= 40 ? "🟡 مهدد" : "🔴 في خطر";
    if (milestonesBlocked > 0) health = "🟡 مهدد";

    let text = `**صحة المشروع: ${health}**\n\n`;
    text += `اكتمل ${milestonesComplete} من أصل ${milestonesTotal} معلم (${completionPct}%)${timelineNote}. `;

    if (milestonesBlocked > 0) {
      text += `${milestonesBlocked} ${milestonesBlocked === 1 ? "معلم محجوب" : "معالم محجوبة"} يعيق التقدم وقد يؤخر إنجاز المشروع. `;
    }

    if (risksCount > 0) {
      text += `\n\nتم تسجيل ${risksCount} ${risksCount === 1 ? "مخاطرة" : "مخاطر"} مرتبطة بهذا المشروع. `;
      if (risksCount >= 3) {
        text += "يُنصح بمراجعة سجل المخاطر واتخاذ إجراءات تخفيف فورية للمخاطر ذات الخطورة العالية. ";
      }
    }

    if (milestonesBlocked > 0) {
      text += `\n\n**الإجراء الموصى به:** رفع الحجب عن ${milestonesBlocked === 1 ? "المعلم المحجوب" : "المعالم المحجوبة"} هو الأولوية القصوى لهذا المشروع. حدد ما إذا كانت الحجوبات ناتجة عن تبعيات خارجية أو نقص موارد أو قرارات معلقة، وتصعَّد إلى الإدارة إذا لزم الأمر.`;
    } else if (completionPct < 50 && daysRemaining != null && daysRemaining < 30) {
      text += `\n\n**تحذير:** اكتمل ${completionPct}% فقط مع ${daysRemaining} يوماً متبقياً. يستلزم الوتيرة الحالية التدخل لضمان التسليم في الموعد.`;
    } else {
      text += `\n\nالمشروع يسير وفق الخطة. استمر في متابعة المعالم المتبقية والحفاظ على وتيرة التقدم الحالية.`;
    }

    return text;
  } else {
    let health = completionPct >= 70 ? "🟢 On Track" : completionPct >= 40 ? "🟡 At Risk" : "🔴 Critical";
    if (milestonesBlocked > 0) health = "🟡 At Risk";

    let text = `**Project Health: ${health}**\n\n`;
    text += `${milestonesComplete} of ${milestonesTotal} milestones complete (${completionPct}%)${timelineNote}. `;

    if (milestonesBlocked > 0) {
      text += `${milestonesBlocked} ${milestonesBlocked === 1 ? "milestone is" : "milestones are"} BLOCKED, slowing progress and threatening on-time delivery. `;
    }

    if (risksCount > 0) {
      text += `\n\n${risksCount} ${risksCount === 1 ? "risk has" : "risks have"} been recorded against this project. `;
      if (risksCount >= 3) {
        text += "A risk register review is recommended — focus on HIGH and CRITICAL severity items first. ";
      }
    }

    if (milestonesBlocked > 0) {
      text += `\n\n**Recommended Action:** Unblocking the ${milestonesBlocked === 1 ? "blocked milestone" : "blocked milestones"} is the highest priority. Determine whether blockers are external dependencies, resource gaps, or pending decisions, and escalate to project sponsor if needed.`;
    } else if (completionPct < 50 && daysRemaining != null && daysRemaining < 30) {
      text += `\n\n**Warning:** Only ${completionPct}% complete with ${daysRemaining} days remaining. Current velocity requires intervention to ensure on-time delivery.`;
    } else {
      text += `\n\nProject is progressing as planned. Continue tracking remaining milestones and maintain current velocity.`;
    }

    return text;
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAiFeatureEnabled())) return aiDisabledResponse();

  const {
    projectTitle = "this project",
    milestonesTotal = 0,
    milestonesComplete = 0,
    milestonesBlocked = 0,
    risksCount = 0,
    daysRemaining = null,
    locale,
  } = (await req.json()) as {
    projectId?: string;
    projectTitle?: string;
    milestonesTotal?: number;
    milestonesComplete?: number;
    milestonesBlocked?: number;
    risksCount?: number;
    linkedKpisCount?: number;
    daysRemaining?: number | null;
    locale?: string;
  };

  const text = buildNarrative(
    projectTitle,
    milestonesTotal,
    milestonesComplete,
    milestonesBlocked,
    risksCount,
    daysRemaining ?? null,
    locale === "ar",
  );

  return streamResponse(text);
}
