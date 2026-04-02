"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { getStrategicPillarsOverview } from "@/actions/insights";

type PillarData = Awaited<ReturnType<typeof getStrategicPillarsOverview>>[number];

function achievementColor(value: number | null) {
  if (value === null) return "text-muted-foreground";
  if (value >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (value >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function achievementBorder(value: number | null) {
  if (value === null) return "border-border";
  if (value >= 80) return "border-emerald-500/30";
  if (value >= 60) return "border-amber-500/30";
  return "border-rose-500/30";
}

function achievementBg(value: number | null) {
  if (value === null) return "from-muted/10";
  if (value >= 80) return "from-emerald-500/10";
  if (value >= 60) return "from-amber-500/10";
  return "from-rose-500/10";
}

export default function PillarsPage() {
  const { user, loading: authLoading } = useAuth();
  const { locale, t, tr, df, formatNumber } = useLocale();
  const [loading, setLoading] = useState(true);
  const [pillars, setPillars] = useState<PillarData[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    setLoading(true);
    void (async () => {
      try {
        const data = await getStrategicPillarsOverview();
        if (mounted) setPillars(data);
      } catch (e) {
        console.error("Failed to load pillars", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [authLoading, user]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (authLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("noActiveSession")}</p>
        <Link
          href={`/${locale}/auth/login`}
          className="mt-3 inline-flex text-sm font-semibold text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary/70"
        >
          {t("goToSignIn")}
        </Link>
      </div>
    );
  }

  const totalObjectives = pillars.reduce((s, p) => s + p.objectiveCount, 0);
  const totalKpis = pillars.reduce((s, p) => s + p.kpiCount, 0);
  const avgScore = pillars.length > 0
    ? Math.round(pillars.reduce((s, p) => s + (p.value ?? 0), 0) / pillars.length * 10) / 10
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tr("Strategic Pillars", "الركائز الاستراتيجية")}
        subtitle={tr("Overview of all strategic pillars and their performance", "نظرة عامة على جميع الركائز الاستراتيجية وأدائها")}
        icon={<Icon name="tabler:layers-subtract" className="h-5 w-5" />}
        breadcrumbs={[{ label: tr("Pillars", "الركائز") }]}
      />

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-violet-500/10 via-card to-card backdrop-blur border-violet-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
              <Icon name="tabler:columns-3" className="h-4 w-4" />
              {tr("Pillars", "الركائز")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? "—" : pillars.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 via-card to-card backdrop-blur border-blue-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Icon name="tabler:flag-3" className="h-4 w-4" />
              {t("objectives")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? "—" : totalObjectives}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 via-card to-card backdrop-blur border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Icon name="tabler:chart-bar" className="h-4 w-4" />
              {t("kpis")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? "—" : totalKpis}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 via-card to-card backdrop-blur border-amber-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Icon name="tabler:activity" className="h-4 w-4" />
              {tr("Avg Score", "متوسط الأداء")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {loading ? "—" : avgScore !== null ? `${avgScore}%` : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      {/* Pillar Cards */}
      {loading ? (
        <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
      ) : pillars.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
      ) : (
        <div className="space-y-4">
          {pillars.map((pillar) => {
            const isExpanded = expanded.has(pillar.id);
            const achievement = pillar.target && pillar.target > 0 && pillar.value !== null
              ? Math.round((pillar.value / pillar.target) * 100)
              : null;

            return (
              <Card key={pillar.id} className={`bg-gradient-to-br ${achievementBg(pillar.value)} via-card to-card backdrop-blur shadow-sm ${achievementBorder(pillar.value)} transition-all`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggle(pillar.id)}
                        className="mt-1 rounded-md p-1 hover:bg-muted/50 transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rtl:rotate-180" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/${locale}/entities/pillar/${pillar.id}`}
                          className="text-lg font-semibold hover:underline underline-offset-4 decoration-primary/40"
                        >
                          {df(pillar.title, pillar.titleAr)}
                        </Link>
                        {pillar.key ? <p className="mt-0.5 text-xs text-muted-foreground">{pillar.key}</p> : null}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Icon name="tabler:flag-3" className="h-3 w-3" />
                            {pillar.objectiveCount} {tr("objectives", "أهداف")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="tabler:chart-bar" className="h-3 w-3" />
                            {pillar.kpiCount} {tr("KPIs", "مؤشرات")}
                          </span>
                          {pillar.initiativeCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Icon name="tabler:rocket" className="h-3 w-3" />
                              {pillar.initiativeCount} {tr("initiatives", "مبادرات")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-bold tabular-nums ${achievementColor(pillar.value)}`}>
                        {pillar.value !== null ? `${formatNumber(Math.round(pillar.value * 10) / 10)}%` : "—"}
                      </div>
                      {pillar.target !== null && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {tr("Target", "المستهدف")}: {formatNumber(pillar.target)}%
                        </div>
                      )}
                      {achievement !== null && (
                        <Badge variant="outline" className={`mt-1 text-[10px] ${
                          achievement >= 80 ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
                          achievement >= 60 ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                          "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        }`}>
                          {achievement}% {tr("achievement", "إنجاز")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <Progress value={Math.min(100, pillar.value ?? 0)} className="mt-3 h-2" />
                </CardHeader>

                {/* Expanded: Objectives */}
                {isExpanded && (
                  <CardContent className="pt-0 space-y-3">
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold mb-3">{t("objectives")} ({pillar.objectiveCount})</h4>
                      {pillar.objectives.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t("noItemsYet")}</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {pillar.objectives.map((obj) => {
                            const objAch = obj.target && obj.target > 0 && obj.value !== null
                              ? Math.round((obj.value / obj.target) * 100)
                              : null;
                            return (
                              <Link
                                key={obj.id}
                                href={`/${locale}/entities/objective/${obj.id}`}
                                className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3 transition-all hover:border-primary/30 hover:shadow-sm"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate group-hover:underline underline-offset-4 decoration-primary/40">
                                    {df(obj.title, obj.titleAr)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {obj.key} · {obj.kpiCount} {tr("KPIs", "مؤشرات")}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`text-sm font-semibold tabular-nums ${achievementColor(obj.value)}`}>
                                    {obj.value !== null ? `${formatNumber(Math.round(obj.value * 10) / 10)}` : "—"}
                                  </span>
                                  {obj.target !== null && (
                                    <p className="text-[10px] text-muted-foreground">/ {formatNumber(obj.target)}</p>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
