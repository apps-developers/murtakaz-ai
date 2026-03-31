import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMember } from "@/lib/server-action-auth";
import { isAiFeatureEnabled, aiDisabledResponse } from "../_mock-stream";

export async function POST(req: NextRequest) {
  if (!(await isAiFeatureEnabled())) return aiDisabledResponse();

  const session = await requireOrgMember();
  const { entityId, entityValueId, submittedValue, locale } = (await req.json()) as {
    entityId?: string;
    entityValueId?: string;
    submittedValue?: number;
    locale?: string;
  };

  if (!entityId || submittedValue == null) {
    return NextResponse.json(
      { error: "entityId and submittedValue are required" },
      { status: 400 }
    );
  }

  try {
    // Get entity details for context
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        titleAr: true,
        unit: true,
        targetValue: true,
        direction: true,
      },
    });

    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    // Get historical values (excluding the current submission)
    const historicalValues = await prisma.entityValue.findMany({
      where: {
        entityId,
        status: { in: ["APPROVED", "LOCKED"] },
        ...(entityValueId ? { id: { not: entityValueId } } : {}),
        finalValue: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        finalValue: true,
        createdAt: true,
        achievementValue: true,
      },
    });

    // Calculate historical average
    const validHistoricalValues = historicalValues
      .map((v) => v.finalValue)
      .filter((v): v is number => v != null);

    const historicalAvg =
      validHistoricalValues.length > 0
        ? validHistoricalValues.reduce((a, b) => a + b, 0) / validHistoricalValues.length
        : null;

    // Calculate historical achievement average
    const validAchievementValues = historicalValues
      .map((v) => v.achievementValue)
      .filter((v): v is number => v != null);

    const historicalAchievementAvg =
      validAchievementValues.length > 0
        ? validAchievementValues.reduce((a, b) => a + b, 0) / validAchievementValues.length
        : null;

    // Determine anomaly type
    let anomalyType: "high" | "low" | null = null;
    let deviation = 0;
    let deviationPercent = 0;

    if (historicalAvg != null && historicalAvg > 0) {
      deviation = Math.abs(submittedValue - historicalAvg);
      deviationPercent = (deviation / historicalAvg) * 100;

      // Flag as anomaly if deviation is > 20%
      if (deviationPercent > 20) {
        anomalyType = submittedValue > historicalAvg ? "high" : "low";
      }
    }

    // Format historical values for display
    const formattedHistoricalValues = historicalValues.map((v) => ({
      period: v.createdAt.toISOString().slice(0, 7), // YYYY-MM
      value: v.finalValue ?? 0,
    }));

    // Calculate trend
    let trend: "increasing" | "decreasing" | "stable" | null = null;
    if (validHistoricalValues.length >= 2) {
      const first = validHistoricalValues[0];
      const last = validHistoricalValues[validHistoricalValues.length - 1];
      if (first > last * 1.1) trend = "increasing";
      else if (first < last * 0.9) trend = "decreasing";
      else trend = "stable";
    }

    // Generate AI assessment
    const isArabic = locale === "ar";
    const assessment = generateAssessment(
      submittedValue,
      historicalAvg,
      entity.targetValue,
      anomalyType,
      deviationPercent,
      trend,
      isArabic,
      entity.direction
    );

    return NextResponse.json({
      historicalAvg,
      historicalAchievementAvg,
      deviation,
      deviationPercent,
      anomalyType,
      historicalValues: formattedHistoricalValues,
      trend,
      assessment,
      entity: {
        title: entity.title,
        titleAr: entity.titleAr,
        unit: entity.unit,
        targetValue: entity.targetValue,
      },
    });
  } catch (error) {
    console.error("Failed to analyze historical data:", error);
    return NextResponse.json(
      { error: "Failed to analyze historical data" },
      { status: 500 }
    );
  }
}

function generateAssessment(
  submittedValue: number,
  historicalAvg: number | null,
  targetValue: number | null,
  anomalyType: "high" | "low" | null,
  deviationPercent: number,
  trend: "increasing" | "decreasing" | "stable" | null,
  isArabic: boolean,
  direction: string | null
): string {
  const parts: string[] = [];

  if (isArabic) {
    // Arabic assessment
    if (anomalyType) {
      parts.push(
        anomalyType === "high"
          ? `القيمة المُدخلة أعلى بشكل ملحوظ (${Math.round(deviationPercent)}%) من المتوسط التاريخي.`
          : `القيمة المُدخلة أقل بشكل ملحوظ (${Math.round(deviationPercent)}%) من المتوسط التاريخي.`
      );
    } else if (historicalAvg != null) {
      parts.push("القيمة المُدخلة ضمن النطاق الطبيعي مقارنة بالمتوسط التاريخي.");
    }

    if (targetValue != null) {
      const targetDiff = ((submittedValue - targetValue) / targetValue) * 100;
      if (Math.abs(targetDiff) > 10) {
        parts.push(
          targetDiff > 0
            ? `تتجاوز القيمة المستهدفة بنسبة ${Math.round(targetDiff)}%.`
            : `أقل من القيمة المستهدفة بنسبة ${Math.round(Math.abs(targetDiff))}%.`
        );
      } else {
        parts.push("القيمة قريبة من الهدف المستهدف.");
      }
    }

    if (trend) {
      const trendText =
        trend === "increasing"
          ? "اتجاه تصاعدي"
          : trend === "decreasing"
          ? "اتجاه تنازلي"
          : "مستقر";
      parts.push(`المؤشر يظهر ${trendText} في الفترات الأخيرة.`);
    }
  } else {
    // English assessment
    if (anomalyType) {
      parts.push(
        anomalyType === "high"
          ? `Submitted value is significantly higher (${Math.round(deviationPercent)}%) than historical average.`
          : `Submitted value is significantly lower (${Math.round(deviationPercent)}%) than historical average.`
      );
    } else if (historicalAvg != null) {
      parts.push("Submitted value is within normal range compared to historical average.");
    }

    if (targetValue != null) {
      const targetDiff = ((submittedValue - targetValue) / targetValue) * 100;
      if (Math.abs(targetDiff) > 10) {
        parts.push(
          targetDiff > 0
            ? `Exceeds target by ${Math.round(targetDiff)}%.`
            : `Below target by ${Math.round(Math.abs(targetDiff))}%.`
        );
      } else {
        parts.push("Value is close to target.");
      }
    }

    if (trend) {
      const trendText =
        trend === "increasing" ? "upward trend" : trend === "decreasing" ? "downward trend" : "stable";
      parts.push(`Indicator shows ${trendText} in recent periods.`);
    }
  }

  return parts.join(" ");
}
