"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { getPillarDashboardInsights } from "@/actions/insights";
import { Bar, Donut } from "@/components/charts/dashboard-charts";
import { statusColorForAchievement } from "@/lib/rag";

export default function PillarDashboardPage() {
  const { t, locale, df } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getPillarDashboardInsights>> | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await getPillarDashboardInsights();
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

  const pillarHealthDonut = useMemo(() => {
    const rows = data?.pillarHealth ?? [];
    return rows.map((x: { name: string; avgAchievement: number }) => ({
      name: x.name,
      value: 1,
      color: statusColorForAchievement(x.avgAchievement),
    }));
  }, [data?.pillarHealth]);

  const kpiByPillarBar = useMemo(() => {
    const rows = data?.kpiByPillar ?? [];
    return {
      categories: rows.map((x: { name: string; nameAr: string | null }) => df(x.name, x.nameAr)),
      values: rows.map((x: { count: number }) => x.count),
    };
  }, [data?.kpiByPillar, df]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pillar")}
        subtitle={t("performanceDashboardSubtitle")}
        icon={<Icon name="tabler:layers-subtract" className="h-5 w-5" />}
        breadcrumbs={[{ label: t("dashboards") }, { label: t("pillar") }]}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/${locale}/dashboards`}>
                <Icon name="tabler:arrow-left" className="me-2 h-4 w-4" />
                {t("back")}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/${locale}/pillars`}>
                <Icon name="tabler:layers-subtract" className="me-2 h-4 w-4" />
                {t("pillar")}
              </Link>
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("pillar")}</CardDescription>
                <CardTitle className="text-2xl">{data?.summary?.totalPillars ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{t("active")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("status")}</CardDescription>
                <CardTitle className="text-2xl">
                  {data?.summary?.avgAchievement != null
                    ? `${Math.round(data.summary.avgAchievement)}%`
                    : "—"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{t("average")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("initiative")}</CardDescription>
                <CardTitle className="text-2xl">{data?.summary?.totalInitiatives ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">—</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("kpis")}</CardDescription>
                <CardTitle className="text-2xl">{data?.summary?.totalKpis ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">—</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("pillar")} {t("health")}</CardTitle>
                <CardDescription>{t("kpis")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Donut items={pillarHealthDonut} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("kpis")}</CardTitle>
                <CardDescription>{t("kpis")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Bar categories={kpiByPillarBar.categories} values={kpiByPillarBar.values} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("pillar")}</CardTitle>
              <CardDescription>—</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.pillars?.length ? (
                  data.pillars.map((p: { id: string; name: string; nameAr: string | null; status: string; initiativeCount: number; kpiCount: number; avgAchievement: number | null }) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-4 rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{df(p.name, p.nameAr)}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.initiativeCount} {t("initiative")} · {p.kpiCount} {t("kpis")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.avgAchievement != null && (
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: statusColorForAchievement(p.avgAchievement),
                              color: statusColorForAchievement(p.avgAchievement),
                            }}
                          >
                            {Math.round(p.avgAchievement)}%
                          </Badge>
                        )}
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/${locale}/pillars/${p.id}`}>→</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
