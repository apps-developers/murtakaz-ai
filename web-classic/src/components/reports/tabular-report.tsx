"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronDown,
  Download,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/icon";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import { getOrgEntitiesByTypeCode } from "@/actions/entities";

type EntityType = { code: string; name: string; nameAr: string | null; sortOrder?: number };
type EntityItem = Awaited<ReturnType<typeof getOrgEntitiesByTypeCode>>["items"][number];

type ReportRow = {
  id: string;
  title: string;
  titleAr: string | null;
  key: string | null;
  entityType: string;
  entityTypeAr: string | null;
  status: string;
  periodType: string;
  value: number | null;
  target: number | null;
  unit: string | null;
  unitAr: string | null;
  achievement: number | null;
  valueStatus: string;
  updatedAt: Date;
};

function latestEntityValue(row: EntityItem): number | null {
  const latest = row.values?.[0];
  if (!latest) return null;
  return latest.finalValue ?? latest.calculatedValue ?? latest.actualValue ?? null;
}

function toReportRow(e: EntityItem, et: EntityType): ReportRow {
  const value = latestEntityValue(e);
  const target = typeof e.targetValue === "number" ? e.targetValue : null;
  const achievement =
    value !== null && target !== null && target !== 0
      ? Math.round((value / target) * 1000) / 10
      : null;
  return {
    id: e.id,
    title: e.title ?? "",
    titleAr: e.titleAr ?? null,
    key: e.key ?? null,
    entityType: et.name,
    entityTypeAr: et.nameAr,
    status: String(e.status ?? ""),
    periodType: String(e.periodType ?? ""),
    value,
    target,
    unit: e.unit ?? null,
    unitAr: e.unitAr ?? null,
    achievement,
    valueStatus: String(e.values?.[0]?.status ?? ""),
    updatedAt: new Date(e.updatedAt),
  };
}

function achievementColor(pct: number | null) {
  if (pct === null) return "text-muted-foreground";
  if (pct >= 100) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 75) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function entityStatusColor(code: string) {
  if (code === "ACTIVE") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
  if (code === "AT_RISK") return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25";
  if (code === "COMPLETED") return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25";
  return "bg-muted/50 text-muted-foreground border-border";
}

function valueStatusColor(code: string) {
  if (code === "APPROVED") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
  if (code === "SUBMITTED") return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25";
  if (code === "DRAFT") return "bg-muted/50 text-muted-foreground border-border";
  return "bg-muted/30 text-muted-foreground/60 border-border/40";
}

export function TabularReport({ entityTypes }: { entityTypes: EntityType[] }) {
  const { locale, t, tr, df, formatNumber, kpiValueStatusLabel } = useLocale();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [allRows, setAllRows] = useState<ReportRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [q, setQ] = useState("");

  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterValueStatus, setFilterValueStatus] = useState<string>("ALL");
  const [filterAchievement, setFilterAchievement] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"title" | "type" | "achievement" | "value" | "updated">("achievement");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const loadAll = useCallback(async () => {
    setLoadingData(true);
    try {
      const results = await Promise.all(
        entityTypes.map((et) =>
          getOrgEntitiesByTypeCode({ entityTypeCode: et.code, page: 1, pageSize: 300 })
            .then((r) => r.items.map((e) => toReportRow(e, et)))
            .catch(() => [] as ReportRow[])
        )
      );
      setAllRows(results.flat());
    } catch {
      setAllRows([]);
    } finally {
      setLoadingData(false);
    }
  }, [entityTypes]);

  useEffect(() => {
    if (!mounted || !user) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void loadAll(), 100);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [mounted, user, loadAll]);

  function periodLabel(code: string) {
    if (code === "MONTHLY") return t("periodMonthly");
    if (code === "QUARTERLY") return t("periodQuarterly");
    if (code === "YEARLY") return t("periodYearly");
    return code || "—";
  }

  function entityStatusLabel(code: string) {
    if (code === "PLANNED") return t("statusPlanned");
    if (code === "ACTIVE") return t("statusActive");
    if (code === "AT_RISK") return t("statusAtRisk");
    if (code === "COMPLETED") return t("statusCompleted");
    return code;
  }

  const processedRows = useMemo(() => {
    let rows = allRows;

    if (q.trim()) {
      const lq = q.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(lq) ||
          (r.titleAr ?? "").toLowerCase().includes(lq) ||
          (r.key ?? "").toLowerCase().includes(lq) ||
          r.entityType.toLowerCase().includes(lq)
      );
    }
    if (filterType !== "ALL") rows = rows.filter((r) => r.entityType === filterType);
    if (filterStatus !== "ALL") rows = rows.filter((r) => r.status === filterStatus);
    if (filterValueStatus !== "ALL") {
      if (filterValueStatus === "NO_DATA") rows = rows.filter((r) => !r.valueStatus);
      else rows = rows.filter((r) => r.valueStatus === filterValueStatus);
    }
    if (filterAchievement !== "ALL") {
      if (filterAchievement === "ON_TRACK") rows = rows.filter((r) => r.achievement !== null && r.achievement >= 100);
      else if (filterAchievement === "AT_RISK") rows = rows.filter((r) => r.achievement !== null && r.achievement >= 75 && r.achievement < 100);
      else if (filterAchievement === "OFF_TRACK") rows = rows.filter((r) => r.achievement !== null && r.achievement < 75);
      else if (filterAchievement === "NO_DATA") rows = rows.filter((r) => r.achievement === null);
    }

    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "title") cmp = df(a.title, a.titleAr).localeCompare(df(b.title, b.titleAr));
      else if (sortBy === "type") cmp = df(a.entityType, a.entityTypeAr).localeCompare(df(b.entityType, b.entityTypeAr));
      else if (sortBy === "achievement") {
        const av = a.achievement ?? -Infinity;
        const bv = b.achievement ?? -Infinity;
        cmp = av - bv;
      }
      else if (sortBy === "value") {
        const av = a.value ?? -Infinity;
        const bv = b.value ?? -Infinity;
        cmp = av - bv;
      }
      else if (sortBy === "updated") cmp = a.updatedAt.getTime() - b.updatedAt.getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [allRows, q, filterType, filterStatus, filterValueStatus, filterAchievement, sortBy, sortDir, df]);

  const availableTypes = useMemo(() => entityTypes, [entityTypes]);
  const availableStatuses = useMemo(() => {
    const s = new Set(allRows.map((r) => r.status).filter(Boolean));
    return Array.from(s).sort();
  }, [allRows]);
  const availableValueStatuses = useMemo(() => {
    const s = new Set(allRows.map((r) => r.valueStatus).filter(Boolean));
    return Array.from(s).sort();
  }, [allRows]);

  const activeFilterCount = [
    filterType !== "ALL",
    filterStatus !== "ALL",
    filterValueStatus !== "ALL",
    filterAchievement !== "ALL",
  ].filter(Boolean).length;

  function clearFilters() {
    setFilterType("ALL");
    setFilterStatus("ALL");
    setFilterValueStatus("ALL");
    setFilterAchievement("ALL");
  }

  // Summary stats
  const stats = useMemo(() => {
    const total = processedRows.length;
    const withAchievement = processedRows.filter((r) => r.achievement !== null);
    const onTrack = withAchievement.filter((r) => r.achievement! >= 100).length;
    const atRisk = withAchievement.filter((r) => r.achievement! >= 75 && r.achievement! < 100).length;
    const offTrack = withAchievement.filter((r) => r.achievement! < 75).length;
    const noData = processedRows.filter((r) => r.achievement === null).length;
    const avgAchievement = withAchievement.length > 0
      ? Math.round(withAchievement.reduce((s, r) => s + r.achievement!, 0) / withAchievement.length)
      : null;
    return { total, onTrack, atRisk, offTrack, noData, avgAchievement };
  }, [processedRows]);

  function exportCsv() {
    const headers = [
      locale === "ar" ? "المؤشر" : "Entity",
      locale === "ar" ? "الكود" : "Key",
      locale === "ar" ? "النوع" : "Type",
      locale === "ar" ? "الحالة" : "Status",
      locale === "ar" ? "الدورية" : "Period",
      locale === "ar" ? "القيمة" : "Value",
      locale === "ar" ? "الهدف" : "Target",
      locale === "ar" ? "الوحدة" : "Unit",
      locale === "ar" ? "الإنجاز %" : "Achievement %",
      locale === "ar" ? "حالة القيمة" : "Value Status",
      locale === "ar" ? "آخر تحديث" : "Last Updated",
    ];
    const csvRows = [
      headers.join(","),
      ...processedRows.map((r) => [
        `"${df(r.title, r.titleAr).replace(/"/g, '""')}"`,
        `"${r.key ?? ""}"`,
        `"${df(r.entityType, r.entityTypeAr).replace(/"/g, '""')}"`,
        `"${r.status}"`,
        `"${r.periodType}"`,
        r.value !== null ? r.value : "",
        r.target !== null ? r.target : "",
        `"${df(r.unit ?? "", r.unitAr ?? "")}"`,
        r.achievement !== null ? r.achievement : "",
        `"${r.valueStatus}"`,
        `"${r.updatedAt.toISOString().slice(0, 10)}"`,
      ].join(",")),
    ];
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kpi-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadAll()}
          disabled={loadingData}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{t("updated")}</span>
        </Button>

        <Button
          size="sm"
          onClick={exportCsv}
          disabled={processedRows.length === 0}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{tr("Export CSV", "تصدير CSV")}</span>
        </Button>

        <div className="h-5 w-px bg-border/60 mx-1" />

        {/* Search */}
        <div className="relative min-w-[180px] flex-1 max-w-sm">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="bg-background pe-8"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {/* Filter: Type */}
        {availableTypes.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterType !== "ALL"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Filter className="h-3 w-3" />
                {tr("Type", "النوع")}
                {filterType !== "ALL" && (
                  <span className="ms-1 font-semibold">
                    · {df(availableTypes.find((t) => t.name === filterType)?.name ?? filterType, availableTypes.find((t) => t.name === filterType)?.nameAr ?? null)}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              <DropdownMenuLabel className="text-xs">{tr("Type", "النوع")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterType("ALL")} className={filterType === "ALL" ? "font-semibold" : ""}>
                {t("all")}
              </DropdownMenuItem>
              {availableTypes.map((et) => (
                <DropdownMenuItem key={et.code} onClick={() => setFilterType(et.name)} className={filterType === et.name ? "font-semibold" : ""}>
                  {df(et.name, et.nameAr)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Filter: Status */}
        {availableStatuses.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterStatus !== "ALL"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Filter className="h-3 w-3" />
                {t("statusFilter")}
                {filterStatus !== "ALL" && <span className="ms-1 font-semibold">· {entityStatusLabel(filterStatus)}</span>}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              <DropdownMenuLabel className="text-xs">{t("statusFilter")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterStatus("ALL")} className={filterStatus === "ALL" ? "font-semibold" : ""}>
                {t("allStatuses")}
              </DropdownMenuItem>
              {availableStatuses.map((s) => (
                <DropdownMenuItem key={s} onClick={() => setFilterStatus(s)} className={filterStatus === s ? "font-semibold" : ""}>
                  {entityStatusLabel(s)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Filter: Value Status */}
        {availableValueStatuses.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterValueStatus !== "ALL"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Filter className="h-3 w-3" />
                {tr("Value Status", "حالة القيمة")}
                {filterValueStatus !== "ALL" && (
                  <span className="ms-1 font-semibold">
                    · {filterValueStatus === "NO_DATA" ? t("noData") : kpiValueStatusLabel(filterValueStatus)}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              <DropdownMenuLabel className="text-xs">{tr("Value Status", "حالة القيمة")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterValueStatus("ALL")} className={filterValueStatus === "ALL" ? "font-semibold" : ""}>
                {t("allStatuses")}
              </DropdownMenuItem>
              {availableValueStatuses.map((s) => (
                <DropdownMenuItem key={s} onClick={() => setFilterValueStatus(s)} className={filterValueStatus === s ? "font-semibold" : ""}>
                  {kpiValueStatusLabel(s)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => setFilterValueStatus("NO_DATA")} className={filterValueStatus === "NO_DATA" ? "font-semibold" : ""}>
                {t("noData")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Filter: Achievement */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                filterAchievement !== "ALL"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Filter className="h-3 w-3" />
              {tr("Achievement", "الإنجاز")}
              {filterAchievement !== "ALL" && (
                <span className="ms-1 font-semibold">
                  · {filterAchievement === "ON_TRACK" ? tr("On Track", "في المسار")
                    : filterAchievement === "AT_RISK" ? tr("At Risk", "في خطر")
                    : filterAchievement === "OFF_TRACK" ? tr("Off Track", "خارج المسار")
                    : t("noData")}
                </span>
              )}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuLabel className="text-xs">{tr("Achievement", "الإنجاز")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { key: "ALL", label: t("all") },
              { key: "ON_TRACK", label: tr("On Track ≥100%", "في المسار ≥100%") },
              { key: "AT_RISK", label: tr("At Risk 75–99%", "في خطر 75–99%") },
              { key: "OFF_TRACK", label: tr("Off Track <75%", "خارج المسار <75%") },
              { key: "NO_DATA", label: t("noData") },
            ].map(({ key, label }) => (
              <DropdownMenuItem key={key} onClick={() => setFilterAchievement(key)} className={filterAchievement === key ? "font-semibold" : ""}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-5 w-px bg-border/60 mx-0.5 hidden sm:block" />

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60"
            >
              {sortDir === "asc" ? <ArrowDownAZ className="h-3.5 w-3.5" /> : <ArrowUpAZ className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{t("sortBy")}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuLabel className="text-xs">{t("sortBy")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(["title", "type", "achievement", "value", "updated"] as const).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => {
                  if (sortBy === s) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                  else { setSortBy(s); setSortDir("asc"); }
                }}
                className={sortBy === s ? "font-semibold" : ""}
              >
                {s === "title" ? t("sortByName")
                  : s === "type" ? tr("Type", "النوع")
                  : s === "achievement" ? tr("Achievement", "الإنجاز")
                  : s === "value" ? t("sortByValue")
                  : t("sortByUpdated")}
                {sortBy === s && (
                  <span className="ms-auto text-[10px] opacity-60">{sortDir === "asc" ? "↑" : "↓"}</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
          >
            <X className="h-3 w-3" />
            {t("clearFilters")}
            <span className="ms-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive/20 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          </button>
        )}

        <span className="ms-auto text-xs text-muted-foreground tabular-nums">
          {processedRows.length} / {allRows.length}
        </span>
      </div>

      {/* Summary stat pills */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            label: tr("Total", "الإجمالي"),
            value: stats.total,
            color: "bg-muted/40 text-foreground",
          },
          {
            label: tr("On Track", "في المسار"),
            value: stats.onTrack,
            color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          },
          {
            label: tr("At Risk", "في خطر"),
            value: stats.atRisk,
            color: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
          },
          {
            label: tr("Off Track", "خارج المسار"),
            value: stats.offTrack,
            color: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
          },
          {
            label: tr("Avg Achievement", "متوسط الإنجاز"),
            value: stats.avgAchievement !== null ? `${stats.avgAchievement}%` : "—",
            color: "bg-primary/10 text-primary",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex flex-col items-center justify-center rounded-xl border border-border px-4 py-3 text-center ${s.color}`}
          >
            <p className="text-2xl font-bold tabular-nums leading-tight">{s.value}</p>
            <p className="mt-0.5 text-xs font-medium opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon name="tabler:table" className="h-4 w-4 text-muted-foreground" />
            {tr("All KPIs", "جميع المؤشرات")}
            <span className="ms-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-muted/60 px-1.5 text-[11px] font-semibold text-muted-foreground">
              {processedRows.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingData ? (
            <div className="rounded-xl border border-border bg-muted/10 p-10 text-center text-sm text-muted-foreground">
              {t("loading")}
            </div>
          ) : allRows.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/10 p-10 text-center text-sm text-muted-foreground">
              {t("noKpisFound")}
            </div>
          ) : processedRows.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">
              {t("noResultsForFilters")}
              <button
                type="button"
                onClick={clearFilters}
                className="ms-2 font-medium text-primary underline underline-offset-4"
              >
                {t("clearFilters")}
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground min-w-[200px]">{t("entity")}</TableHead>
                    <TableHead className="text-muted-foreground">{tr("Type", "النوع")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("status")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("periodFilter")}</TableHead>
                    <TableHead className="text-muted-foreground text-right">{t("value")}</TableHead>
                    <TableHead className="text-muted-foreground text-right">{t("target")}</TableHead>
                    <TableHead className="text-muted-foreground text-right">{tr("Achievement", "الإنجاز")}</TableHead>
                    <TableHead className="text-muted-foreground">{tr("Value Status", "حالة القيمة")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRows.map((row) => {
                    const unit = df(row.unit ?? "", row.unitAr ?? "") || undefined;
                    return (
                      <TableRow key={row.id} className="border-border hover:bg-card/50">
                        <TableCell className="font-medium text-foreground">
                          <Link
                            href={`/${locale}/entities/${
                              availableTypes.find((et) => et.name === row.entityType)?.code ?? row.entityType
                            }/${row.id}`}
                            className="hover:underline"
                          >
                            {df(row.title, row.titleAr)}
                          </Link>
                          {row.key ? (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{row.key}</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {df(row.entityType, row.entityTypeAr)}
                        </TableCell>
                        <TableCell>
                          {row.status ? (
                            <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${entityStatusColor(row.status)}`}>
                              {entityStatusLabel(row.status)}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {row.periodType ? periodLabel(row.periodType) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-foreground" dir="ltr">
                          {row.value !== null
                            ? `${formatNumber(Math.round(row.value * 10) / 10)}${unit ? ` ${unit}` : ""}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground" dir="ltr">
                          {row.target !== null
                            ? `${formatNumber(row.target)}${unit ? ` ${unit}` : ""}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right" dir="ltr">
                          {row.achievement !== null ? (
                            <span className={`font-semibold tabular-nums ${achievementColor(row.achievement)}`}>
                              {row.achievement}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.valueStatus ? (
                            <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${valueStatusColor(row.valueStatus)}`}>
                              {kpiValueStatusLabel(row.valueStatus)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60">{t("noData")}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
