"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrgEntitiesByTypeCode } from "@/actions/entities";
import { useLocale } from "@/providers/locale-provider";
import { RAGDonut, GaugeChart, AchievementBar, StackedStatusBar } from "@/components/charts/report-charts";
import { TrendingUp, TrendingDown, Minus, Target, AlertCircle, CheckCircle2 } from "lucide-react";

type EntityItem = Awaited<ReturnType<typeof getOrgEntitiesByTypeCode>>["items"][number];

function getLatestValue(entity: EntityItem): number | null {
  const latest = entity.values?.[0];
  if (!latest) return null;
  return latest.finalValue ?? latest.calculatedValue ?? latest.actualValue ?? null;
}

function calculateAchievement(entity: EntityItem): number | null {
  const value = getLatestValue(entity);
  const target = entity.targetValue;
  if (value === null || target === null || target === 0) return null;
  return Math.round((value / target) * 1000) / 10;
}

function getTrend(entity: EntityItem): "up" | "down" | "stable" {
  const values = entity.values ?? [];
  if (values.length < 2) return "stable";
  const current = values[0].finalValue ?? values[0].calculatedValue ?? values[0].actualValue;
  const previous = values[1].finalValue ?? values[1].calculatedValue ?? values[1].actualValue;
  if (current === null || current === undefined || previous === null || previous === undefined) return "stable";
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return "stable";
  return diff > 0 ? "up" : "down";
}

export function ExecutiveSummaryReport({ entityTypes }: { entityTypes: Array<{ code: string; name: string; nameAr: string | null }> }) {
  const { tr, locale } = useLocale();
  const [data, setData] = useState<Record<string, EntityItem[]>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const results: Record<string, EntityItem[]> = {};
    for (const et of entityTypes) {
      try {
        const res = await getOrgEntitiesByTypeCode({ entityTypeCode: et.code, page: 1, pageSize: 300 });
        results[et.code] = res.items;
      } catch {
        results[et.code] = [];
      }
    }
    setData(results);
    setLoading(false);
  }, [entityTypes]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const allEntities = Object.values(data).flat();
    const kpis = data["kpi"] ?? [];
    const objectives = data["objective"] ?? [];
    const initiatives = data["initiative"] ?? [];
    const pillars = data["pillar"] ?? [];

    const kpisWithAchievement = kpis.map(calculateAchievement).filter((a): a is number => a !== null);
    const avgKpiAchievement = kpisWithAchievement.length > 0
      ? Math.round(kpisWithAchievement.reduce((a, b) => a + b, 0) / kpisWithAchievement.length)
      : null;

    const onTrack = kpisWithAchievement.filter((a) => a >= 100).length;
    const atRisk = kpisWithAchievement.filter((a) => a >= 75 && a < 100).length;
    const offTrack = kpisWithAchievement.filter((a) => a < 75).length;
    const noData = kpis.length - kpisWithAchievement.length;

    const activeInitiatives = initiatives.filter((i) => i.status === "ACTIVE").length;
    const atRiskInitiatives = initiatives.filter((i) => i.status === "AT_RISK").length;
    const completedInitiatives = initiatives.filter((i) => i.status === "COMPLETED").length;

    return {
      totalKpis: kpis.length,
      avgAchievement: avgKpiAchievement,
      onTrack,
      atRisk,
      offTrack,
      noData,
      totalInitiatives: initiatives.length,
      activeInitiatives,
      atRiskInitiatives,
      completedInitiatives,
      totalObjectives: objectives.length,
      totalPillars: pillars.length,
    };
  }, [data]);

  const pillarStats = useMemo(() => {
    const pillars = data["pillar"] ?? [];
    return pillars.map((p) => {
      const achievement = calculateAchievement(p);
      return {
        name: locale === "ar" ? (p.titleAr ?? p.title) : p.title,
        achievement: achievement ?? 0,
        target: p.targetValue ?? 0,
      };
    });
  }, [data, locale]);

  const initiativeStatusData = useMemo(() => {
    const initiatives = data["initiative"] ?? [];
    return {
      active: initiatives.filter((i) => i.status === "ACTIVE").length,
      atRisk: initiatives.filter((i) => i.status === "AT_RISK").length,
      completed: initiatives.filter((i) => i.status === "COMPLETED").length,
      planned: initiatives.filter((i) => i.status === "PLANNED").length,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{tr("Total KPIs", "إجمالي المؤشرات")}</p>
                <p className="text-3xl font-bold mt-2">{stats.totalKpis}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{tr("Avg Achievement", "متوسط الإنجاز")}</p>
                <p className="text-3xl font-bold mt-2">{stats.avgAchievement ?? "—"}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{tr("Active Initiatives", "المبادرات النشطة")}</p>
                <p className="text-3xl font-bold mt-2">{stats.activeInitiatives}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.atRiskInitiatives > 0 && `${stats.atRiskInitiatives} ${tr("at risk", "في خطر")}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{tr("Strategic Objectives", "الأهداف الاستراتيجية")}</p>
                <p className="text-3xl font-bold mt-2">{stats.totalObjectives}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tr("KPI Performance Status", "حالة أداء المؤشرات")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RAGDonut
              onTrack={stats.onTrack}
              atRisk={stats.atRisk}
              offTrack={stats.offTrack}
              height={240}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tr("Overall Performance", "الأداء العام")}</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <GaugeChart
              value={stats.avgAchievement ?? 0}
              title={tr("Achievement", "الإنجاز")}
              height={200}
            />
          </CardContent>
        </Card>
      </div>

      {/* Pillar Achievement */}
      {pillarStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tr("Pillar Achievement", "إنجاز الركائز")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AchievementBar
              categories={pillarStats.map((p) => p.name)}
              values={pillarStats.map((p) => p.achievement)}
              targets={pillarStats.map((p) => 100)}
              height={280}
            />
          </CardContent>
        </Card>
      )}

      {/* Initiative Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tr("Initiative Status Distribution", "توزيع حالة المبادرات")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg bg-emerald-500/10">
              <p className="text-2xl font-bold text-emerald-600">{initiativeStatusData.active}</p>
              <p className="text-sm text-muted-foreground">{tr("Active", "نشط")}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-amber-500/10">
              <p className="text-2xl font-bold text-amber-600">{initiativeStatusData.atRisk}</p>
              <p className="text-sm text-muted-foreground">{tr("At Risk", "في خطر")}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-500/10">
              <p className="text-2xl font-bold text-blue-600">{initiativeStatusData.completed}</p>
              <p className="text-sm text-muted-foreground">{tr("Completed", "مكتمل")}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-500/10">
              <p className="text-2xl font-bold text-gray-600">{initiativeStatusData.planned}</p>
              <p className="text-sm text-muted-foreground">{tr("Planned", "مخطط")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
