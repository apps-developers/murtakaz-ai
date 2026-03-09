"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectExecutionInsights } from "@/actions/insights";
import { useLocale } from "@/providers/locale-provider";

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  AT_RISK: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  PLANNED: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
};

export default function ProjectExecutionDashboardPage() {
  const { t, locale, df } = useLocale();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof getProjectExecutionInsights>> | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const res = await getProjectExecutionInsights();
      if (mounted) { setData(res); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const rows = data?.rows ?? [];
  const statusCounts = data?.statusCounts;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("projectExecutionDashboardTitle")}
        subtitle={t("projectExecutionDashboardSubtitle")}
        icon={<Icon name="tabler:timeline" className="h-5 w-5" />}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("active"), value: statusCounts?.ACTIVE, color: "text-emerald-600 dark:text-emerald-400" },
          { label: t("atRisk"), value: statusCounts?.AT_RISK, color: "text-amber-600 dark:text-amber-400" },
          { label: t("planned"), value: statusCounts?.PLANNED, color: "text-slate-600 dark:text-slate-400" },
          { label: t("completed"), value: statusCounts?.COMPLETED, color: "text-blue-600 dark:text-blue-400" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-border bg-card/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className={`text-3xl font-bold ${color}`}>{loading ? "—" : (value ?? 0)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section>
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("projectPortfolio")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("healthStatusDrilldownDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {rows.map((project) => (
                  <Link
                    key={project.id}
                    href={`/${locale}/entities/project/${project.id}`}
                    className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{df(project.title, project.titleAr)}</p>
                        <p className="text-xs text-muted-foreground">{project.owner}</p>
                      </div>
                      <Badge variant="outline" className={statusColor[project.status] ?? ""}>{project.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
