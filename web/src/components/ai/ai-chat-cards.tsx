"use client";

import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";

// ── Types ─────────────────────────────────────────────────────────────────────

export type KpiSummaryCardData = {
  totalKpis: number;
  green: number;
  amber: number;
  red: number;
  noData?: number;
  healthScore: number;
  period?: string;
};

export type KpiRedListCardData = {
  period?: string;
  kpis: Array<{
    name: string;
    nameAr?: string;
    value: string;
    target: string;
    unit?: string;
    dept?: string;
    isAnomaly?: boolean;
  }>;
};

export type ApprovalsCardData = {
  totalPending: number;
  items: Array<{
    kpiName: string;
    kpiNameAr?: string;
    submittedBy: string;
    value: string;
    target: string;
    isAnomaly?: boolean;
    dept?: string;
  }>;
};

export type DeptHealthCardData = {
  departments: Array<{
    name: string;
    nameAr?: string;
    score: number;
    green: number;
    amber: number;
    red: number;
  }>;
};

export type TrendCardData = {
  periodA: string;
  periodB: string;
  improved: number;
  declined: number;
  unchanged: number;
  highlights: Array<{
    name: string;
    nameAr?: string;
    change: number;
    direction: "up" | "down";
  }>;
};

export type ChatCard =
  | { type: "kpi-summary"; data: KpiSummaryCardData }
  | { type: "kpi-red-list"; data: KpiRedListCardData }
  | { type: "approvals"; data: ApprovalsCardData }
  | { type: "dept-health"; data: DeptHealthCardData }
  | { type: "trend"; data: TrendCardData };

// ── KPI Summary Card ──────────────────────────────────────────────────────────

function KpiSummaryCard({ data }: { data: KpiSummaryCardData }) {
  const { tr } = useLocale();
  const total = data.totalKpis;
  const greenPct = total > 0 ? (data.green / total) * 100 : 0;
  const amberPct = total > 0 ? (data.amber / total) * 100 : 0;
  const redPct = total > 0 ? (data.red / total) * 100 : 0;
  const noDataPct = total > 0 ? ((data.noData ?? 0) / total) * 100 : 0;

  const scoreColor =
    data.healthScore >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : data.healthScore >= 60
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  const borderColor =
    data.healthScore >= 80
      ? "border-emerald-500/20 bg-emerald-500/5"
      : data.healthScore >= 60
      ? "border-amber-500/20 bg-amber-500/5"
      : "border-red-500/20 bg-red-500/5";

  return (
    <div className={cn("mt-2 rounded-xl border p-3 space-y-3 text-xs", borderColor)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon name="tabler:chart-pie-2" className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground">
            {tr("KPI Health Overview", "نظرة عامة على صحة المؤشرات")}
          </span>
        </div>
        {data.period && (
          <span className="rounded-full border border-border bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground">
            {data.period}
          </span>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-0.5 rounded-xl bg-background/60 px-3 py-2 shrink-0">
          <span className={cn("text-xl font-bold", scoreColor)}>{data.healthScore}%</span>
          <span className="text-[10px] text-muted-foreground">{tr("Health", "الصحة")}</span>
        </div>
        <div className="flex-1 space-y-1.5 pt-0.5">
          {[
            { label: tr("On Track", "في المسار"), value: data.green, pct: greenPct, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
            { label: tr("At Risk", "في خطر"), value: data.amber, pct: amberPct, color: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" },
            { label: tr("Behind", "متأخر"), value: data.red, pct: redPct, color: "bg-red-500", text: "text-red-600 dark:text-red-400" },
            ...(data.noData ? [{ label: tr("No Data", "لا بيانات"), value: data.noData, pct: noDataPct, color: "bg-muted-foreground/40", text: "text-muted-foreground" }] : []),
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-muted-foreground">{row.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                <div className={cn("h-full rounded-full", row.color)} style={{ width: `${row.pct}%` }} />
              </div>
              <span className={cn("w-5 text-right font-bold", row.text)}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 flex">
        <div className="bg-emerald-500 h-full" style={{ width: `${greenPct}%` }} />
        <div className="bg-amber-400 h-full" style={{ width: `${amberPct}%` }} />
        <div className="bg-red-500 h-full" style={{ width: `${redPct}%` }} />
        <div className="bg-muted-foreground/30 h-full" style={{ width: `${noDataPct}%` }} />
      </div>

      <p className="text-muted-foreground">
        {tr("Total KPIs:", "إجمالي المؤشرات:")} <strong className="text-foreground">{total}</strong>
      </p>
    </div>
  );
}

// ── KPI Red List Card ─────────────────────────────────────────────────────────

function KpiRedListCard({ data }: { data: KpiRedListCardData }) {
  const { tr, isArabic } = useLocale();

  return (
    <div className="mt-2 rounded-xl border border-red-500/25 bg-red-500/5 p-3 space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon name="tabler:circle-x" className="h-3.5 w-3.5 text-red-500" />
          <span className="font-semibold text-foreground">
            {tr("KPIs Behind Target", "المؤشرات المتأخرة عن الهدف")}
          </span>
        </div>
        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
          {data.kpis.length}
        </span>
      </div>

      <div className="space-y-1">
        {data.kpis.map((kpi, i) => (
          <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-background/60 px-2.5 py-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate font-medium text-foreground">
                  {isArabic && kpi.nameAr ? kpi.nameAr : kpi.name}
                </p>
                {kpi.isAnomaly && (
                  <Icon name="tabler:alert-triangle" className="h-3 w-3 text-amber-500 shrink-0" />
                )}
              </div>
              {kpi.dept && <p className="text-muted-foreground">{kpi.dept}</p>}
            </div>
            <div className="shrink-0 text-right">
              <span className="font-bold text-red-600 dark:text-red-400">
                {kpi.value}{kpi.unit}
              </span>
              <span className="text-muted-foreground"> / {kpi.target}{kpi.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {data.period && (
        <p className="text-[10px] text-muted-foreground">{data.period}</p>
      )}
    </div>
  );
}

// ── Approvals Card ────────────────────────────────────────────────────────────

function ApprovalsCard({ data }: { data: ApprovalsCardData }) {
  const { tr, isArabic } = useLocale();

  return (
    <div className="mt-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon name="tabler:clock-check" className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-semibold text-foreground">
            {tr("Pending Approvals", "الموافقات المعلقة")}
          </span>
        </div>
        <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
          {data.totalPending}
        </span>
      </div>

      <div className="space-y-1">
        {data.items.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-background/60 px-2.5 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {isArabic && item.kpiNameAr ? item.kpiNameAr : item.kpiName}
              </p>
              <p className="text-muted-foreground">
                {item.submittedBy}{item.dept ? ` · ${item.dept}` : ""}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              <div className="text-right">
                <span className="font-bold text-foreground">{item.value}</span>
                <span className="text-muted-foreground"> / {item.target}</span>
              </div>
              {item.isAnomaly && (
                <div className="rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                  ⚠
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Department Health Card ────────────────────────────────────────────────────

function DeptHealthCard({ data }: { data: DeptHealthCardData }) {
  const { tr, isArabic } = useLocale();

  return (
    <div className="mt-2 rounded-xl border border-border bg-background/80 p-3 space-y-2 text-xs">
      <div className="flex items-center gap-1.5">
        <Icon name="tabler:building" className="h-3.5 w-3.5 text-primary" />
        <span className="font-semibold text-foreground">
          {tr("Department Performance", "أداء الإدارات")}
        </span>
      </div>

      <div className="space-y-1.5">
        {data.departments.map((dept, i) => {
          const total = dept.green + dept.amber + dept.red;
          const scoreColor =
            dept.score >= 80
              ? "text-emerald-600 dark:text-emerald-400"
              : dept.score >= 60
              ? "text-amber-600 dark:text-amber-400"
              : "text-red-600 dark:text-red-400";

          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-[72px] shrink-0 truncate text-muted-foreground">
                {isArabic && dept.nameAr ? dept.nameAr : dept.name}
              </div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/60 flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${total > 0 ? (dept.green / total) * 100 : 0}%` }} />
                <div className="bg-amber-400 h-full" style={{ width: `${total > 0 ? (dept.amber / total) * 100 : 0}%` }} />
                <div className="bg-red-500 h-full" style={{ width: `${total > 0 ? (dept.red / total) * 100 : 0}%` }} />
              </div>
              <span className={cn("w-8 shrink-0 text-right font-bold", scoreColor)}>{dept.score}%</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-0.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {tr("On Track", "في المسار")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {tr("At Risk", "في خطر")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          {tr("Behind", "متأخر")}
        </span>
      </div>
    </div>
  );
}

// ── Trend Card ────────────────────────────────────────────────────────────────

function TrendCard({ data }: { data: TrendCardData }) {
  const { tr, isArabic } = useLocale();

  return (
    <div className="mt-2 rounded-xl border border-border bg-background/80 p-3 space-y-2.5 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon name="tabler:trending-up" className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground">
            {tr("Period Comparison", "مقارنة الفترات")}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-muted-foreground">
          <span>{data.periodA}</span>
          <Icon name="tabler:arrow-narrow-right" className="h-3 w-3" />
          <span>{data.periodB}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: tr("Improved", "تحسّن"), value: data.improved, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: "tabler:trending-up" },
          { label: tr("Declined", "تراجع"), value: data.declined, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: "tabler:trending-down" },
          { label: tr("Stable", "مستقر"), value: data.unchanged, color: "text-muted-foreground", bg: "bg-muted/30 border-border", icon: "tabler:minus" },
        ].map((stat) => (
          <div key={stat.label} className={cn("rounded-lg border p-2 text-center space-y-1", stat.bg)}>
            <Icon name={stat.icon} className={cn("h-3.5 w-3.5 mx-auto", stat.color)} />
            <p className={cn("text-base font-bold", stat.color)}>{stat.value}</p>
            <p className="text-muted-foreground leading-none">{stat.label}</p>
          </div>
        ))}
      </div>

      {data.highlights.length > 0 && (
        <>
          <p className="font-medium text-muted-foreground">{tr("Notable changes:", "تغييرات بارزة:")}</p>
          <div className="space-y-1">
            {data.highlights.slice(0, 4).map((h, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded bg-muted/20 px-2 py-1">
                <span className="truncate text-foreground">{isArabic && h.nameAr ? h.nameAr : h.name}</span>
                <div className={cn("flex items-center gap-0.5 font-bold shrink-0", h.direction === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  <Icon name={h.direction === "up" ? "tabler:arrow-up-right" : "tabler:arrow-down-right"} className="h-3 w-3" />
                  {Math.abs(h.change)}%
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ChatCardRenderer({ card }: { card: ChatCard }) {
  if (card.type === "kpi-summary") return <KpiSummaryCard data={card.data} />;
  if (card.type === "kpi-red-list") return <KpiRedListCard data={card.data} />;
  if (card.type === "approvals") return <ApprovalsCard data={card.data} />;
  if (card.type === "dept-health") return <DeptHealthCard data={card.data} />;
  if (card.type === "trend") return <TrendCard data={card.data} />;
  return null;
}
