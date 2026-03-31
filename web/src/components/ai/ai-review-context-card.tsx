"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

type HistoricalValue = {
  period: string;
  value: number;
};

type Props = {
  submittedValue: number;
  historicalAvg: number;
  unit?: string;
  historicalValues?: HistoricalValue[];
  managerNote?: string | null;
  anomalyType?: "high" | "low";
  assessment?: string;
  deviationPercent?: number;
};

export function AiReviewContextCard({
  submittedValue,
  historicalAvg,
  unit = "",
  historicalValues = [],
  managerNote,
  anomalyType = "low",
  assessment,
  deviationPercent,
}: Props) {
  const { t, formatNumber } = useLocale();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const deviation = Math.abs(submittedValue - historicalAvg);
  const isLow = anomalyType === "low";

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15">
            <Icon name="tabler:sparkles" className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t("aiReviewContext")}</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              <Icon name="tabler:alert-triangle" className="h-3 w-3" />
              {t("aiAnomalyFlagged")}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <Icon name="tabler:x" className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            {t("aiSubmittedValue")}
          </p>
          <p className={cn(
            "text-lg font-bold",
            isLow ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400",
          )}>
            {formatNumber(submittedValue)}{unit ? ` ${unit}` : ""}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            {t("aiHistoricalAvg")}
          </p>
          <p className="text-lg font-bold text-foreground">
            {formatNumber(historicalAvg)}{unit ? ` ${unit}` : ""}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            {t("aiDeviation")}
          </p>
          <p className={cn(
            "text-lg font-bold",
            isLow ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400",
          )}>
            {isLow ? "−" : "+"}{formatNumber(deviation)}{unit ? ` ${unit}` : ""}
          </p>
        </div>
      </div>

      {historicalValues.length > 0 && (
        <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            {t("aiLastValues")}
          </p>
          <div className="flex flex-wrap gap-2" dir="ltr">
            {historicalValues.map((hv, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1">
                <span className="text-[10px] text-muted-foreground">{hv.period}:</span>
                <span className="text-xs font-semibold">{formatNumber(hv.value)}{unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {managerNote && (
        <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            {t("addNote")}
          </p>
          <p className="text-sm text-foreground leading-relaxed">{managerNote}</p>
        </div>
      )}

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1 font-semibold">
          {t("aiAssessmentLabel")}
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {assessment ?? (
            <>
              {isLow ? t("aiAnomalyUnusuallyLow") : t("aiAnomalyUnusuallyHigh")}
              {" "}
              {managerNote ? t("aiAnomalyWithNote") : t("aiAnomalyNoNote")}
            </>
          )}
        </p>
        {deviationPercent != null && deviationPercent > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {deviationPercent > 20 
              ? (deviationPercent > 20 ? "⚠️ Significant deviation" : "Within normal range")
              : ("Within normal range")
            }: {Math.round(deviationPercent)}%
          </p>
        )}
      </div>
    </div>
  );
}
