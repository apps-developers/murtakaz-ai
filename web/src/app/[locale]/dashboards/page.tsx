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
import { useLocale } from "@/providers/locale-provider";
import { getDashboardInsights } from "@/actions/insights";
import { statusColorForAchievement } from "@/lib/rag";
import { AiGenerateSummaryModal } from "@/components/ai/ai-generate-summary-modal";
import { useAiEnabled } from "@/lib/ai-features";
import { dashboards } from "@/lib/dashboards";
import { clamp } from "@/lib/utils";

export default function DashboardsPage() {
  const { locale, t, df, formatDate } = useLocale();
  const aiEnabled = useAiEnabled();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardInsights>> | null>(null);

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
  }, [t]);

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
        actions={
          <div className="flex gap-2">
            {aiEnabled ? <AiGenerateSummaryModal /> : null}
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
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("dashboardFailedToLoad")}</CardTitle>
            <CardDescription className="text-muted-foreground">{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-card to-card backdrop-blur border-blue-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Icon name="tabler:target" className="h-4 w-4 text-blue-500" />
              {t("totalKpis")}
            </CardDescription>
            <CardTitle className="text-4xl font-bold">{loading ? "—" : (data?.metrics.totalKpis ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("completionRate")}</span>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">{loading ? "—" : `${data?.metrics.completionRate ?? 0}%`}</Badge>
            </div>
            <div className="mt-3"><SparkLine values={data?.monthlyActivity.values ?? []} height={60} color="#3b82f6" /></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-card to-card backdrop-blur border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Icon name="tabler:activity" className="h-4 w-4 text-emerald-500" />
              {t("monthlyActivityTrend")}
            </CardDescription>
            <CardTitle className="text-4xl font-bold">{loading ? "—" : (data?.metrics.updatesLast30Days ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("kpiUpdatesAndSubmissions")}</span>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">{t("daysShort")} 30</Badge>
            </div>
            <div className="mt-3"><SparkLine values={data?.monthlyActivity.values ?? []} height={60} color="#10b981" /></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-violet-500/10 via-card to-card backdrop-blur border-violet-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Icon name="tabler:briefcase" className="h-4 w-4 text-violet-500" />
              {t("activeProjects")}
            </CardDescription>
            <CardTitle className="text-4xl font-bold">{loading ? "—" : (data?.metrics.activeProjects ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("totalUsers")}</span>
              <Badge variant="secondary" className="bg-violet-500/10 text-violet-700 dark:text-violet-400">{loading ? "—" : (data?.metrics.users ?? 0)}</Badge>
            </div>
            <Progress value={clamp(loading ? 0 : (data?.metrics.completionRate ?? 0), 0, 100)} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">{t("completionRate")} • {loading ? "—" : `${data?.metrics.completionRate ?? 0}%`}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-card to-card backdrop-blur border-amber-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Icon name="tabler:chart-bar" className="h-4 w-4 text-amber-500" />
              {t("performanceScore")}
            </CardDescription>
            <CardTitle className="text-4xl font-bold">{loading ? "—" : `${data?.metrics.overallHealth ?? 0}%`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("approved")}</span>
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">{loading ? "—" : (data?.metrics.approvedLast30Days ?? 0)}</Badge>
            </div>
            <Progress value={data?.metrics.overallHealth ?? 0} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">{t("atAGlanceKpiPerformanceDesc")}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t("browseByType")}</CardTitle>
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
              <Bar categories={topTypeBar.categories} values={topTypeBar.values} height={300} color="#3b82f6" />
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("statusDistribution")}</CardTitle>
            <CardDescription className="mt-1">{t("currentStatusOverview")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : statusDonut.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              <Donut items={statusDonut} height={280} />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t("monthlyActivityTrend")}</CardTitle>
                <CardDescription className="mt-1">{t("kpiUpdatesAndSubmissions")}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${locale}/entities/kpi`}>{t("viewDetails")}<Icon name="tabler:arrow-right" className="ms-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : (
              <AreaLine categories={monthLabels} values={data?.monthlyActivity.values ?? []} height={280} color="#8b5cf6" />
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("topPerformers")}</CardTitle>
            <CardDescription className="mt-1">{t("kpisExceedingTargets")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : (data?.topKpis?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noKpisFound")}</div>
            ) : (
              data?.topKpis?.map((kpi) => (
                <div key={kpi.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <Link
                      href={`/${locale}/entities/kpi/${kpi.id}`}
                      className="font-medium hover:underline underline-offset-4 decoration-primary/40 hover:decoration-primary/70"
                    >
                      {df(kpi.title, kpi.titleAr)}
                    </Link>
                    <Badge variant="outline" className={statusColorForAchievement(kpi.value ?? 0)}>{kpi.value ?? 0}%</Badge>
                  </div>
                  <Progress value={kpi.value ?? 0} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("target")}: 100%</span>
                    <span>{kpi.updatedAt ? formatDate(kpi.updatedAt) : "—"}</span>
                  </div>
                </div>
              )) ?? null
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("quickActions")}</CardTitle>
            <CardDescription className="mt-1">{t("navigateToKeyAreas")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" className="h-auto flex-col items-start gap-2 p-4">
                <Link href={`/${locale}/entities/kpi`}>
                  <Icon name="tabler:target" className="h-5 w-5 text-blue-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("kpiManagement")}</div>
                    <div className="text-xs text-muted-foreground">{t("viewAndManageKpis")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto flex-col items-start gap-2 p-4">
                <Link href={`/${locale}/entities/objective`}>
                  <Icon name="tabler:flag-3" className="h-5 w-5 text-emerald-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("objectives")}</div>
                    <div className="text-xs text-muted-foreground">{t("trackStrategicGoals")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto flex-col items-start gap-2 p-4">
                <Link href={`/${locale}/responsibilities`}>
                  <Icon name="tabler:user-check" className="h-5 w-5 text-violet-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("responsibilities")}</div>
                    <div className="text-xs text-muted-foreground">{t("manageAssignments")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto flex-col items-start gap-2 p-4">
                <Link href={`/${locale}/organization`}>
                  <Icon name="tabler:building" className="h-5 w-5 text-amber-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("organization")}</div>
                    <div className="text-xs text-muted-foreground">{t("viewOrgStructure")}</div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("specificDashboards")}</CardTitle>
            <CardDescription className="mt-1">{t("specificDashboardsSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {dashboards.map((d) => (
                <Button key={d.slug} asChild variant="outline" className="h-auto flex-col items-start gap-2 p-4">
                  <Link href={`/${locale}/dashboards/${d.slug}`}>
                    <Icon name={d.icon} className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">{df(d.title, d.titleAr)}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{df(d.description, d.descriptionAr)}</div>
                    </div>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
