"use client";

import { graphic, type EChartsOption } from "echarts";
import { EChart } from "@/components/charts/echart";
import { useTheme } from "@/providers/theme-provider";
import { useLocale } from "@/providers/locale-provider";

function axisStyles(isDark: boolean) {
  return {
    axisLine: { lineStyle: { color: isDark ? "rgba(148,163,184,0.22)" : "rgba(15,23,42,0.16)" } },
    axisTick: { show: false },
    axisLabel: { color: isDark ? "rgba(226,232,240,0.70)" : "rgba(15,23,42,0.70)" },
    splitLine: { lineStyle: { color: isDark ? "rgba(148,163,184,0.10)" : "rgba(15,23,42,0.08)" } },
  } as const;
}

function tooltipStyles(isDark: boolean) {
  return {
    backgroundColor: isDark ? "rgba(2,6,23,0.92)" : "rgba(255,255,255,0.95)",
    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(2,6,23,0.10)",
    textStyle: { color: isDark ? "rgba(226,232,240,0.92)" : "rgba(15,23,42,0.92)", fontSize: 12 },
    extraCssText: "border-radius: 14px; box-shadow: 0 18px 60px rgba(0,0,0,0.28); padding: 10px 12px;",
  } as const;
}

export function RAGDonut({
  onTrack,
  atRisk,
  offTrack,
  height = 240,
}: {
  onTrack: number;
  atRisk: number;
  offTrack: number;
  height?: number;
}) {
  const { theme } = useTheme();
  const { tr, locale } = useLocale();
  const isDark = theme === "dark";
  const isRTL = locale === "ar";
  
  const data = [
    { value: onTrack, name: tr("On Track", "في المسار"), itemStyle: { color: "#10b981" } },
    { value: atRisk, name: tr("At Risk", "في خطر"), itemStyle: { color: "#f59e0b" } },
    { value: offTrack, name: tr("Off Track", "خارج المسار"), itemStyle: { color: "#ef4444" } },
  ].filter(d => d.value > 0);
  
  const option: EChartsOption = {
    tooltip: { 
      trigger: "item", 
      confine: true, 
      ...tooltipStyles(isDark),
      formatter: "{b}: {c} ({d}%)",
    },
    legend: { 
      bottom: 0, 
      textStyle: { color: isDark ? "rgba(226,232,240,0.72)" : "rgba(15,23,42,0.70)" },
      ...(isRTL && { right: "center" }),
    },
    series: [
      {
        type: "pie",
        radius: ["50%", "75%"],
        avoidLabelOverlap: true,
        itemStyle: { 
          borderRadius: 10, 
          borderColor: isDark ? "rgba(2,6,23,0.35)" : "rgba(255,255,255,0.65)", 
          borderWidth: 2,
        },
        label: { 
          show: true, 
          formatter: "{b}\n{c}",
          color: isDark ? "rgba(226,232,240,0.92)" : "rgba(15,23,42,0.92)",
        },
        emphasis: { scale: true, scaleSize: 6 },
        data,
      },
    ],
  };
  return <EChart option={option} height={height} />;
}

export function AchievementBar({
  categories,
  values,
  targets,
  height = 600,
}: {
  categories: string[];
  values: number[];
  targets?: number[];
  height?: number;
}) {
  const { theme } = useTheme();
  const { tr, locale } = useLocale();
  const isDark = theme === "dark";
  const isRTL = locale === "ar";
  const base = axisStyles(isDark);

  // Truncate long labels for better display - word wrap for very long names
  const formatLabel = (name: string) => {
    if (name.length <= 25) return name;
    // Insert line breaks for very long text
    const words = name.split(" ");
    if (words.length > 3) {
      const mid = Math.ceil(words.length / 2);
      return words.slice(0, mid).join(" ") + "\n" + words.slice(mid).join(" ");
    }
    return name.substring(0, 30) + "...";
  };
  const formattedCategories = categories.map(formatLabel);

  const series: EChartsOption["series"] = [
    {
      type: "bar",
      name: tr("Achievement %", "الإنجاز %"),
      data: values,
      barMaxWidth: 70,
      barMinWidth: 50,
      barGap: "15%",
      itemStyle: {
        borderRadius: [10, 10, 0, 0],
        color: (params: any) => {
          const val = params.value as number;
          if (val >= 100) return "#10b981";
          if (val >= 75) return "#f59e0b";
          return "#ef4444";
        },
      },
      label: {
        show: true,
        position: "top",
        formatter: "{c}%",
        fontSize: 14,
        fontWeight: "bold",
        color: isDark ? "rgba(226,232,240,0.92)" : "rgba(15,23,42,0.92)",
        distance: 10,
      },
    },
  ];

  if (targets) {
    series.push({
      type: "line",
      name: tr("Target", "الهدف"),
      data: targets,
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: { width: 2, color: "#6366f1", type: "dashed" },
      itemStyle: { color: "#6366f1" },
    });
  }

  // Dynamic rotation - always 45 degrees for readability
  const bottomMargin = 220;

  const option: EChartsOption = {
    grid: { 
      left: isRTL ? 50 : 40, 
      right: isRTL ? 40 : 50, 
      top: 80, 
      bottom: bottomMargin, 
      containLabel: false 
    },
    xAxis: { 
      type: "category", 
      data: formattedCategories, 
      ...base, 
      axisLabel: { 
        ...base.axisLabel, 
        interval: 0,
        rotate: 45,
        fontSize: 12,
        fontWeight: 500,
        width: isRTL ? 180 : 160,
        overflow: "break",
        lineHeight: 16,
      },
      axisTick: { alignWithLabel: true },
    },
    yAxis: { 
      type: "value", 
      ...base,
      max: 200,
      min: 0,
      axisLabel: { 
        formatter: "{value}%",
        fontSize: 12,
        margin: 12,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: isDark ? "rgba(148,163,184,0.2)" : "rgba(15,23,42,0.15)",
          type: "dashed",
          width: 1,
        },
      },
    },
    series,
    tooltip: {
      trigger: "axis",
      confine: true,
      ...tooltipStyles(isDark),
      formatter: (params: any) => {
        const fullName = categories[params[0].dataIndex];
        let result = `<strong>${fullName}</strong><br/>`;
        params.forEach((p: any) => {
          result += `${p.marker} ${p.seriesName}: ${p.value}%<br/>`;
        });
        return result;
      },
    },
    legend: {
      bottom: 10,
      ...(isRTL ? { right: "center" } : { left: "center" }),
      textStyle: { 
        color: isDark ? "rgba(226,232,240,0.72)" : "rgba(15,23,42,0.70)",
        fontSize: 13,
        fontWeight: 500,
      },
      itemWidth: 20,
      itemHeight: 14,
    },
  };

  return <EChart option={option} height={height} />;
}

export function TrendLine({
  dates,
  values,
  target,
  height = 260,
  title,
}: {
  dates: string[];
  values: number[];
  target?: number;
  height?: number;
  title?: string;
}) {
  const { theme } = useTheme();
  const { tr, locale } = useLocale();
  const isDark = theme === "dark";
  const isRTL = locale === "ar";
  const base = axisStyles(isDark);

  const series: EChartsOption["series"] = [
    {
      type: "line",
      name: tr("Actual", "الفعلي"),
      data: values,
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: { width: 2.5, color: "#3b82f6" },
      itemStyle: { color: "#3b82f6", borderColor: isDark ? "rgba(2,6,23,0.6)" : "rgba(255,255,255,0.9)", borderWidth: 2 },
      areaStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: isDark ? "rgba(59,130,246,0.28)" : "rgba(59,130,246,0.20)" },
          { offset: 1, color: "rgba(0,0,0,0)" },
        ]),
      },
    },
  ];

  if (target !== undefined) {
    series.push({
      type: "line",
      name: tr("Target", "الهدف"),
      data: dates.map(() => target),
      smooth: false,
      symbol: "none",
      lineStyle: { width: 2, color: "#10b981", type: "dashed" },
    });
  }

  const option: EChartsOption = {
    grid: { left: isRTL ? 20 : 18, right: isRTL ? 18 : 20, top: title ? 50 : 30, bottom: 50, containLabel: true },
    title: title ? {
      text: title,
      left: "center",
      top: 10,
      textStyle: {
        fontSize: 14,
        fontWeight: 600,
        color: isDark ? "rgba(226,232,240,0.92)" : "rgba(15,23,42,0.92)",
      },
    } : undefined,
    xAxis: {
      type: "category",
      data: dates,
      ...base,
      axisLabel: { ...base.axisLabel, interval: "auto", rotate: dates.length > 8 ? 30 : 0 },
    },
    yAxis: { type: "value", ...base },
    series,
    tooltip: {
      trigger: "axis",
      confine: true,
      ...tooltipStyles(isDark),
    },
    legend: {
      bottom: 0,
      ...(isRTL ? { right: 10 } : { left: 10 }),
      textStyle: { color: isDark ? "rgba(226,232,240,0.72)" : "rgba(15,23,42,0.70)" },
    },
  };

  return <EChart option={option} height={height} />;
}

export function StackedStatusBar({
  categories,
  data,
  height = 300,
}: {
  categories: string[];
  data: {
    active: number[];
    atRisk: number[];
    completed: number[];
    planned: number[];
  };
  height?: number;
}) {
  const { theme } = useTheme();
  const { tr, locale } = useLocale();
  const isDark = theme === "dark";
  const isRTL = locale === "ar";
  const base = axisStyles(isDark);

  const option: EChartsOption = {
    grid: { left: isRTL ? 20 : 10, right: isRTL ? 10 : 20, top: 40, bottom: 60, containLabel: true },
    xAxis: { 
      type: "category", 
      data: categories, 
      ...base,
      axisLabel: { 
        ...base.axisLabel, 
        interval: 0,
        rotate: categories.length > 4 ? 30 : 0,
      },
    },
    yAxis: { type: "value", ...base },
    series: [
      {
        type: "bar",
        name: tr("Active", "نشط"),
        stack: "total",
        data: data.active,
        itemStyle: { color: "#10b981", borderRadius: [0, 0, 0, 0] },
      },
      {
        type: "bar",
        name: tr("At Risk", "في خطر"),
        stack: "total",
        data: data.atRisk,
        itemStyle: { color: "#f59e0b", borderRadius: [0, 0, 0, 0] },
      },
      {
        type: "bar",
        name: tr("Completed", "مكتمل"),
        stack: "total",
        data: data.completed,
        itemStyle: { color: "#3b82f6", borderRadius: [0, 0, 0, 0] },
      },
      {
        type: "bar",
        name: tr("Planned", "مخطط"),
        stack: "total",
        data: data.planned,
        itemStyle: { color: "#6b7280", borderRadius: [8, 8, 0, 0] },
      },
    ],
    tooltip: {
      trigger: "axis",
      confine: true,
      ...tooltipStyles(isDark),
    },
    legend: {
      top: 0,
      ...(isRTL ? { right: 10 } : { left: 10 }),
      textStyle: { color: isDark ? "rgba(226,232,240,0.72)" : "rgba(15,23,42,0.70)" },
    },
  };

  return <EChart option={option} height={height} />;
}

export function GaugeChart({
  value,
  title,
  height = 200,
}: {
  value: number;
  title: string;
  height?: number;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const color = value >= 90 ? "#10b981" : value >= 75 ? "#f59e0b" : "#ef4444";

  const option: EChartsOption = {
    series: [
      {
        type: "gauge",
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 5,
        itemStyle: {
          color,
        },
        progress: {
          show: true,
          roundCap: true,
          width: 18,
        },
        pointer: {
          icon: "path://M12.8,0.7l12,40.1H0.7l12-40.1",
          length: "12%",
          width: 10,
          offsetCenter: [0, "-60%"],
          itemStyle: {
            color: "auto",
          },
        },
        axisLine: {
          roundCap: true,
          lineStyle: {
            width: 18,
            color: [[1, isDark ? "rgba(148,163,184,0.2)" : "rgba(15,23,42,0.1)"]],
          },
        },
        axisTick: {
          splitNumber: 2,
          lineStyle: {
            width: 2,
            color: isDark ? "rgba(148,163,184,0.5)" : "rgba(15,23,42,0.3)",
          },
        },
        splitLine: {
          length: 12,
          lineStyle: {
            width: 3,
            color: isDark ? "rgba(148,163,184,0.5)" : "rgba(15,23,42,0.3)",
          },
        },
        axisLabel: {
          distance: 25,
          color: isDark ? "rgba(226,232,240,0.70)" : "rgba(15,23,42,0.70)",
          fontSize: 12,
        },
        title: {
          show: true,
          offsetCenter: [0, "30%"],
          fontSize: 14,
          fontWeight: 600,
          color: isDark ? "rgba(226,232,240,0.92)" : "rgba(15,23,42,0.92)",
        },
        detail: {
          valueAnimation: true,
          fontSize: 24,
          fontWeight: 700,
          offsetCenter: [0, "-10%"],
          formatter: "{value}%",
          color: "auto",
        },
        data: [
          {
            value,
            name: title,
          },
        ],
      },
    ],
  };

  return <EChart option={option} height={height} />;
}
