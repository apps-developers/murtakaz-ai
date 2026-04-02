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
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/providers/locale-provider";
import { getOverviewInsights, getOverdueKpis } from "@/actions/insights";
import { getFirstEntityTypeCode } from "@/actions/navigation";
import { useAdvancedFeaturesEnabled } from "@/lib/ai-features";

function activityBadge(status: string) {
  const up = String(status ?? "").toUpperCase();
  if (up === "APPROVED") return { icon: "tabler:check", color: "text-emerald-500" };
  if (up === "SUBMITTED") return { icon: "tabler:send", color: "text-blue-500" };
  if (up === "DRAFT") return { icon: "tabler:pencil", color: "text-slate-500" };
  return { icon: "tabler:clock", color: "text-amber-500" };
}

export default function OverviewPage() {
  const { locale, t, df, formatDate, kpiValueStatusLabel } = useLocale();
  const advancedFeaturesEnabled = useAdvancedFeaturesEnabled();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getOverviewInsights>> | null>(null);
  const [firstEntityTypeCode, setFirstEntityTypeCode] = useState<string | null>(null);
  const [overdueData, setOverdueData] = useState<Awaited<ReturnType<typeof getOverdueKpis>> | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [res, entityTypeCode, overdue] = await Promise.all([
          getOverviewInsights(),
          getFirstEntityTypeCode(),
          getOverdueKpis(),
        ]);
        if (!mounted) return;
        setData(res);
        setFirstEntityTypeCode(entityTypeCode);
        setOverdueData(overdue);
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
        breadcrumbs={[
          { label: t("overview") },
        ]}
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

      {overdueData && overdueData.totalOverdue > 0 ? (
        <Card className="border-red-500/30 bg-gradient-to-r from-red-500/10 via-card to-card backdrop-blur shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/15 p-2.5">
                  <Icon name="tabler:alert-triangle" className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-base text-red-700 dark:text-red-400">
                    {t("overdueKpiUpdates")}
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-red-600/70 dark:text-red-400/70">
                    {overdueData.isAdmin
                      ? t("overdueKpiBannerDesc").replace("{count}", String(overdueData.totalOverdue))
                      : t("overdueKpiBannerUserDesc").replace("{count}", String(overdueData.totalOverdue))}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400 text-sm">
                {overdueData.totalOverdue}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {overdueData.overdueKpis.map((kpi) => (
                <Link
                  key={kpi.id}
                  href={`/${locale}/entities/kpi/${kpi.id}`}
                  className="group flex items-start gap-3 rounded-lg border border-red-500/15 bg-background/50 p-3 transition-all hover:border-red-500/30 hover:shadow-sm"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium truncate group-hover:underline underline-offset-4 decoration-red-500/40">
                      {df(kpi.title, kpi.titleAr)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{t("overdueKpiPeriod").replace("{period}", kpi.periodLabel)}</span>
                      <span>•</span>
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        {t("overdueKpiDaysPast").replace("{days}", String(kpi.daysPastDeadline))}
                      </span>
                    </div>
                    {overdueData.isAdmin && (
                      <p className="text-xs text-muted-foreground">
                        {kpi.ownerName
                          ? t("overdueKpiOwner").replace("{name}", kpi.ownerName)
                          : t("overdueKpiUnassigned")}
                      </p>
                    )}
                  </div>
                  <Icon name="tabler:chevron-right" className="h-4 w-4 text-muted-foreground mt-0.5 rtl:rotate-180" />
                </Link>
              ))}
            </div>
            {overdueData.totalOverdue > overdueData.overdueKpis.length && firstEntityTypeCode ? (
              <div className="mt-3 text-center">
                <Button asChild variant="ghost" size="sm" className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                  <Link href={`/${locale}/entities/kpi`}>
                    {t("overdueKpiViewAll")}
                    <Icon name="tabler:arrow-right" className="ms-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-border/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">{t("welcomeBack")}</CardTitle>
            <CardDescription>
              {loading
                ? t("loading")
                : `${data?.user?.name ?? "—"} • ${df(data?.org?.name ?? "—", data?.org?.nameAr ?? null)}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-[250px]" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {firstEntityTypeCode && (
                  <Link 
                    href={`/${locale}/entities/${firstEntityTypeCode}`}
                    className="group flex items-center gap-3 rounded-md border border-border/60 p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                      <Icon name="tabler:target" className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t("kpiManagement")}</div>
                      <div className="text-xs text-muted-foreground">{t("viewAndManageKpis")}</div>
                    </div>
                  </Link>
                )}
                <Link 
                  href={`/${locale}/approvals`}
                  className="group flex items-center gap-3 rounded-md border border-border/60 p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Icon name="tabler:gavel" className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t("approvals")}</div>
                    <div className="text-xs text-muted-foreground">{t("approvalsSubtitle")}</div>
                  </div>
                </Link>
                <Link 
                  href={`/${locale}/responsibilities`}
                  className="group flex items-center gap-3 rounded-md border border-border/60 p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Icon name="tabler:user-check" className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t("responsibilities")}</div>
                    <div className="text-xs text-muted-foreground">{t("manageAssignments")}</div>
                  </div>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">{t("coverageSnapshot")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("kpis")}</span>
              <span className="font-medium">{loading ? "—" : (data?.summary.totalKpis ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("approvalQueueAgingDesc")}</span>
              <span className="font-medium">{loading ? "—" : (data?.summary.pendingApprovals ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("health")}</span>
              <span className="font-medium">{loading ? "—" : `${data?.summary.overallHealth ?? 0}%`}</span>
            </div>
            <Progress value={data?.summary.overallHealth ?? 0} className="h-1.5" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Link href={`/${locale}/entities/initiative`} className="group">
          <Card className="h-full border border-border/60 shadow-sm transition-colors hover:border-primary/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Icon name="tabler:target-arrow" className="h-3.5 w-3.5" />
                {t("strategies")}
              </CardDescription>
              <CardTitle className="text-2xl font-semibold">{loading ? <Skeleton className="h-8 w-16" /> : (data?.summary.totalStrategies ?? 0)}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{t("activeStrategicInitiatives")}</p></CardContent>
          </Card>
        </Link>

        <Link href={`/${locale}/entities/objective`} className="group">
          <Card className="h-full border border-border/60 shadow-sm transition-colors hover:border-primary/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Icon name="tabler:flag-3" className="h-3.5 w-3.5" />
                {t("objectives")}
              </CardDescription>
              <CardTitle className="text-2xl font-semibold">{loading ? <Skeleton className="h-8 w-16" /> : (data?.summary.totalObjectives ?? 0)}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{t("organizationalObjectives")}</p></CardContent>
          </Card>
        </Link>

        <Link href={`/${locale}/entities/kpi`} className="group">
          <Card className="h-full border border-border/60 shadow-sm transition-colors hover:border-primary/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Icon name="tabler:chart-bar" className="h-3.5 w-3.5" />
                {t("kpis")}
              </CardDescription>
              <CardTitle className="text-2xl font-semibold">{loading ? <Skeleton className="h-8 w-16" /> : (data?.summary.totalKpis ?? 0)}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{t("keyPerformanceIndicators")}</p></CardContent>
          </Card>
        </Link>

        <Link href={`/${locale}/dashboards`} className="group">
          <Card className="h-full border border-border/60 shadow-sm transition-colors hover:border-primary/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Icon name="tabler:activity" className="h-3.5 w-3.5" />
                {t("health")}
              </CardDescription>
              <CardTitle className="text-2xl font-semibold">{loading ? <Skeleton className="h-8 w-16" /> : `${data?.summary.overallHealth ?? 0}%`}</CardTitle>
            </CardHeader>
            <CardContent>{loading ? <Skeleton className="h-2 w-full" /> : <Progress value={data?.summary.overallHealth ?? 0} className="h-1" />}</CardContent>
          </Card>
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-border/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">{t("browseByType")}</CardTitle>
              <Badge variant="secondary" className="text-xs">{loading ? "—" : `${(data?.topTypes?.length ?? 0)} ${t("categories")}`}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : topTypeBar.categories.length === 0 ? (
              <div className="rounded-md border border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              <Bar categories={topTypeBar.categories} values={topTypeBar.values} height={240} color="#3b82f6" />
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{t("organizationalHealth")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Skeleton className="h-[160px] w-[160px] rounded-full" />
              </div>
            ) : freshnessDonut.length === 0 ? (
              <div className="rounded-md border border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              <Donut items={freshnessDonut} height={200} />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{t("recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (data?.recentActivities?.length ?? 0) === 0 ? (
              <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              data?.recentActivities?.slice(0, 5).map((activity) => {
                const iconData = activityBadge(activity.status);
                const when = formatDate(activity.createdAt, { dateStyle: "medium" });
              return (
                <div key={activity.id} className="flex items-start gap-2 rounded-md border border-border/40 p-2">
                  <div className={`rounded-full bg-muted p-1.5 ${iconData.color}`}><Icon name={iconData.icon} className="h-3 w-3" /></div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/${locale}/entities/kpi/${activity.entityId}`}
                      className="text-sm font-medium hover:underline truncate block"
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

        <Card className="border border-border/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">{t("quarterlyProgress")}</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${locale}/dashboards`}>{t("viewDetails")}</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-[180px] w-full" />
              </div>
            ) : (
              <AreaLine
                categories={data?.quarterlyProgress.categories ?? []}
                values={data?.quarterlyProgress.values ?? []}
                height={200}
                color="#3b82f6"
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{t("needsAttention")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (data?.attentionKpis?.length ?? 0) === 0 ? (
              <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              data?.attentionKpis?.slice(0, 5).map((kpi) => (
                <div key={kpi.id} className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/${locale}/entities/kpi/${kpi.id}`}
                      className="text-sm font-medium hover:underline truncate"
                    >
                      {df(kpi.title, kpi.titleAr)}
                    </Link>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {kpi.daysSinceLastUpdate === null ? "—" : `${kpi.daysSinceLastUpdate}${t("daysShort")}`}
                    </span>
                  </div>
                  <Progress value={Math.min(100, ((kpi.daysSinceLastUpdate ?? 0) / 90) * 100)} className="h-1" />
                </div>
              )) ?? null
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{t("teamPerformance")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (data?.topOwners?.length ?? 0) === 0 ? (
              <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              data?.topOwners?.slice(0, 5).map((owner) => (
                <div key={owner.userId} className="flex items-center justify-between rounded-md border border-border/40 p-2">
                  <span className="text-sm">{owner.name}</span>
                  <Badge variant="secondary" className="text-xs">{owner.count}</Badge>
                </div>
              )) ?? null
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
