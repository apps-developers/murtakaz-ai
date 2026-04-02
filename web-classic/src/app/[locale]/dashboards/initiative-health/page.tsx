"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getInitiativeHealthInsights } from "@/actions/insights";
import { useLocale } from "@/providers/locale-provider";

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  AT_RISK: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  PLANNED: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
};

const statusLabel: Record<string, { en: string; ar: string }> = {
  ACTIVE: { en: "Active", ar: "نشط" },
  AT_RISK: { en: "At Risk", ar: "معرض للخطر" },
  PLANNED: { en: "Planned", ar: "مخطط" },
  COMPLETED: { en: "Completed", ar: "مكتمل" },
};

function InitiativeCard({ initiative, locale, df, formatNumber, tr }: {
  initiative: { id: string; title: string; titleAr: string | null; owner: string; status: string; value: number | null; target: number | null; achievement: number | null; pillarTitle: string | null; pillarTitleAr: string | null };
  locale: string;
  df: (en: string | null | undefined, ar: string | null | undefined) => string;
  formatNumber: (n: number) => string;
  tr: (en: string, ar: string) => string;
}) {
  const pct = initiative.achievement !== null ? Math.min(100, Math.max(0, initiative.achievement)) : 0;
  const sl = statusLabel[initiative.status] ?? { en: initiative.status, ar: initiative.status };

  return (
    <Link
      href={`/${locale}/entities/initiative/${initiative.id}`}
      className="group block rounded-xl border border-border bg-background/50 p-4 transition-all hover:shadow-md hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate group-hover:underline underline-offset-4 decoration-primary/40">
            {df(initiative.title, initiative.titleAr)}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">{initiative.owner}</p>
            {initiative.pillarTitle && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <p className="text-xs text-muted-foreground truncate">{df(initiative.pillarTitle, initiative.pillarTitleAr)}</p>
              </>
            )}
          </div>
        </div>
        <Badge variant="outline" className={`shrink-0 text-[10px] ${statusColor[initiative.status] ?? ""}`}>
          {locale === "ar" ? sl.ar : sl.en}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <Progress value={pct} className="h-2 flex-1" />
        <span className={`text-sm font-bold tabular-nums shrink-0 ${
          pct >= 80 ? "text-emerald-600 dark:text-emerald-400" :
          pct >= 60 ? "text-amber-600 dark:text-amber-400" :
          pct > 0 ? "text-rose-600 dark:text-rose-400" :
          "text-muted-foreground"
        }`}>
          {initiative.achievement !== null ? `${formatNumber(initiative.achievement)}%` : "—"}
        </span>
      </div>

      {(initiative.value !== null || initiative.target !== null) && (
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
          {initiative.value !== null && (
            <span>{tr("Current", "الحالي")}: {formatNumber(Math.round(initiative.value * 10) / 10)}</span>
          )}
          {initiative.target !== null && (
            <span>{tr("Target", "المستهدف")}: {formatNumber(initiative.target)}</span>
          )}
        </div>
      )}
    </Link>
  );
}

export default function InitiativeHealthDashboardPage() {
  const { locale, df, t, tr, formatNumber } = useLocale();
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

  const avgAchievement = allInitiatives.length > 0
    ? Math.round(allInitiatives.reduce((s, i) => s + (i.achievement ?? 0), 0) / allInitiatives.length)
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("initiativeHealthDashboard")}
        subtitle={t("initiativeHealthDashboardSubtitle")}
        icon={<Icon name="tabler:activity-heartbeat" className="h-5 w-5" />}
        breadcrumbs={[
          { label: t("dashboards"), href: `/${locale}/dashboards` },
          { label: t("initiativeHealthDashboard") },
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: t("total"), value: summary?.total, color: "text-foreground", icon: "tabler:rocket", accent: "from-violet-500/10 border-violet-500/20" },
          { label: t("active"), value: summary?.onTrack, color: "text-emerald-600 dark:text-emerald-400", icon: "tabler:check", accent: "from-emerald-500/10 border-emerald-500/20" },
          { label: t("atRisk"), value: summary?.atRisk, color: "text-amber-600 dark:text-amber-400", icon: "tabler:alert-triangle", accent: "from-amber-500/10 border-amber-500/20" },
          { label: t("completed"), value: summary?.completed, color: "text-blue-600 dark:text-blue-400", icon: "tabler:circle-check", accent: "from-blue-500/10 border-blue-500/20" },
          { label: tr("Avg Progress", "متوسط التقدم"), value: avgAchievement !== null ? `${avgAchievement}%` : "—", color: "text-foreground", icon: "tabler:trending-up", accent: "from-rose-500/10 border-rose-500/20" },
        ].map(({ label, value, color, icon, accent }) => (
          <Card key={label} className={`bg-gradient-to-br ${accent} via-card to-card backdrop-blur shadow-sm`}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Icon name={icon} className="h-3.5 w-3.5" />
                {label}
              </CardDescription>
              <CardTitle className={`text-3xl font-bold ${color}`}>{loading ? "—" : (value ?? 0)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="tabler:alert-triangle" className="h-4 w-4 text-amber-500" />
              {t("initiativesRequiringAttention")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">{t("investigateHealthDriversDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : atRiskList.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              atRiskList.map((initiative) => (
                <InitiativeCard key={initiative.id} initiative={initiative} locale={locale} df={df} formatNumber={formatNumber} tr={tr} />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="tabler:list" className="h-4 w-4" />
              {t("allInitiatives")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">{t("activeStrategicInitiatives")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
            ) : allInitiatives.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
            ) : (
              allInitiatives.map((initiative) => (
                <InitiativeCard key={initiative.id} initiative={initiative} locale={locale} df={df} formatNumber={formatNumber} tr={tr} />
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
