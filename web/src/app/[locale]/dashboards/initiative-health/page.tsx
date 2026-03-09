"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitiativeHealthInsights } from "@/actions/insights";
import { useLocale } from "@/providers/locale-provider";

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  AT_RISK: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  PLANNED: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
};

export default function InitiativeHealthDashboardPage() {
  const { locale, df, t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof getInitiativeHealthInsights>> | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const res = await getInitiativeHealthInsights();
      if (mounted) { setData(res); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const atRiskList = data?.atRiskList ?? [];
  const allInitiatives = data?.allInitiatives ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("initiativeHealthDashboard")}
        subtitle={t("initiativeHealthDashboardSubtitle")}
        icon={<Icon name="tabler:activity-heartbeat" className="h-5 w-5" />}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("total"), value: summary?.total, color: "text-foreground" },
          { label: t("atRisk"), value: summary?.atRisk, color: "text-amber-600 dark:text-amber-400" },
          { label: t("active"), value: summary?.onTrack, color: "text-emerald-600 dark:text-emerald-400" },
          { label: t("completed"), value: summary?.completed, color: "text-blue-600 dark:text-blue-400" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-border bg-card/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className={`text-3xl font-bold ${color}`}>{loading ? "—" : (value ?? 0)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("initiativesRequiringAttention")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("investigateHealthDriversDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : atRiskList.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              atRiskList.map((initiative) => (
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
                    <Badge variant="outline" className={statusColor[initiative.status] ?? ""}>{initiative.status}</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("allInitiatives")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("activeStrategicInitiatives")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : allInitiatives.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              allInitiatives.map((initiative) => (
                <Link
                  key={initiative.id}
                  href={`/${locale}/entities/initiative/${initiative.id}`}
                  className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{df(initiative.title, initiative.titleAr)}</p>
                    <Badge variant="outline" className={statusColor[initiative.status] ?? ""}>{initiative.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{initiative.owner}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
