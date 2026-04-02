"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrgEntitiesByTypeCode } from "@/actions/entities";
import { useLocale } from "@/providers/locale-provider";
import { TrendLine } from "@/components/charts/report-charts";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type EntityItem = Awaited<ReturnType<typeof getOrgEntitiesByTypeCode>>["items"][number];

function getLatestValue(entity: EntityItem): number | null {
  const latest = entity.values?.[0];
  if (!latest) return null;
  return latest.finalValue ?? latest.calculatedValue ?? latest.actualValue ?? null;
}

function getValuesHistory(entity: EntityItem): Array<{ date: string; value: number }> {
  return (entity.values ?? [])
    .filter((v) => v.finalValue !== null || v.calculatedValue !== null || v.actualValue !== null)
    .map((v) => ({
      date: new Date(v.createdAt).toLocaleDateString(),
      value: (v.finalValue ?? v.calculatedValue ?? v.actualValue ?? 0) as number,
    }))
    .reverse();
}

function calculateAchievement(value: number | null, target: number | null): number | null {
  if (value === null || target === null || target === 0) return null;
  return Math.round((value / target) * 1000) / 10;
}

function getTrendDirection(entity: EntityItem): "up" | "down" | "stable" {
  const values = entity.values ?? [];
  if (values.length < 2) return "stable";
  const current = values[0].finalValue ?? values[0].calculatedValue ?? values[0].actualValue;
  const previous = values[1].finalValue ?? values[1].calculatedValue ?? values[1].actualValue;
  if (current === null || current === undefined || previous === null || previous === undefined) return "stable";
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return "stable";
  return diff > 0 ? "up" : "down";
}

interface KpiCardProps {
  entity: EntityItem;
  locale: string;
}

function KpiCard({ entity, locale }: KpiCardProps) {
  const { tr } = useLocale();
  const value = getLatestValue(entity);
  const target = entity.targetValue;
  const achievement = calculateAchievement(value, target);
  const history = getValuesHistory(entity);
  const trend = getTrendDirection(entity);

  const statusColor = achievement === null
    ? "bg-gray-500"
    : achievement >= 100
      ? "bg-emerald-500"
      : achievement >= 75
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <Card className="overflow-hidden">
      <div className={cn("h-1", statusColor)} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">
              {locale === "ar" ? (entity.titleAr ?? entity.title) : entity.title}
            </h4>
            {entity.key && <p className="text-xs text-muted-foreground">{entity.key}</p>}
          </div>
          <div className="flex items-center gap-1 text-xs">
            {trend === "up" && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
            {trend === "down" && <ArrowDownRight className="h-4 w-4 text-rose-500" />}
            {trend === "stable" && <Minus className="h-4 w-4 text-gray-400" />}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">{tr("Value", "القيمة")}</p>
            <p className="font-semibold text-sm">{value !== null ? value.toFixed(1) : "—"}</p>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">{tr("Target", "الهدف")}</p>
            <p className="font-semibold text-sm">{target !== null ? target.toFixed(1) : "—"}</p>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">{tr("Achieve", "الإنجاز")}</p>
            <p className={cn(
              "font-semibold text-sm",
              achievement === null
                ? "text-muted-foreground"
                : achievement >= 100
                  ? "text-emerald-600"
                  : achievement >= 75
                    ? "text-amber-600"
                    : "text-rose-600"
            )}>
              {achievement !== null ? `${achievement}%` : "—"}
            </p>
          </div>
        </div>

        {history.length > 1 && (
          <div className="h-16">
            <TrendLine
              dates={history.map((h) => h.date)}
              values={history.map((h) => h.value)}
              target={target ?? undefined}
              height={64}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KpiPerformanceReport({ entityTypes }: { entityTypes: Array<{ code: string; name: string; nameAr: string | null }> }) {
  const { tr, locale } = useLocale();
  const [data, setData] = useState<Record<string, EntityItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "onTrack" | "atRisk" | "offTrack" | "noData">("all");

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

  const kpis = useMemo(() => data["kpi"] ?? [], [data]);

  const filteredKpis = useMemo(() => {
    if (filter === "all") return kpis;
    return kpis.filter((kpi) => {
      const value = getLatestValue(kpi);
      const target = kpi.targetValue;
      const achievement = calculateAchievement(value, target);
      switch (filter) {
        case "onTrack":
          return achievement !== null && achievement >= 100;
        case "atRisk":
          return achievement !== null && achievement >= 75 && achievement < 100;
        case "offTrack":
          return achievement !== null && achievement < 75;
        case "noData":
          return achievement === null;
        default:
          return true;
      }
    });
  }, [kpis, filter]);

  const stats = useMemo(() => {
    const total = kpis.length;
    const onTrack = kpis.filter((k) => {
      const achievement = calculateAchievement(getLatestValue(k), k.targetValue);
      return achievement !== null && achievement >= 100;
    }).length;
    const atRisk = kpis.filter((k) => {
      const achievement = calculateAchievement(getLatestValue(k), k.targetValue);
      return achievement !== null && achievement >= 75 && achievement < 100;
    }).length;
    const offTrack = kpis.filter((k) => {
      const achievement = calculateAchievement(getLatestValue(k), k.targetValue);
      return achievement !== null && achievement < 75;
    }).length;
    const noData = kpis.filter((k) => calculateAchievement(getLatestValue(k), k.targetValue) === null).length;
    return { total, onTrack, atRisk, offTrack, noData };
  }, [kpis]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-24" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-48" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "p-3 rounded-lg border text-left transition-colors",
            filter === "all"
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:bg-muted/50"
          )}
        >
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">{tr("All KPIs", "جميع المؤشرات")}</p>
        </button>
        <button
          onClick={() => setFilter("onTrack")}
          className={cn(
            "p-3 rounded-lg border text-left transition-colors",
            filter === "onTrack"
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-border bg-card hover:bg-muted/50"
          )}
        >
          <p className="text-2xl font-bold text-emerald-600">{stats.onTrack}</p>
          <p className="text-xs text-muted-foreground">{tr("On Track", "في المسار")}</p>
        </button>
        <button
          onClick={() => setFilter("atRisk")}
          className={cn(
            "p-3 rounded-lg border text-left transition-colors",
            filter === "atRisk"
              ? "border-amber-500 bg-amber-500/10"
              : "border-border bg-card hover:bg-muted/50"
          )}
        >
          <p className="text-2xl font-bold text-amber-600">{stats.atRisk}</p>
          <p className="text-xs text-muted-foreground">{tr("At Risk", "في خطر")}</p>
        </button>
        <button
          onClick={() => setFilter("offTrack")}
          className={cn(
            "p-3 rounded-lg border text-left transition-colors",
            filter === "offTrack"
              ? "border-rose-500 bg-rose-500/10"
              : "border-border bg-card hover:bg-muted/50"
          )}
        >
          <p className="text-2xl font-bold text-rose-600">{stats.offTrack}</p>
          <p className="text-xs text-muted-foreground">{tr("Off Track", "خارج المسار")}</p>
        </button>
        <button
          onClick={() => setFilter("noData")}
          className={cn(
            "p-3 rounded-lg border text-left transition-colors",
            filter === "noData"
              ? "border-gray-500 bg-gray-500/10"
              : "border-border bg-card hover:bg-muted/50"
          )}
        >
          <p className="text-2xl font-bold text-gray-600">{stats.noData}</p>
          <p className="text-xs text-muted-foreground">{tr("No Data", "بلا بيانات")}</p>
        </button>
      </div>

      {/* KPI Cards Grid */}
      {filteredKpis.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {tr("No KPIs found for the selected filter.", "لم يتم العثور على مؤشرات للفلتر المحدد.")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKpis.map((kpi) => (
            <KpiCard key={kpi.id} entity={kpi} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
