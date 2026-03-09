"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getManagerDashboardInsights } from "@/actions/insights";
import { useLocale } from "@/providers/locale-provider";

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  AT_RISK: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  PLANNED: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
};

export default function ManagerDashboardPage() {
  const { t, locale, df } = useLocale();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof getManagerDashboardInsights>> | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const res = await getManagerDashboardInsights();
      if (mounted) { setData(res); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const ownedEntities = data?.ownedEntities ?? [];
  const assignedEntities = data?.assignedEntities ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("managerDashboardTitle")}
        subtitle={t("managerDashboardSubtitle")}
        icon={<Icon name="tabler:users-group" className="h-5 w-5" />}
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>{t("pendingApprovals")}</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {loading ? "—" : (data?.pendingApprovals ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>{t("entitiesAtRisk")}</CardDescription>
            <CardTitle className="text-3xl font-bold text-rose-600 dark:text-rose-400">
              {loading ? "—" : (data?.atRiskCount ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("myOwnedEntities")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("managerOwnershipFilterDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : ownedEntities.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              ownedEntities.map((entity) => (
                <Link
                  key={entity.id}
                  href={`/${locale}/entities/${entity.typeCode}/${entity.id}`}
                  className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{df(entity.title, entity.titleAr)}</p>
                      <p className="text-xs text-muted-foreground">{entity.typeName}</p>
                    </div>
                    <Badge variant="outline" className={statusColor[entity.status] ?? ""}>{entity.status}</Badge>
                  </div>
                  {entity.achievement !== null && (
                    <div className="mt-2 space-y-1">
                      <Progress value={entity.achievement} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">{entity.achievement}%</p>
                    </div>
                  )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("myAssignedEntities")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("teamAssignmentsFilterDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : assignedEntities.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              assignedEntities.map((entity) => (
                <Link
                  key={entity.id}
                  href={`/${locale}/entities/${entity.typeCode}/${entity.id}`}
                  className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{df(entity.title, entity.titleAr)}</p>
                    <Badge variant="outline" className={statusColor[entity.status] ?? ""}>{entity.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{entity.typeName}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
