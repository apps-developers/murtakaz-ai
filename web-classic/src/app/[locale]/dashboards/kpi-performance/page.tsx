"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Bar } from "@/components/charts/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getKpiPerformanceInsights } from "@/actions/insights";
import { useLocale } from "@/providers/locale-provider";
import { statusColorForAchievement } from "@/lib/rag";

export default function KPIPerformanceDashboardPage() {
  const { locale, df, t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof getKpiPerformanceInsights>> | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const res = await getKpiPerformanceInsights();
      if (mounted) { setData(res); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const varianceTop = data?.varianceTop ?? [];
  const freshnessSorted = data?.freshnessSorted ?? [];
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("kpiPerformanceDashboardTitle")}
        subtitle={t("kpiPerformanceDashboardSubtitle")}
        icon={<Icon name="tabler:chart-bar" className="h-5 w-5" />}
        breadcrumbs={[
          { label: t("dashboards"), href: `/${locale}/dashboards` },
          { label: t("kpiPerformanceDashboard") },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("varianceDistribution")}</CardTitle>
              <Icon name="tabler:chart-bar" className="text-muted-foreground" />
            </div>
            <CardDescription className="text-muted-foreground">{t("topKpiVarianceDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : varianceTop.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noKpisFound")}</div>
            ) : (
              <Bar
                categories={varianceTop.map((k) => df(k.title, k.titleAr))}
                values={varianceTop.map((k) => k.variance ?? 0)}
                color="#34d399"
                formatter={(value) => `${value > 0 ? "+" : ""}${value}%`}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("freshnessWatch")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("oldestUpdatesDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : freshnessSorted.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noKpisFound")}</div>
            ) : (
              freshnessSorted.map((kpi) => (
                <Link
                  key={kpi.id}
                  href={`/${locale}/entities/kpi/${kpi.id}`}
                  className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                >
                  <p className="text-sm font-semibold text-foreground">{df(kpi.title, kpi.titleAr)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {kpi.freshnessDays} {t("daysSinceLastUpdate")}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("kpiScorecard")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("catalogDrilldownDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noKpisFound")}</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">{t("kpi")}</TableHead>
                      <TableHead className="text-muted-foreground">{t("owner")}</TableHead>
                      <TableHead className="text-muted-foreground">{t("current")}</TableHead>
                      <TableHead className="text-muted-foreground">{t("target")}</TableHead>
                      <TableHead className="text-muted-foreground">{t("variance")}</TableHead>
                      <TableHead className="text-right text-muted-foreground">{t("freshness")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((kpi) => (
                      <TableRow key={kpi.id} className="border-border hover:bg-card/50">
                        <TableCell className="font-medium text-foreground">
                          <Link href={`/${locale}/entities/kpi/${kpi.id}`} className="hover:underline">
                            {df(kpi.title, kpi.titleAr)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{kpi.owner ?? "—"}</TableCell>
                        <TableCell className="text-foreground">
                          {kpi.current !== null ? `${kpi.current}%` : "—"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {kpi.target !== null ? `${kpi.target}${kpi.unit ?? ""}` : "—"}
                        </TableCell>
                        <TableCell>
                          {kpi.variance !== null ? (
                            <Badge variant="outline" className={statusColorForAchievement(100 + kpi.variance)}>
                              {kpi.variance > 0 ? "+" : ""}{kpi.variance}%
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {kpi.freshnessDays !== null ? `${kpi.freshnessDays}d` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
