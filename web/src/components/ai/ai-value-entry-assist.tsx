"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

type TrendDirection = "improving" | "declining" | "stable";

type Props = {
  lastValue?: number | null;
  avgValue?: number | null;
  expectedMin?: number | null;
  expectedMax?: number | null;
  trend?: TrendDirection;
  unit?: string;
  enteredValue?: number | null;
  onConfirmCorrect?: () => void;
  onReCheck?: () => void;
};

function isAnomaly(
  value: number | null | undefined,
  avg: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
): { anomalous: boolean; type: "high" | "low" | null } {
  if (value == null || avg == null) return { anomalous: false, type: null };
  if (min != null && max != null) {
    if (value < min) return { anomalous: true, type: "low" };
    if (value > max) return { anomalous: true, type: "high" };
  } else {
    const diff = Math.abs(value - avg);
    const threshold = avg * 0.35;
    if (diff > threshold) {
      return { anomalous: true, type: value < avg ? "low" : "high" };
    }
  }
  return { anomalous: false, type: null };
}

export function AiValueEntryAssist({
  lastValue,
  avgValue,
  expectedMin,
  expectedMax,
  trend = "stable",
  unit = "",
  enteredValue,
  onConfirmCorrect,
  onReCheck,
}: Props) {
  const { t, formatNumber } = useLocale();
  const [dismissed, setDismissed] = useState(false);

  const hasHistory = lastValue != null || avgValue != null;

  if (!hasHistory) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
        <Icon name="tabler:info-circle" className="h-4 w-4 shrink-0" />
        {t("aiReadOnly").split(".")[0]}.
      </div>
    );
  }

  const { anomalous, type: anomalyType } = isAnomaly(enteredValue, avgValue, expectedMin, expectedMax);
  const showWarning = anomalous && enteredValue != null && !dismissed;

  const trendIcon =
    trend === "improving"
      ? "tabler:trending-up"
      : trend === "declining"
        ? "tabler:trending-down"
        : "tabler:minus";
  const trendColor =
    trend === "improving"
      ? "text-emerald-500"
      : trend === "declining"
        ? "text-red-500"
        : "text-muted-foreground";
  const trendLabel =
    trend === "improving"
      ? t("aiTrendImproving")
      : trend === "declining"
        ? t("aiTrendDeclining")
        : t("aiTrendStable");

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-2">
          <Icon name="tabler:sparkles" className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-semibold text-primary">{t("aiValueContext")}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          {lastValue != null && (
            <div>
              <span className="text-muted-foreground">{t("aiLastPeriod")}: </span>
              <span className="font-semibold">{formatNumber(lastValue)}{unit}</span>
            </div>
          )}
          {avgValue != null && (
            <div>
              <span className="text-muted-foreground">{t("aiSixMonthAvg")}: </span>
              <span className="font-semibold">{formatNumber(avgValue)}{unit}</span>
            </div>
          )}
          {expectedMin != null && expectedMax != null && (
            <div>
              <span className="text-muted-foreground">{t("aiExpectedRange")}: </span>
              <span className="font-semibold">
                {formatNumber(expectedMin)}–{formatNumber(expectedMax)}{unit}
              </span>
            </div>
          )}
          <div className={cn("flex items-center gap-1", trendColor)}>
            <Icon name={trendIcon} className="h-3.5 w-3.5" />
            <span>{trendLabel}</span>
          </div>
        </div>
      </div>

      {showWarning && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-3 space-y-2">
          <div className="flex items-start gap-2">
            <Icon name="tabler:alert-triangle" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-foreground">{t("aiUnusualValue")}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {formatNumber(enteredValue!)}{unit}{" "}
                {anomalyType === "low"
                  ? `is ${formatNumber(Math.abs(enteredValue! - (avgValue ?? 0)))}${unit} below your average of ${formatNumber(avgValue ?? 0)}${unit}.`
                  : `is ${formatNumber(Math.abs(enteredValue! - (avgValue ?? 0)))}${unit} above your average of ${formatNumber(avgValue ?? 0)}${unit}.`}
                {" "}{t("aiUnusualValueDesc")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs flex-1"
              onClick={() => {
                setDismissed(true);
                onConfirmCorrect?.();
              }}
            >
              {t("aiConfirmCorrect")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-3 text-xs flex-1"
              onClick={() => {
                setDismissed(true);
                onReCheck?.();
              }}
            >
              {t("aiReCheck")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
