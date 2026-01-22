"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { AreaLine, Bar, Donut } from "@/components/charts/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLocale } from "@/providers/locale-provider";
import { getOverviewInsights } from "@/actions/insights";
import { getFirstEntityTypeCode } from "@/actions/navigation";

function activityBadge(status: string) {
  const up = String(status ?? "").toUpperCase();
  if (up === "APPROVED") return { icon: "tabler:check", color: "text-emerald-500" };
  if (up === "SUBMITTED") return { icon: "tabler:send", color: "text-blue-500" };
  if (up === "DRAFT") return { icon: "tabler:pencil", color: "text-slate-500" };
  return { icon: "tabler:clock", color: "text-amber-500" };
}

export default function OverviewPage() {
  const { locale, t, df, formatDate, kpiValueStatusLabel } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getOverviewInsights>> | null>(null);
  const [firstEntityTypeCode, setFirstEntityTypeCode] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [res, entityTypeCode] = await Promise.all([
          getOverviewInsights(),
          getFirstEntityTypeCode(),
        ]);
        if (!mounted) return;
        setData(res);
        setFirstEntityTypeCode(entityTypeCode);
      } catch (e: unknown) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : t("failedToLoad"));
        setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [t]);

  const topTypeBar = useMemo(() => {
    const types = data?.topTypes ?? [];
    return {
      categories: types.map((x) => df(x.name, x.nameAr)),
      values: types.map((x) => x.count),
    };
  }, [data?.topTypes, df]);

  const freshnessDonut = useMemo(() => {
    const f = data?.freshness;
    if (!f) return [];
    return [
      { name: t("excellent"), value: f.excellent, color: "#10b981" },
      { name: t("good"), value: f.good, color: "#3b82f6" },
      { name: t("fair"), value: f.fair, color: "#f59e0b" },
      { name: t("needsAttention"), value: f.needsAttention, color: "#ef4444" },
      { name: t("statusNoData"), value: f.noData, color: "#64748b" },
    ].filter((x) => x.value > 0);
  }, [data?.freshness, t]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("executiveOverview")}
        subtitle={t("executiveOverviewSubtitle")}
        icon={<Icon name="tabler:layout-dashboard" className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/${locale}/dashboards`}>
                <Icon name="tabler:chart-line" className="me-2 h-4 w-4" />
                {t("dashboards")}
              </Link>
            </Button>
            {firstEntityTypeCode && (
              <Button asChild size="sm">
                <Link href={`/${locale}/entities/${firstEntityTypeCode}`}>
                  <Icon name="tabler:target" className="me-2 h-4 w-4" />
                  {t("kpiManagement")}
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {error ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("dashboardFailedToLoad")}</CardTitle>
            <CardDescription className="text-muted-foreground">{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/15 via-card to-card backdrop-blur border-primary/20 lg:col-span-2">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg">{t("welcomeBack")}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {loading
                ? t("loading")
                : `${data?.user?.name ?? "—"} • ${df(data?.org?.name ?? "—", data?.org?.nameAr ?? null)}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {firstEntityTypeCode && (
                <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                  <Link href={`/${locale}/entities/${firstEntityTypeCode}`}>
                    <Icon name="tabler:target" className="h-5 w-5 text-blue-500" />
                    <div className="text-left">
                      <div className="font-semibold">{t("kpiManagement")}</div>
                      <div className="text-xs text-muted-foreground">{t("viewAndManageKpis")}</div>
                    </div>
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                <Link href={`/${locale}/approvals`}>
                  <Icon name="tabler:gavel" className="h-5 w-5 text-amber-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("approvals")}</div>
                    <div className="text-xs text-muted-foreground">{t("approvalsSubtitle")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                <Link href={`/${locale}/responsibilities`}>
                  <Icon name="tabler:user-check" className="h-5 w-5 text-violet-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("responsibilities")}</div>
                    <div className="text-xs text-muted-foreground">{t("manageAssignments")}</div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("coverageSnapshot")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("atAGlanceKpiPerformanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("kpis")}</span>
              <span className="font-semibold">{loading ? "—" : (data?.summary.totalKpis ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("approvalQueueAgingDesc")}</span>
              <span className="font-semibold">{loading ? "—" : (data?.summary.pendingApprovals ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("health")}</span>
              <span className="font-semibold">{loading ? "—" : `${data?.summary.overallHealth ?? 0}%`}</span>
            </div>
            <Progress value={data?.summary.overallHealth ?? 0} className="h-2" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="bg-gradient-to-br from-violet-500/10 to-card backdrop-blur border-violet-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
              <Icon name="tabler:target-arrow" className="h-4 w-4" />
              {t("strategies")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? "—" : (data?.summary.totalStrategies ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">{t("activeStrategicInitiatives")}</p></CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-card backdrop-blur border-blue-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Icon name="tabler:flag-3" className="h-4 w-4" />
              {t("objectives")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? "—" : (data?.summary.totalObjectives ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">{t("organizationalObjectives")}</p></CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-card backdrop-blur border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Icon name="tabler:chart-bar" className="h-4 w-4" />
              {t("kpis")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? "—" : (data?.summary.totalKpis ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">{t("keyPerformanceIndicators")}</p></CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-card backdrop-blur border-cyan-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
              <Icon name="tabler:activity" className="h-4 w-4" />
              {t("health")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? "—" : `${data?.summary.overallHealth ?? 0}%`}</CardTitle>
          </CardHeader>
          <CardContent><Progress value={data?.summary.overallHealth ?? 0} className="h-1.5" /></CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-card backdrop-blur border-amber-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Icon name="tabler:alert-triangle" className="h-4 w-4" />
              {t("approvals")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? "—" : (data?.summary.pendingApprovals ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">{t("approvalQueueAgingDesc")}</p></CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-card backdrop-blur border-rose-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Icon name="tabler:calendar-due" className="h-4 w-4" />
              {t("users")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? "—" : (data?.summary.users ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">{t("totalUsers")}</p></CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t("browseByTypeDesc")}</CardTitle>
                <CardDescription className="mt-1">{t("browseByTypeDesc")}</CardDescription>
              </div>
              <Badge variant="outline" className="border-border bg-muted/30">{loading ? "—" : `${(data?.topTypes?.length ?? 0)} ${t("categories")}`}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : topTypeBar.categories.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              <Bar categories={topTypeBar.categories} values={topTypeBar.values} height={280} color="#8b5cf6" />
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("organizationalHealth")}</CardTitle>
            <CardDescription className="mt-1">{t("performanceDistribution")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : freshnessDonut.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              <Donut items={freshnessDonut} height={240} />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("recentActivity")}</CardTitle>
            <CardDescription className="mt-1">{t("latestUpdatesAndChanges")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : (data?.recentActivities?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              data?.recentActivities?.map((activity) => {
                const iconData = activityBadge(activity.status);
                const when = formatDate(activity.createdAt, { dateStyle: "medium", timeStyle: "short" });
              return (
                <div key={activity.id} className="flex items-start gap-3 rounded-lg border border-border bg-background/50 p-3">
                  <div className={`rounded-full bg-muted p-2 ${iconData.color}`}><Icon name={iconData.icon} className="h-4 w-4" /></div>
                  <div className="flex-1 space-y-1">
                    <Link
                      href={`/${locale}/entities/kpi/${activity.entityId}`}
                      className="text-sm font-medium hover:underline underline-offset-4 decoration-primary/40 hover:decoration-primary/70"
                    >
                      {df(activity.title, activity.titleAr)}
                    </Link>
                    <p className="text-xs text-muted-foreground">{kpiValueStatusLabel(activity.status)} • {when}</p>
                  </div>
                </div>
              );
              }) ?? null
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t("quarterlyProgress")}</CardTitle>
                <CardDescription className="mt-1">{t("yearOverYearPerformanceTrend")}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${locale}/dashboards`}>{t("viewDetails")}<Icon name="tabler:arrow-right" className="ms-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : (
              <AreaLine
                categories={data?.quarterlyProgress.categories ?? []}
                values={data?.quarterlyProgress.values ?? []}
                height={260}
                color="#10b981"
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("needsAttention")}</CardTitle>
            <CardDescription className="mt-1">{t("daysSinceLastUpdate")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : (data?.attentionKpis?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              data?.attentionKpis?.map((kpi) => (
                <div key={kpi.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/${locale}/entities/kpi/${kpi.id}`}
                        className="font-medium hover:underline underline-offset-4 decoration-primary/40 hover:decoration-primary/70"
                      >
                        {df(kpi.title, kpi.titleAr)}
                      </Link>
                      <p className="text-xs text-muted-foreground">{kpi.daysSinceLastUpdate === null ? t("statusNoData") : `${kpi.daysSinceLastUpdate} ${t("daysShort")}`}</p>
                    </div>
                    <Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      {kpi.daysSinceLastUpdate === null ? "—" : `${kpi.daysSinceLastUpdate}${t("daysShort")}`}
                    </Badge>
                  </div>
                  <Progress value={Math.max(0, 100 - (kpi.daysSinceLastUpdate ?? 100))} className="h-2" />
                </div>
              )) ?? null
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("teamPerformance")}</CardTitle>
            <CardDescription className="mt-1">{t("assignOwners")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : (data?.topOwners?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              data?.topOwners?.map((owner) => (
                <div key={owner.userId} className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
                  <div className="space-y-1">
                    <p className="font-medium">{owner.name}</p>
                    <p className="text-xs text-muted-foreground">{t("assignedToYou")}</p>
                  </div>
                  <Badge variant="outline" className="border-border bg-muted/30">{owner.count}</Badge>
                </div>
              )) ?? null
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("strategicNavigation")}</CardTitle>
            <CardDescription className="mt-1">{t("quickAccessToKeyStrategicAreas")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {firstEntityTypeCode && (
                <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                  <Link href={`/${locale}/entities/${firstEntityTypeCode}`}>
                    <Icon name="tabler:target" className="h-6 w-6 text-violet-500" />
                    <div className="text-left">
                      <div className="font-semibold">{t("kpiManagement")}</div>
                      <div className="text-xs text-muted-foreground">{t("viewAndManageKpis")}</div>
                    </div>
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                <Link href={`/${locale}/pillars`}>
                  <Icon name="tabler:columns-3" className="h-6 w-6 text-blue-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("strategicPillars")}</div>
                    <div className="text-xs text-muted-foreground">{t("coreFocusAreas")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                <Link href={`/${locale}/objectives`}>
                  <Icon name="tabler:flag-3" className="h-6 w-6 text-emerald-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("objectives")}</div>
                    <div className="text-xs text-muted-foreground">{t("strategicObjectives")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                <Link href={`/${locale}/projects`}>
                  <Icon name="tabler:briefcase-2" className="h-6 w-6 text-cyan-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("projects")}</div>
                    <div className="text-xs text-muted-foreground">{t("activeInitiatives")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                <Link href={`/${locale}/risks`}>
                  <Icon name="tabler:shield-exclamation" className="h-6 w-6 text-amber-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("riskManagement")}</div>
                    <div className="text-xs text-muted-foreground">{t("monitorAndMitigate")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                <Link href={`/${locale}/organization`}>
                  <Icon name="tabler:building" className="h-6 w-6 text-rose-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("organization")}</div>
                    <div className="text-xs text-muted-foreground">{t("structureAndTeams")}</div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
