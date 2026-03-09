"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Donut } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRiskEscalationInsights } from "@/actions/insights";
import { useLocale } from "@/providers/locale-provider";

export default function RiskEscalationDashboardPage() {
  const { t, locale, df } = useLocale();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof getRiskEscalationInsights>> | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const res = await getRiskEscalationInsights();
      if (mounted) { setData(res); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const escalatedList = data?.escalatedList ?? [];
  const severityDonut = data?.severityDonut ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("riskEscalationDashboardTitle")}
        subtitle={t("riskEscalationDashboardSubtitle")}
        icon={<Icon name="tabler:shield-exclamation" className="h-5 w-5" />}
        breadcrumbs={[
          { label: t("dashboards"), href: `/${locale}/dashboards` },
          { label: t("riskEscalationDashboardTitle") },
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>{t("totalRisks")}</CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? "—" : (summary?.total ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>{t("escalatedRisksCount")}</CardDescription>
            <CardTitle className="text-3xl font-bold text-rose-600 dark:text-rose-400">{loading ? "—" : (summary?.escalated ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>{t("active")}</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-600 dark:text-amber-400">{loading ? "—" : (summary?.ACTIVE ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("severityDistribution")}</CardTitle>
              <Icon name="tabler:shield-exclamation" className="text-muted-foreground" />
            </div>
            <CardDescription className="text-muted-foreground">{t("acrossOpenRisksDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : severityDonut.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              <Donut items={severityDonut} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("escalatedRisks")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("executiveVisibilityDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : escalatedList.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              escalatedList.map((risk) => (
                <Link
                  key={risk.id}
                  href={`/${locale}/entities/risk/${risk.id}`}
                  className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{df(risk.title, risk.titleAr)}</p>
                      <p className="text-xs text-muted-foreground">{risk.owner}</p>
                    </div>
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20">
                      {t("atRisk")}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
