"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrgEntitiesByTypeCode } from "@/actions/entities";
import { useLocale } from "@/providers/locale-provider";
import { AchievementBar, TrendLine } from "@/components/charts/report-charts";
import { Building2, Target, TrendingUp, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type EntityItem = Awaited<ReturnType<typeof getOrgEntitiesByTypeCode>>["items"][number];

function getLatestValue(entity: EntityItem): number | null {
  const latest = entity.values?.[0];
  if (!latest) return null;
  return latest.finalValue ?? latest.calculatedValue ?? latest.actualValue ?? null;
}

function calculateAchievement(value: number | null, target: number | null): number | null {
  if (value === null || target === null || target === 0) return null;
  return Math.round((value / target) * 1000) / 10;
}

interface EntityCardProps {
  entity: EntityItem;
  type: "pillar" | "objective";
  locale: string;
}

function EntityCard({ entity, type, locale }: EntityCardProps) {
  const { tr } = useLocale();
  const value = getLatestValue(entity);
  const target = entity.targetValue;
  const achievement = calculateAchievement(value, target);

  const statusColor = achievement === null
    ? "bg-gray-500"
    : achievement >= 100
      ? "bg-emerald-500"
      : achievement >= 75
        ? "bg-amber-500"
        : "bg-rose-500";

  const Icon = type === "pillar" ? Building2 : Target;

  return (
    <Card className="overflow-hidden">
      <div className={cn("h-1", statusColor)} />
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
            type === "pillar" ? "bg-blue-500/10" : "bg-purple-500/10"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              type === "pillar" ? "text-blue-500" : "text-purple-500"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">
              {locale === "ar" ? (entity.titleAr ?? entity.title) : entity.title}
            </h4>
            {entity.key && <p className="text-xs text-muted-foreground">{entity.key}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">{tr("Current", "الحالي")}</p>
            <p className="font-semibold text-sm">{value !== null ? `${value.toFixed(1)}${entity.unit ? ` ${entity.unit}` : ""}` : "—"}</p>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">{tr("Target", "الهدف")}</p>
            <p className="font-semibold text-sm">{target !== null ? `${target.toFixed(1)}${entity.unit ? ` ${entity.unit}` : ""}` : "—"}</p>
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

        {entity.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {locale === "ar" ? (entity.descriptionAr ?? entity.description) : entity.description}
          </p>
        )}

        {/* Mini progress bar */}
        {achievement !== null && (
          <div className="mt-2">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  achievement >= 100 ? "bg-emerald-500" : achievement >= 75 ? "bg-amber-500" : "bg-rose-500"
                )}
                style={{ width: `${Math.min(achievement, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StrategicAlignmentReport({ entityTypes }: { entityTypes: Array<{ code: string; name: string; nameAr: string | null }> }) {
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

  const pillars = useMemo(() => data["pillar"] ?? [], [data]);
  const objectives = useMemo(() => data["objective"] ?? [], [data]);

  const pillarStats = useMemo(() => {
    return pillars.map((p) => {
      const value = getLatestValue(p);
      const target = p.targetValue;
      const achievement = calculateAchievement(value, target);
      return {
        id: p.id,
        name: locale === "ar" ? (p.titleAr ?? p.title) : p.title,
        achievement: achievement ?? 0,
        target: target ?? 0,
        value: value ?? 0,
        unit: p.unit ?? "",
      };
    });
  }, [pillars, locale]);

  const objectiveStats = useMemo(() => {
    return objectives.map((o) => {
      const value = getLatestValue(o);
      const target = o.targetValue;
      const achievement = calculateAchievement(value, target);
      return {
        id: o.id,
        name: locale === "ar" ? (o.titleAr ?? o.title) : o.title,
        achievement: achievement ?? 0,
        target: target ?? 0,
        value: value ?? 0,
        unit: o.unit ?? "",
      };
    });
  }, [objectives, locale]);

  const summary = useMemo(() => {
    const pillarAchievements = pillarStats.map((p) => p.achievement).filter((a) => a > 0);
    const objectiveAchievements = objectiveStats.map((o) => o.achievement).filter((a) => a > 0);
    
    const avgPillar = pillarAchievements.length > 0
      ? Math.round(pillarAchievements.reduce((a, b) => a + b, 0) / pillarAchievements.length)
      : null;
    const avgObjective = objectiveAchievements.length > 0
      ? Math.round(objectiveAchievements.reduce((a, b) => a + b, 0) / objectiveAchievements.length)
      : null;

    return {
      totalPillars: pillars.length,
      totalObjectives: objectives.length,
      avgPillarAchievement: avgPillar,
      avgObjectiveAchievement: avgObjective,
      pillarsOnTrack: pillarStats.filter((p) => p.achievement >= 100).length,
      objectivesOnTrack: objectiveStats.filter((o) => o.achievement >= 100).length,
    };
  }, [pillarStats, objectiveStats, pillars.length, objectives.length]);

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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalPillars}</p>
                <p className="text-xs text-muted-foreground">{tr("Strategic Pillars", "الركائز الاستراتيجية")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalObjectives}</p>
                <p className="text-xs text-muted-foreground">{tr("Strategic Objectives", "الأهداف الاستراتيجية")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.avgPillarAchievement ?? "—"}%</p>
                <p className="text-xs text-muted-foreground">{tr("Avg Pillar Achievement", "متوسط إنجاز الركائز")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.avgObjectiveAchievement ?? "—"}%</p>
                <p className="text-xs text-muted-foreground">{tr("Avg Objective Achievement", "متوسط إنجاز الأهداف")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pillars Section */}
      {pillarStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              {tr("Pillar Achievement", "إنجاز الركائز الاستراتيجية")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AchievementBar
              categories={pillarStats.map((p) => p.name)}
              values={pillarStats.map((p) => p.achievement)}
              targets={pillarStats.map(() => 100)}
              height={280}
            />
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                {summary.pillarsOnTrack} {tr("of", "من")} {summary.totalPillars} {tr("pillars on track", "ركيزة في المسار")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objectives Section */}
      {objectiveStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              {tr("Strategic Objectives Achievement", "إنجاز الأهداف الاستراتيجية")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AchievementBar
              categories={objectiveStats.map((o) => o.name)}
              values={objectiveStats.map((o) => o.achievement)}
              targets={objectiveStats.map(() => 100)}
              height={280}
            />
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                {summary.objectivesOnTrack} {tr("of", "من")} {summary.totalObjectives} {tr("objectives on track", "هدف في المسار")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Cards */}
      {pillars.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            {tr("Pillar Details", "تفاصيل الركائز")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pillars.map((pillar) => (
              <EntityCard key={pillar.id} entity={pillar} type="pillar" locale={locale} />
            ))}
          </div>
        </div>
      )}

      {objectives.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            {tr("Strategic Objectives Details", "تفاصيل الأهداف الاستراتيجية")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {objectives.map((objective) => (
              <EntityCard key={objective.id} entity={objective} type="objective" locale={locale} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
