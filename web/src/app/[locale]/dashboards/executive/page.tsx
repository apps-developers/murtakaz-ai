"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { RagBadge } from "@/components/rag-badge";
import { Bar, Donut, SparkLine } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";
import { getExecutiveDashboardInsights } from "@/actions/insights";

export default function ExecutiveDashboardPage() {
  const { t, locale, df, kpiValueStatusLabel } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getExecutiveDashboardInsights>> | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await getExecutiveDashboardInsights();
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

  const kpiPipelineDonut = useMemo(() => {
    const rows = data?.kpiPipeline ?? [];
    const palette: Record<string, string> = {
      NO_DATA: "#64748b",
      DRAFT: "#94a3b8",
      SUBMITTED: "#3b82f6",
      APPROVED: "#10b981",
      LOCKED: "#8b5cf6",
    };
    return rows
      .map((r) => {
        const s = String(r.status ?? "").toUpperCase();
        return {
          name: kpiValueStatusLabel(s),
          value: Number(r.count ?? 0),
          color: palette[s] ?? "#64748b",
        };
      })
      .filter((x) => x.value > 0);
  }, [data?.kpiPipeline, kpiValueStatusLabel]);

  const confidenceTrend = data?.confidenceTrend ?? [];
  const atRisk = data?.atRiskInitiatives ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("ceoExecutiveDashboard")}
        subtitle={t("ceoExecutiveDashboardSubtitle")}
        icon={<Icon name="tabler:layout-dashboard" className="h-5 w-5" />}
      />

      {error ? (
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("dashboardFailedToLoad")}</CardTitle>
            <CardDescription className="text-muted-foreground">{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("deliveryConfidence")}</CardTitle>
              <Icon name="tabler:trend-up" className="text-muted-foreground" />
            </div>
            <CardDescription className="text-muted-foreground">{t("last12PeriodsIndexDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{t("confidenceIndex")}</p>
              <p className="text-sm text-muted-foreground">{loading ? "—" : `${confidenceTrend.at(-1) ?? 0} / 100`}</p>
            </div>
            <SparkLine values={confidenceTrend} />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground">{t("atRiskInitiatives")}</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{loading ? "—" : atRisk.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground">{t("pillarsActive")}</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{loading ? "—" : (data?.pillarsActive ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("kpiPipeline")}</CardTitle>
              <Icon name="tabler:shield-exclamation" className="text-muted-foreground" />
            </div>
            <CardDescription className="text-muted-foreground">{t("kpiPipelineDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : kpiPipelineDonut.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noKpisFound")}</div>
            ) : (
              <Donut items={kpiPipelineDonut} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("governanceAging")}</CardTitle>
              <Icon name="tabler:gavel" className="text-muted-foreground" />
            </div>
            <CardDescription className="text-muted-foreground">{t("approvalQueueAgingDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar categories={data?.approvalsAging.categories ?? []} values={data?.approvalsAging.values ?? []} color="#173763" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{t("initiativesRequiringIntervention")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("investigateHealthDriversDesc")}</CardDescription>
            </div>
            <Link
              href={`/${locale}/entities/initiative`}
              className="text-sm font-medium text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary/70"
            >
              {t("openInitiativeHealth")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : atRisk.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              atRisk.map((initiative) => (
                <Link
                  key={initiative.id}
                  href={`/${locale}/entities/initiative/${initiative.id}`}
                  className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{df(initiative.title, initiative.titleAr)}</p>
                      <p className="text-xs text-muted-foreground">{initiative.owner}</p>
                    </div>
                    <RagBadge health="AMBER" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("topKpis")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("quickLinksKpiDrillDownDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : (data?.topKpis?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noKpisFound")}</div>
            ) : (
              data?.topKpis?.map((kpi) => (
                <Link
                  key={kpi.id}
                  href={`/${locale}/entities/kpi/${kpi.id}`}
                  className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                >
                  <p className="text-sm font-semibold text-foreground">{df(kpi.title, kpi.titleAr)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("current")} {kpi.current ?? "—"}% • {t("target")} {kpi.target}%
                  </p>
                </Link>
              )) ?? null
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
