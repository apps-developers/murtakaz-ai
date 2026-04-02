"use client";

import { type EChartsOption } from "echarts";
import { useMemo } from "react";
import { EChart } from "@/components/charts/echart";
import { useLocale } from "@/providers/locale-provider";
import { useTheme } from "@/providers/theme-provider";

type KpiGaugeProps = {
  value: number | null | undefined;
  target: number | null | undefined;
  unit?: string | null;
  height?: number;
  withCard?: boolean;
  label?: string; // optional subtitle under the number
};

export function KpiGauge({
  value,
  target,
  unit,
  height = 200,
  withCard = true,
  label,
}: KpiGaugeProps) {
  const { t } = useLocale();
  const { theme } = useTheme();
  const effectiveLabel = label ?? t("current");
  const option = useMemo<EChartsOption>(() => {
    const hasValue = typeof value === "number" && Number.isFinite(value);
    const safeValue = hasValue ? value : 0;
    const safeTarget =
      typeof target === "number" && Number.isFinite(target) && target > 0 ? target : null;

    const isPercentUnit = typeof unit === "string" && (unit.includes("%") || unit.includes("٪"));
    const effectiveTarget = safeTarget ?? (isPercentUnit ? 100 : null);
    const max = effectiveTarget ?? (isPercentUnit ? 100 : Math.max(100, Math.abs(safeValue) * 1.25));
    const ratio = effectiveTarget && hasValue ? safeValue / effectiveTarget : null;

    // thresholds
    const red = 0.6;
    const amber = 0.9;

    const isDark = theme === "dark";

    // surfaces / text
    const textStrong = isDark ? "#e5e7eb" : "#0f172a";
    const textMuted = isDark ? "rgba(226,232,240,0.72)" : "rgba(15,23,42,0.65)";
    const gridLine = isDark ? "rgba(226,232,240,0.18)" : "rgba(15,23,42,0.12)";
    const track = isDark ? "rgba(148,163,184,0.14)" : "rgba(15,23,42,0.08)";

    // status colors
    const cRed = "#ef4444";
    const cAmber = "#f59e0b";
    const cGreen = "#10b981";
    const cBlue = "#60a5fa";

    const status =
      !hasValue
        ? "—"
        : ratio === null
          ? "—"
          : ratio >= amber
            ? t("onTrack")
            : ratio >= red
              ? t("atRisk")
              : effectiveTarget
                ? t("offTrack")
                : "—";

    const statusColor =
      !hasValue ? cBlue : ratio === null ? cBlue : ratio >= amber ? cGreen : ratio >= red ? cAmber : cRed;

    const fmt = (n: number) => {
      if (!Number.isFinite(n)) return "0";
      // nice compact formatting for big numbers
      const abs = Math.abs(n);
      if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
      if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
      // keep integers clean
      return Number.isInteger(n) ? `${n}` : `${n.toFixed(2)}`;
    };

    return {
      backgroundColor: "transparent",
      animationDuration: 850,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        confine: true,
        appendToBody: true,
        backgroundColor: isDark ? "rgba(2,6,23,0.92)" : "rgba(255,255,255,0.95)",
        borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(2,6,23,0.10)",
        borderWidth: 1,
        textStyle: { color: textStrong, fontSize: 12 },
        extraCssText:
          "border-radius: 14px; box-shadow: 0 18px 60px rgba(0,0,0,0.28); padding: 10px 12px;",
        formatter: () => {
          const v = safeValue;
          const targetVal = effectiveTarget;
          const pct = targetVal && hasValue ? `${Math.round((v / targetVal) * 100)}%` : "—";
          return `
            <div style="display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; justify-content:space-between; gap:14px;">
                <span style="opacity:.75;">${t("value")}</span>
                <b>${hasValue ? `${fmt(v)}${unit ?? ""}` : "—"}</b>
              </div>
              ${
                targetVal
                  ? `<div style="display:flex; justify-content:space-between; gap:14px;">
                       <span style="opacity:.75;">${t("target")}</span>
                       <b>${fmt(targetVal)}${unit ?? ""}</b>
                     </div>
                     <div style="display:flex; justify-content:space-between; gap:14px;">
                       <span style="opacity:.75;">${t("progress")}</span>
                       <b>${pct}</b>
                     </div>`
                  : ""
              }
              <div style="margin-top:2px; display:flex; align-items:center; gap:8px;">
                <span style="width:8px; height:8px; border-radius:999px; background:${statusColor}; display:inline-block;"></span>
                <span style="opacity:.85;">${status}</span>
              </div>
            </div>
          `;
        },
      },
      series: [
        // Outer “halo” ring for depth
        {
          type: "gauge",
          min: 0,
          max,
          startAngle: 210,
          endAngle: -30,
          radius: "104%",
          center: ["50%", "58%"],
          pointer: { show: false },
          progress: { show: false },
          axisLine: {
            lineStyle: {
              width: 2,
              color: [[1, isDark ? "rgba(226,232,240,0.10)" : "rgba(15,23,42,0.10)"]],
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: { show: false },
          title: { show: false },
          silent: true,
          z: 1,
        },

        // Main gauge
        {
          type: "gauge",
          min: 0,
          max,
          startAngle: 210,
          endAngle: -30,
          radius: "100%",
          center: ["50%", "58%"],
          splitNumber: 4,

          // Track
          axisLine: {
            lineStyle: {
              width: 14,
              color: [[1, track]],
              cap: "round",
            },
          },

          // Progress
          progress: {
            show: true,
            width: 14,
            roundCap: true,
            itemStyle: {
              color: statusColor,
            },
          },

          // Pointer + anchor (more modern than a thick needle)
          pointer: {
            icon: "path://M2,0 L-2,0 L0,-70 Z",
            width: 10,
            length: "55%",
            itemStyle: {
              color: isDark ? "rgba(226,232,240,0.85)" : "rgba(15,23,42,0.82)",
            },
          },
          anchor: {
            show: true,
            showAbove: true,
            size: 12,
            itemStyle: {
              color: isDark ? "rgba(2,6,23,0.6)" : "rgba(255,255,255,0.8)",
              borderWidth: 2,
              borderColor: statusColor,
            },
          },

          // Ticks / splits
          axisTick: {
            distance: -20,
            splitNumber: 2,
            lineStyle: { color: gridLine, width: 1 },
          },
          splitLine: {
            distance: -20,
            length: 12,
            lineStyle: { color: isDark ? "rgba(226,232,240,0.30)" : "rgba(15,23,42,0.20)", width: 2 },
          },
          axisLabel: {
            color: textMuted,
            distance: 18,
            fontSize: 11,
            formatter: (v: number) => {
              // Only show key labels (0, target-ish, max) to keep it clean
              if (Math.abs(v - 0) < 1e-9) return "0";
              if (effectiveTarget && Math.abs(v - effectiveTarget) / max < 0.02) return "T";
              if (Math.abs(v - max) / max < 0.02) return fmt(max);
              return "";
            },
          },

          // Center text (value + unit + label + status)
          detail: {
            valueAnimation: true,
            offsetCenter: [0, "52%"],
            formatter: (val: number) => {
              const v = Number.isFinite(val) ? val : 0;
              const u = unit ?? "";
              const tgtLine = effectiveTarget ? `{muted|${t("target")} ${fmt(effectiveTarget)}${u}}` : `{muted| }`;
              return [
                `{value|${hasValue ? `${fmt(v)}${u}` : "—"}}`,
                `{label|${effectiveLabel}}`,
                tgtLine,
                `{status|${status}}`,
              ].join("\n");
            },
            rich: {
              value: {
                color: textStrong,
                fontSize: 22,
                fontWeight: 800,
                lineHeight: 26,
              },
              label: {
                color: textMuted,
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 16,
              },
              muted: {
                color: textMuted,
                fontSize: 10,
                lineHeight: 14,
              },
              status: {
                color: statusColor,
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 14,
              },
            },
          },

          title: { show: false },
          data: [{ value: safeValue }],
          z: 2,
        },
      ],
    };
  }, [effectiveLabel, target, theme, unit, value, t]);

  const Chart = <EChart option={option} height={height} />;

  if (!withCard) return Chart;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-3">
      {/* soft glow */}
      <div className="hidden" />
      {Chart}
    </div>
  );
}
