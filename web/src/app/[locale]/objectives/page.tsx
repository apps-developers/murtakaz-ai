"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { getStrategicPillarsOverview } from "@/actions/insights";

type PillarData = Awaited<ReturnType<typeof getStrategicPillarsOverview>>[number];
type ObjectiveData = PillarData["objectives"][number];

function ragColor(value: number | null, target: number | null) {
  if (value === null || target === null || target === 0) return "text-muted-foreground";
  const pct = (value / target) * 100;
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function ragBorderColor(value: number | null, target: number | null) {
  if (value === null || target === null || target === 0) return "border-border";
  const pct = (value / target) * 100;
  if (pct >= 80) return "border-emerald-500/25";
  if (pct >= 60) return "border-amber-500/25";
  return "border-rose-500/25";
}

export default function ObjectivesPage() {
  const { user, loading: authLoading } = useAuth();
  const { locale, t, tr, df, formatNumber } = useLocale();
  const [loading, setLoading] = useState(true);
  const [pillars, setPillars] = useState<PillarData[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    setLoading(true);
    void (async () => {
      try {
        const data = await getStrategicPillarsOverview();
        if (mounted) setPillars(data);
      } catch (e) {
        console.error("Failed to load objectives", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [authLoading, user]);

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

  const allObjectives = pillars.flatMap((p) => p.objectives.map((o) => ({ ...o, pillarTitle: p.title, pillarTitleAr: p.titleAr })));
  const totalKpis = allObjectives.reduce((s, o) => s + o.kpiCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tr("Strategic Objectives", "الأهداف الاستراتيجية")}
        subtitle={tr("All objectives grouped by strategic pillar", "جميع الأهداف مجمعة حسب الركيزة الاستراتيجية")}
        icon={<Icon name="tabler:flag-3" className="h-5 w-5" />}
        breadcrumbs={[{ label: t("objectives") }]}
      />

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-500/10 via-card to-card backdrop-blur border-blue-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Icon name="tabler:flag-3" className="h-4 w-4" />
              {t("objectives")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? "—" : allObjectives.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 via-card to-card backdrop-blur border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Icon name="tabler:chart-bar" className="h-4 w-4" />
              {tr("Linked KPIs", "مؤشرات مرتبطة")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? "—" : totalKpis}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-violet-500/10 via-card to-card backdrop-blur border-violet-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
              <Icon name="tabler:columns-3" className="h-4 w-4" />
              {tr("Pillars", "الركائز")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? "—" : pillars.length}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      {/* Objectives grouped by Pillar */}
      {loading ? (
        <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
      ) : pillars.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
      ) : (
        <div className="space-y-6">
          {pillars.map((pillar) => (
            <Card key={pillar.id} className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="tabler:columns-3" className="h-4 w-4 text-violet-500" />
                    <Link
                      href={`/${locale}/entities/pillar/${pillar.id}`}
                      className="text-base font-semibold hover:underline underline-offset-4 decoration-primary/40"
                    >
                      {df(pillar.title, pillar.titleAr)}
                    </Link>
                  </div>
                  <Badge variant="outline" className="border-border bg-muted/30 text-xs">
                    {pillar.objectiveCount} {tr("objectives", "أهداف")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {pillar.objectives.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noItemsYet")}</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {pillar.objectives.map((obj) => {
                      const achievement = obj.target && obj.target > 0 && obj.value !== null
                        ? Math.round((obj.value / obj.target) * 100)
                        : null;
                      return (
                        <Link
                          key={obj.id}
                          href={`/${locale}/entities/objective/${obj.id}`}
                          className={`group block rounded-xl border ${ragBorderColor(obj.value, obj.target)} bg-background/50 p-4 transition-all hover:shadow-md hover:border-primary/30`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate group-hover:underline underline-offset-4 decoration-primary/40">
                                {df(obj.title, obj.titleAr)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{obj.key}</p>
                            </div>
                            <span className={`text-lg font-bold tabular-nums shrink-0 ${ragColor(obj.value, obj.target)}`}>
                              {obj.value !== null ? formatNumber(Math.round(obj.value * 10) / 10) : "—"}
                            </span>
                          </div>
                          <Progress
                            value={Math.min(100, obj.target && obj.target > 0 && obj.value !== null ? (obj.value / obj.target) * 100 : 0)}
                            className="h-1.5 mb-2"
                          />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{obj.kpiCount} {tr("KPIs", "مؤشرات")}</span>
                            {obj.target !== null && (
                              <span>{tr("Target", "المستهدف")}: {formatNumber(obj.target)}</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
