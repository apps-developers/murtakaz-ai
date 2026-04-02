"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import mermaid from "mermaid";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { useTheme } from "@/providers/theme-provider";
import { getStrategicPillarsOverview } from "@/actions/insights";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/charts/echart";

type PillarData = Awaited<ReturnType<typeof getStrategicPillarsOverview>>[number];

function ragHex(value: number | null): string {
  if (value === null) return "#64748b";
  if (value >= 80) return "#10b981";
  if (value >= 60) return "#f59e0b";
  return "#ef4444";
}

function ragClass(value: number | null, isDark: boolean): string {
  if (value === null) return isDark ? "fill-slate-600 stroke-slate-500" : "fill-slate-400 stroke-slate-500";
  if (value >= 80) return "fill-emerald-500 stroke-emerald-600";
  if (value >= 60) return "fill-amber-500 stroke-amber-600";
  return "fill-rose-500 stroke-rose-600";
}

export default function StrategyMapPage() {
  const { user, loading: authLoading } = useAuth();
  const { locale, t, tr, df } = useLocale();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [loading, setLoading] = useState(true);
  const [pillars, setPillars] = useState<PillarData[]>([]);
  const [viewMode, setViewMode] = useState<"tree" | "treemap">("tree");
  const [mounted, setMounted] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "default",
      securityLevel: "loose",
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: "basis",
      },
    });
  }, [isDark]);

  useEffect(() => {
    if (authLoading || !user) return;
    let isMounted = true;
    setLoading(true);
    void (async () => {
      try {
        const data = await getStrategicPillarsOverview();
        if (isMounted) setPillars(data);
      } catch (e) {
        console.error("Failed to load strategy map data", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [authLoading, user]);

  // Generate Mermaid diagram for strategic hierarchy
  const mermaidDiagram = useMemo(() => {
    if (!pillars.length) return "";
    const isAr = locale === "ar";

    const lines: string[] = [];
    const nodeStyles: string[] = [];
    let nodeId = 0;

    // Root node
    const rootId = `N${nodeId++}`;
    lines.push(`    ${rootId}("${isAr ? "الاستراتيجية" : "Strategy"}"):::rootNode`);
    nodeStyles.push(`    classDef rootNode fill:#3b82f6,stroke:#2563eb,stroke-width:3px,color:#fff`);

    pillars.forEach((p, pIdx) => {
      const pillarId = `N${nodeId++}`;
      const pTitle = (df(p.title, p.titleAr) || p.title).slice(0, 25);
      const pVal = p.value !== null ? ` (${Math.round(p.value)}%)` : "";
      lines.push(`    ${rootId} --> ${pillarId}`);
      lines.push(`    ${pillarId}("${pTitle}${pVal}"):::pillar${pIdx}`);
      nodeStyles.push(`    classDef pillar${pIdx} fill:${ragHex(p.value)},stroke:${ragHex(p.value)},stroke-width:2px,color:#fff`);

      p.objectives.forEach((o, oIdx) => {
        const objId = `N${nodeId++}`;
        const oTitle = (df(o.title, o.titleAr) || o.title).slice(0, 25);
        const oVal = o.value !== null ? ` (${Math.round(o.value)}%)` : "";
        lines.push(`    ${pillarId} --> ${objId}`);
        lines.push(`    ${objId}["${oTitle}${oVal}"]:::objective${pIdx}_${oIdx}`);
        nodeStyles.push(`    classDef objective${pIdx}_${oIdx} fill:${ragHex(o.value)},stroke:${ragHex(o.value)},stroke-width:1px,color:#fff`);

        o.kpis.forEach((k, kIdx) => {
          const kpiId = `N${nodeId++}`;
          const kTitle = (df(k.title, k.titleAr) || k.title).slice(0, 20);
          const kVal = k.value !== null && k.target ? Math.round((k.value / k.target) * 100) : null;
          const kDisplay = kVal !== null ? ` (${kVal}%)` : "";
          lines.push(`    ${objId} --> ${kpiId}`);
          lines.push(`    ${kpiId}(("${kTitle}${kDisplay}")):::kpi${pIdx}_${oIdx}_${kIdx}`);
          nodeStyles.push(`    classDef kpi${pIdx}_${oIdx}_${kIdx} fill:${ragHex(kVal)},stroke:${ragHex(kVal)},stroke-width:1px,color:#fff`);
        });
      });
    });

    return `flowchart TD
    direction ${isAr ? "RL" : "LR"}
    
    %% Nodes and connections
${lines.join("\n")}

    %% Styling
${nodeStyles.join("\n")}

    %% Link styling
    linkStyle default stroke:${isDark ? "#64748b" : "#94a3b8"},stroke-width:2px`;
  }, [pillars, locale, df, isDark]);

  // Render Mermaid diagram
  useEffect(() => {
    if (!mounted || viewMode !== "tree" || !mermaidRef.current || !mermaidDiagram) return;

    const renderDiagram = async () => {
      try {
        const { svg } = await mermaid.render("strategy-map", mermaidDiagram);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      } catch (error) {
        console.error("Failed to render mermaid diagram:", error);
      }
    };

    renderDiagram();
  }, [mermaidDiagram, viewMode, mounted]);

  // Treemap option for ECharts
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
            {viewMode === "tree" ? (
              <div
                ref={mermaidRef}
                className="rounded-xl border border-border overflow-hidden p-4 flex items-center justify-center"
                style={{
                  backgroundColor: isDark ? "#0d1117" : "#f8fafc",
                  minHeight: "500px",
                }}
              />
            ) : (
              <EChart
                option={treemapOption}
                height={Math.max(500, pillars.length * 120)}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
