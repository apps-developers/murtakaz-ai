"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EChart } from "@/components/charts/echart";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { useTheme } from "@/providers/theme-provider";
import { getStrategicPillarsOverview } from "@/actions/insights";

type PillarData = Awaited<ReturnType<typeof getStrategicPillarsOverview>>[number];

function ragHex(value: number | null): string {
  if (value === null) return "#64748b";
  if (value >= 80) return "#10b981";
  if (value >= 60) return "#f59e0b";
  return "#ef4444";
}

export default function StrategyMapPage() {
  const { user, loading: authLoading } = useAuth();
  const { locale, t, tr, df } = useLocale();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [loading, setLoading] = useState(true);
  const [pillars, setPillars] = useState<PillarData[]>([]);
  const [viewMode, setViewMode] = useState<"tree" | "treemap">("tree");

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    setLoading(true);
    void (async () => {
      try {
        const data = await getStrategicPillarsOverview();
        if (mounted) setPillars(data);
      } catch (e) {
        console.error("Failed to load strategy map data", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [authLoading, user]);

  const treeOption = useMemo<EChartsOption>(() => {
    const isAr = locale === "ar";

    const children = pillars.map((p) => ({
      name: df(p.title, p.titleAr) || p.title,
      value: p.value,
      itemStyle: { color: ragHex(p.value), borderColor: ragHex(p.value) },
      label: {
        color: isDark ? "#e2e8f0" : "#0f172a",
      },
      children: p.objectives.map((o) => ({
        name: df(o.title, o.titleAr) || o.title,
        value: o.value,
        itemStyle: { color: ragHex(o.value), borderColor: ragHex(o.value) },
        label: {
          color: isDark ? "#e2e8f0" : "#0f172a",
        },
        children: o.kpis.map((k) => ({
          name: df(k.title, k.titleAr) || k.title,
          value: k.value,
          itemStyle: { color: ragHex(k.value !== null && k.target ? (k.value / k.target) * 100 : k.value), borderColor: ragHex(k.value !== null && k.target ? (k.value / k.target) * 100 : k.value) },
          label: {
            color: isDark ? "#e2e8f0" : "#0f172a",
          },
        })),
      })),
    }));

    return {
      tooltip: {
        trigger: "item",
        triggerOn: "mousemove",
        backgroundColor: isDark ? "rgba(2,6,23,0.92)" : "rgba(255,255,255,0.95)",
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(2,6,23,0.10)",
        textStyle: { color: isDark ? "#e2e8f0" : "#0f172a", fontSize: 12 },
        formatter: ((params: unknown) => {
          const p = params as { name?: string; value?: unknown };
          const val = typeof p.value === "number" ? `${Math.round(p.value * 10) / 10}` : "—";
          return `<strong>${p.name || ""}</strong><br/>${isAr ? "القيمة" : "Value"}: ${val}`;
        }) as unknown as string,
      },
      series: [
        {
          type: "tree",
          data: [
            {
              name: isAr ? "الاستراتيجية" : "Strategy",
              itemStyle: { color: "#3b82f6", borderColor: "#3b82f6" },
              label: { color: isDark ? "#e2e8f0" : "#0f172a" },
              children,
            },
          ],
          top: "5%",
          left: isAr ? "8%" : "8%",
          bottom: "5%",
          right: isAr ? "25%" : "25%",
          symbol: "roundRect",
          symbolSize: [14, 14],
          orient: isAr ? "RL" : "LR",
          layout: "orthogonal",
          edgeShape: "curve",
          edgeForkPosition: "50%",
          initialTreeDepth: 2,
          lineStyle: {
            width: 2,
            color: isDark ? "rgba(148,163,184,0.25)" : "rgba(15,23,42,0.15)",
            curveness: 0.5,
          },
          label: {
            position: isAr ? "right" : "left",
            verticalAlign: "middle",
            align: isAr ? "left" : "right",
            fontSize: 11,
            fontWeight: 500,
            distance: 8,
            width: 120,
            overflow: "truncate",
          },
          leaves: {
            label: {
              position: isAr ? "left" : "right",
              align: isAr ? "right" : "left",
            },
          },
          expandAndCollapse: true,
          animationDuration: 550,
          animationDurationUpdate: 750,
        },
      ],
    };
  }, [pillars, locale, df, isDark]);

  const treemapOption = useMemo<EChartsOption>(() => {
    return {
      tooltip: {
        backgroundColor: isDark ? "rgba(2,6,23,0.92)" : "rgba(255,255,255,0.95)",
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(2,6,23,0.10)",
        textStyle: { color: isDark ? "#e2e8f0" : "#0f172a", fontSize: 12 },
      },
      series: [
        {
          type: "treemap",
          width: "95%",
          height: "90%",
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          levels: [
            {
              itemStyle: { borderColor: isDark ? "#1e293b" : "#e2e8f0", borderWidth: 3, gapWidth: 3 },
            },
            {
              itemStyle: { borderColor: isDark ? "#334155" : "#cbd5e1", borderWidth: 2, gapWidth: 2 },
            },
            {
              itemStyle: { borderColor: isDark ? "#475569" : "#94a3b8", borderWidth: 1, gapWidth: 1 },
            },
          ],
          data: pillars.map((p) => ({
            name: df(p.title, p.titleAr) || p.title,
            value: Math.max(p.kpiCount, 1),
            itemStyle: { color: ragHex(p.value) },
            children: p.objectives.map((o) => ({
              name: df(o.title, o.titleAr) || o.title,
              value: Math.max(o.kpiCount, 1),
              itemStyle: { color: ragHex(o.value) },
              children: o.kpis.map((k) => ({
                name: df(k.title, k.titleAr) || k.title,
                value: 1,
                itemStyle: { color: ragHex(k.value !== null && k.target ? (k.value / k.target) * 100 : k.value) },
              })),
            })),
          })),
          label: {
            show: true,
            formatter: "{b}",
            fontSize: 11,
            color: "#fff",
            textShadowColor: "rgba(0,0,0,0.5)",
            textShadowBlur: 2,
          },
        },
      ],
    };
  }, [pillars, df, isDark]);

  if (authLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("noActiveSession")}</p>
        <Link
          href={`/${locale}/auth/login`}
          className="mt-3 inline-flex text-sm font-semibold text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary/70"
        >
          {t("goToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tr("Strategy Map", "خريطة الاستراتيجية")}
        subtitle={tr("Visual hierarchy of pillars, objectives, and KPIs", "التسلسل الهرمي المرئي للركائز والأهداف ومؤشرات الأداء")}
        icon={<Icon name="tabler:hierarchy-3" className="h-5 w-5" />}
        breadcrumbs={[{ label: tr("Strategy Map", "خريطة الاستراتيجية") }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "tree" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("tree")}
            >
              <Icon name="tabler:binary-tree" className="me-2 h-4 w-4" />
              {tr("Tree", "شجرة")}
            </Button>
            <Button
              variant={viewMode === "treemap" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("treemap")}
            >
              <Icon name="tabler:chart-treemap" className="me-2 h-4 w-4" />
              {tr("Treemap", "خريطة شجرية")}
            </Button>
          </div>
        }
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">{tr("On Track (≥80%)", "على المسار (≥80%)")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">{tr("At Risk (60-79%)", "معرض للخطر (60-79%)")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-rose-500" />
          <span className="text-muted-foreground">{tr("Off Track (<60%)", "خارج المسار (<60%)")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-slate-500" />
          <span className="text-muted-foreground">{tr("No Data", "لا توجد بيانات")}</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
      ) : pillars.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
      ) : (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              {viewMode === "tree"
                ? tr("Strategic Hierarchy", "التسلسل الاستراتيجي")
                : tr("Performance Treemap", "خريطة الأداء")}
            </CardTitle>
            <CardDescription>
              {viewMode === "tree"
                ? tr("Click nodes to expand/collapse branches", "انقر على العقد لتوسيع/طي الفروع")
                : tr("Size represents KPI count, color represents performance", "الحجم يمثل عدد المؤشرات، واللون يمثل الأداء")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EChart
              option={viewMode === "tree" ? treeOption : treemapOption}
              height={Math.max(500, pillars.length * 120)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
