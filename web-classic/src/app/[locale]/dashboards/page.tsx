"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { AreaLine, Bar, Donut, SparkLine } from "@/components/charts/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/providers/locale-provider";
import { getDashboardInsights } from "@/actions/insights";
import { statusColorForAchievement } from "@/lib/rag";
import { dashboards } from "@/lib/dashboards";
import { clamp } from "@/lib/utils";

export default function DashboardsPage() {
  const { locale, t, df, formatDate, tr } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardInsights>> | null>(null);
  
  // Date range filter state
  const [dateRange, setDateRange] = useState<string>("last30days");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await getDashboardInsights();
        if (!mounted) return;
        setData(res);
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
  }, [t, dateRange]);

  const topTypeBar = useMemo(() => {
    const types = data?.topTypes ?? [];
    return {
      categories: types.map((x) => df(x.name, x.nameAr)),
      values: types.map((x) => x.count),
    };
  }, [data?.topTypes, df]);

  const monthLabels = useMemo(() => {
    const cats = data?.monthlyActivity.categories ?? [];
    return cats.map((iso) => formatDate(iso, { month: "short" }));
  }, [data?.monthlyActivity.categories, formatDate]);

  const statusDonut = useMemo(() => {
    const counts = data?.statusCounts ?? [];
    const items = counts
      .map((x) => {
        const up = String(x.status ?? "").toUpperCase();
        const label = up === "ACTIVE" ? t("active") : up === "AT_RISK" ? t("atRisk") : up === "COMPLETED" ? t("completed") : t("planned");
        const color = up === "COMPLETED" ? "#3b82f6" : up === "AT_RISK" ? "#f59e0b" : up === "ACTIVE" ? "#10b981" : "#64748b";
        return { name: label, value: x.count, color };
      })
      .filter((x) => x.value > 0);
    return items;
  }, [data?.statusCounts, t]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("performanceDashboard")}
        subtitle={t("performanceDashboardSubtitle")}
        icon={<Icon name="tabler:chart-line" className="h-5 w-5" />}
        breadcrumbs={[
          { label: t("dashboards") },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder={tr("Date Range", "النطاق الزمني")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last30days">{tr("Last 30 days", "آخر 30 يوم")}</SelectItem>
                <SelectItem value="q1">{tr("Q1", "الربع 1")}</SelectItem>
                <SelectItem value="q2">{tr("Q2", "الربع 2")}</SelectItem>
                <SelectItem value="q3">{tr("Q3", "الربع 3")}</SelectItem>
                <SelectItem value="q4">{tr("Q4", "الربع 4")}</SelectItem>
                <SelectItem value="ytd">{tr("Year to Date", "منذ بداية العام")}</SelectItem>
                <SelectItem value="all">{tr("All Time", "كل الأوقات")}</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild variant="outline" size="sm">
              <Link href={`/${locale}/overview`}>
                <Icon name="tabler:layout-grid" className="me-2 h-4 w-4" />
                {t("overview")}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/${locale}/entities/kpi`}>
                <Icon name="tabler:target" className="me-2 h-4 w-4" />
                {t("viewAllKpis")}
              </Link>
            </Button>
          </div>
        }
      />

      {error ? (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{t("dashboardFailedToLoad")}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Icon name="tabler:target" className="h-3.5 w-3.5" />
              {t("totalKpis")}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold">{loading ? <Skeleton className="h-8 w-16" /> : (data?.metrics.totalKpis ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("completionRate")}</span>
              <Badge variant="secondary" className="text-xs">{loading ? "—" : `${data?.metrics.completionRate ?? 0}%`}</Badge>
            </div>
            <div className="mt-2">{loading ? <Skeleton className="h-12 w-full" /> : <SparkLine values={data?.monthlyActivity.values ?? []} height={48} color="#3b82f6" />}</div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Icon name="tabler:activity" className="h-3.5 w-3.5" />
              {t("monthlyActivityTrend")}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold">{loading ? <Skeleton className="h-8 w-16" /> : (data?.metrics.updatesLast30Days ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("kpiUpdatesAndSubmissions")}</span>
              <Badge variant="secondary" className="text-xs">{t("daysShort")} 30</Badge>
            </div>
            <div className="mt-2">{loading ? <Skeleton className="h-12 w-full" /> : <SparkLine values={data?.monthlyActivity.values ?? []} height={48} color="#3b82f6" />}</div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Icon name="tabler:briefcase" className="h-3.5 w-3.5" />
              {t("activeProjects")}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold">{loading ? <Skeleton className="h-8 w-16" /> : (data?.metrics.activeProjects ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("totalUsers")}</span>
              <Badge variant="secondary" className="text-xs">{loading ? "—" : (data?.metrics.users ?? 0)}</Badge>
            </div>
            <div className="mt-2">{loading ? <Skeleton className="h-2 w-full" /> : <Progress value={clamp(data?.metrics.completionRate ?? 0, 0, 100)} className="h-1" />}</div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Icon name="tabler:chart-bar" className="h-3.5 w-3.5" />
              {t("performanceScore")}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold">{loading ? <Skeleton className="h-8 w-16" /> : `${data?.metrics.overallHealth ?? 0}%`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("approved")}</span>
              <Badge variant="secondary" className="text-xs">{loading ? "—" : (data?.metrics.approvedLast30Days ?? 0)}</Badge>
            </div>
            <div className="mt-2">{loading ? <Skeleton className="h-2 w-full" /> : <Progress value={data?.metrics.overallHealth ?? 0} className="h-1" />}</div>
          </CardContent>
        </Card>
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
                <Skeleton className="h-[220px] w-full" />
              </div>
            ) : topTypeBar.categories.length === 0 ? (
              <div className="rounded-md border border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              <Bar categories={topTypeBar.categories} values={topTypeBar.values} height={260} color="#3b82f6" />
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{t("statusDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Skeleton className="h-[180px] w-[180px] rounded-full" />
              </div>
            ) : statusDonut.length === 0 ? (
              <div className="rounded-md border border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              <Donut items={statusDonut} height={220} />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-border/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">{t("monthlyActivityTrend")}</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${locale}/entities/kpi`}>{t("viewDetails")}</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : (
              <AreaLine categories={monthLabels} values={data?.monthlyActivity.values ?? []} height={240} color="#3b82f6" />
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{t("topPerformers")}</CardTitle>
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
            ) : (data?.topKpis?.length ?? 0) === 0 ? (
              <div className="rounded-md border border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">{t("noKpisFound")}</div>
            ) : (
              data?.topKpis?.slice(0, 5).map((kpi) => (
                <div key={kpi.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Link
                      href={`/${locale}/entities/kpi/${kpi.id}`}
                      className="font-medium hover:underline truncate"
                    >
                      {df(kpi.title, kpi.titleAr)}
                    </Link>
                    <Badge variant="secondary" className="text-xs">{kpi.value ?? 0}%</Badge>
                  </div>
                  <Progress value={kpi.value ?? 0} className="h-1" />
                </div>
              )) ?? null
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{t("quickActions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Link 
                href={`/${locale}/entities/kpi`}
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
              <Link 
                href={`/${locale}/entities/objective`}
                className="group flex items-center gap-3 rounded-md border border-border/60 p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Icon name="tabler:flag-3" className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">{t("objectives")}</div>
                  <div className="text-xs text-muted-foreground">{t("trackStrategicGoals")}</div>
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
              <Link 
                href={`/${locale}/organization`}
                className="group flex items-center gap-3 rounded-md border border-border/60 p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Icon name="tabler:building" className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">{t("organization")}</div>
                  <div className="text-xs text-muted-foreground">{t("viewOrgStructure")}</div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{t("specificDashboards")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {dashboards.map((d) => (
                <Link 
                  key={d.slug}
                  href={`/${locale}/dashboards/${d.slug}`}
                  className="group flex items-start gap-3 rounded-md border border-border/60 p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                    <Icon name={d.icon} className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{df(d.title, d.titleAr)}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{df(d.description, d.descriptionAr)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
