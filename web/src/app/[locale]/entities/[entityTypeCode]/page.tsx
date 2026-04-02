"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlignJustify, ArrowDownAZ, ArrowUpAZ, ChevronDown, Filter, Gauge, Pencil, Plus, Table2, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { KpiGauge } from "@/components/charts/kpi-gauge";
import { KpiRingCard } from "@/components/charts/kpi-ring-card";
import { KpiLineCard } from "@/components/charts/kpi-line-card";
import { RagBadge } from "@/components/rag-badge";
import { MiniSparkline } from "@/components/charts/mini-sparkline";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { deleteOrgEntity, getOrgEntitiesByTypeCode } from "@/actions/entities";

type ListResult = Awaited<ReturnType<typeof getOrgEntitiesByTypeCode>>;

type EntityRow = ListResult["items"][number];


function latestEntityValue(row: EntityRow) {
  const latest = row.values?.[0];
  if (!latest) return null;
  if (typeof latest.finalValue === "number") return latest.finalValue;
  if (typeof latest.calculatedValue === "number") return latest.calculatedValue;
  if (typeof latest.actualValue === "number") return latest.actualValue;
  return null;
}

export default function EntitiesByTypePage() {
  const params = useParams<{ entityTypeCode: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { locale, t, tr, df, formatNumber, te, kpiValueStatusLabel } = useLocale();
  const [mounted, setMounted] = useState(false);
  const userRole =
    typeof (user as unknown as { role?: unknown })?.role === "string"
      ? String((user as unknown as { role?: unknown })?.role)
      : undefined;
  const canAdmin = userRole === "ADMIN";

  const entityTypeCode = String(params.entityTypeCode ?? "");

  const [loadingData, setLoadingData] = useState(true);
  const [result, setResult] = useState<ListResult>({ entityType: null, items: [], total: 0, page: 1, pageSize: 24 });
  const [q, setQ] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selected, setSelected] = useState<EntityRow | null>(null);
  const [viewMode, setViewMode] = useState<"gauge" | "ring" | "line" | "table">("ring");

  // Filter / sort / group state
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPeriod, setFilterPeriod] = useState<string>("ALL");
  const [filterValueStatus, setFilterValueStatus] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "value" | "status" | "updated">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy] = useState<"none" | "period" | "status" | "valueStatus" | "parent">("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = useCallback(async (searchQ: string) => {
    setLoadingData(true);
    try {
      const data = await getOrgEntitiesByTypeCode({
        entityTypeCode,
        q: searchQ.trim() ? searchQ.trim() : undefined,
        page: 1,
        pageSize: 250,
      });
      setResult(data);
    } catch (error) {
      console.error("Failed to load items", error);
      setResult({ entityType: null, items: [], total: 0, page: 1, pageSize: 24 });
    } finally {
      setLoadingData(false);
    }
  }, [entityTypeCode]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (userRole === "SUPER_ADMIN") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void loadData(q);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [loadData, loading, user, userRole, q]);

  const entityType = result.entityType;
  const title = entityType ? df(entityType.name, entityType.nameAr) : entityTypeCode;

  const rows = useMemo(() => result.items ?? [], [result.items]);

  // Derive unique period/status values for filter chips
  const availablePeriods = useMemo(() => {
    const set = new Set(rows.map((r) => String(r.periodType ?? "")).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const availableStatuses = useMemo(() => {
    const set = new Set(rows.map((r) => String(r.status ?? "")).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const availableValueStatuses = useMemo(() => {
    const set = new Set(rows.map((r) => String(r.values?.[0]?.status ?? "")).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  // Active filter count
  const activeFilterCount = [
    filterStatus !== "ALL",
    filterPeriod !== "ALL",
    filterValueStatus !== "ALL",
  ].filter(Boolean).length;

  function clearFilters() {
    setFilterStatus("ALL");
    setFilterPeriod("ALL");
    setFilterValueStatus("ALL");
  }

  // Filtered + sorted rows
  const processedRows = useMemo(() => {
    let filtered = rows;

    if (filterStatus !== "ALL") {
      filtered = filtered.filter((r) => String(r.status ?? "") === filterStatus);
    }
    if (filterPeriod !== "ALL") {
      filtered = filtered.filter((r) => String(r.periodType ?? "") === filterPeriod);
    }
    if (filterValueStatus !== "ALL") {
      if (filterValueStatus === "NO_DATA") {
        filtered = filtered.filter((r) => !r.values?.[0]);
      } else {
        filtered = filtered.filter((r) => String(r.values?.[0]?.status ?? "") === filterValueStatus);
      }
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = df(a.title, a.titleAr).localeCompare(df(b.title, b.titleAr));
      } else if (sortBy === "value") {
        const av = latestEntityValue(a) ?? -Infinity;
        const bv = latestEntityValue(b) ?? -Infinity;
        cmp = av - bv;
      } else if (sortBy === "status") {
        cmp = String(a.status ?? "").localeCompare(String(b.status ?? ""));
      } else if (sortBy === "updated") {
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, filterStatus, filterPeriod, filterValueStatus, sortBy, sortDir, df]);

  // Grouped rows
  type GroupEntry = { key: string; label: string; items: EntityRow[] };
  const groupedRows = useMemo((): GroupEntry[] => {
    if (groupBy === "none") {
      return [{ key: "__all__", label: "", items: processedRows }];
    }
    const map = new Map<string, EntityRow[]>();
    for (const r of processedRows) {
      let key = "__none__";
      if (groupBy === "period") key = String(r.periodType ?? "__none__");
      else if (groupBy === "status") key = String(r.status ?? "__none__");
      else if (groupBy === "valueStatus") key = String(r.values?.[0]?.status ?? "NO_DATA");
      else if (groupBy === "parent") {
        // Group by parent title (or "No Parent" if none)
        key = r.parent ? df(r.parent.title, r.parent.titleAr) : tr("No Parent", "بدون أب");
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, label: key, items }));
  }, [processedRows, groupBy, df, tr]);

  function periodLabel(code: string) {
    if (code === "MONTHLY") return t("periodMonthly");
    if (code === "QUARTERLY") return t("periodQuarterly");
    if (code === "YEARLY") return t("periodYearly");
    return code;
  }

  function entityStatusLabel(code: string) {
    if (code === "PLANNED") return t("statusPlanned");
    if (code === "ACTIVE") return t("statusActive");
    if (code === "AT_RISK") return t("statusAtRisk");
    if (code === "COMPLETED") return t("statusCompleted");
    return code;
  }

  function groupLabelText(groupKey: string) {
    if (groupBy === "period") return periodLabel(groupKey);
    if (groupBy === "status") return entityStatusLabel(groupKey);
    if (groupBy === "valueStatus") {
      if (groupKey === "NO_DATA") return t("noData");
      return kpiValueStatusLabel(groupKey);
    }
    if (groupBy === "parent") return groupKey;
    return groupKey;
  }

  async function handleDelete() {
    if (!canAdmin) return;
    if (!selected) return;

    setSubmitting(true);
    setDeleteError(null);

    try {
      const res = await deleteOrgEntity({ entityId: selected.id });
      if (!res.success) {
        setDeleteError(te(res.error) || res.error || t("failedToDelete"));
        return;
      }

      setDeleteOpen(false);
      setSelected(null);
      await loadData(q);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("failedToDelete");
      setDeleteError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || loading) {
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

  if (userRole === "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("unauthorized")}</p>
        <Link
          href={`/${locale}/super-admin`}
          className="mt-3 inline-flex text-sm font-semibold text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary/70"
        >
          {t("back")}
        </Link>
      </div>
    );
  }

  // Status color helpers
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <PageHeader
          title={title}
          subtitle={t("exploreWithLowerTypeDesc", { type: title, lowerType: title.toLowerCase() })}
          breadcrumbs={[{ label: title, href: undefined }]}
        />

        {canAdmin ? (
          <Button asChild>
            <Link href={`/${locale}/entities/${entityTypeCode}/new`}>
              <Plus className="me-2 h-4 w-4" />
              {t("create")}
            </Link>
          </Button>
        ) : null}
      </div>

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardContent className="pt-5 space-y-4">

          {/* ── Row 1: Search + View toggle ── */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
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
                  aria-label={t("clearFilters")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex items-center rounded-xl border border-border bg-muted/30 p-1 gap-0.5">
              <button
                type="button"
                onClick={() => setViewMode("gauge")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "gauge" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Gauge view"
              >
                <Gauge className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tr("Gauge", "مقياس")}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("ring")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "ring" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Ring view"
              >
                <Activity className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tr("Ring", "حلقة")}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("line")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "line" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Line view"
              >
                <AlignJustify className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tr("Line", "شريط")}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Table view"
              >
                <Table2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tr("Table", "جدول")}</span>
              </button>
            </div>
          </div>

          {/* ── Row 2: Filter + Sort + Group controls ── */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Filter by entity status */}
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

            {/* Filter by period type */}
            {availablePeriods.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      filterPeriod !== "ALL"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <Filter className="h-3 w-3" />
                    {t("periodFilter")}
                    {filterPeriod !== "ALL" && <span className="ms-1 font-semibold">· {periodLabel(filterPeriod)}</span>}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px]">
                  <DropdownMenuLabel className="text-xs">{t("periodFilter")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilterPeriod("ALL")} className={filterPeriod === "ALL" ? "font-semibold" : ""}>
                    {t("allPeriodTypes")}
                  </DropdownMenuItem>
                  {availablePeriods.map((p) => (
                    <DropdownMenuItem key={p} onClick={() => setFilterPeriod(p)} className={filterPeriod === p ? "font-semibold" : ""}>
                      {periodLabel(p)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Filter by value status */}
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

            {/* Divider */}
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
              <DropdownMenuContent align="start" className="min-w-[170px]">
                <DropdownMenuLabel className="text-xs">{t("sortBy")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(["name", "value", "status", "updated"] as const).map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => {
                      if (sortBy === s) {
                        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      } else {
                        setSortBy(s);
                        setSortDir("asc");
                      }
                    }}
                    className={sortBy === s ? "font-semibold" : ""}
                  >
                    {s === "name" ? t("sortByName") : s === "value" ? t("sortByValue") : s === "status" ? t("sortByStatus") : t("sortByUpdated")}
                    {sortBy === s && <span className="ms-auto text-[10px] opacity-60">{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Group by */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    groupBy !== "none"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {t("groupBy")}
                  {groupBy !== "none" && (
                    <span className="ms-1 font-semibold">
                      · {groupBy === "period" ? t("groupByPeriod") : groupBy === "status" ? t("groupByStatus") : groupBy === "parent" ? tr("By Parent", "حسب الأب") : t("groupByValueStatus")}
                    </span>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[160px]">
                <DropdownMenuLabel className="text-xs">{t("groupBy")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(["none", "period", "status", "valueStatus", "parent"] as const).map((g) => (
                  <DropdownMenuItem key={g} onClick={() => setGroupBy(g)} className={groupBy === g ? "font-semibold" : ""}>
                    {g === "none" ? t("groupByNone") : g === "period" ? t("groupByPeriod") : g === "status" ? t("groupByStatus") : g === "parent" ? tr("By Parent", "حسب الأب") : t("groupByValueStatus")}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Active filter count + clear */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
              >
                <X className="h-3 w-3" />
                {t("clearFilters")}
                <span className="ms-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive/20 text-[10px] font-bold leading-none">
                  {activeFilterCount}
                </span>
              </button>
            )}

            {/* Result count */}
            <span className="ms-auto text-xs text-muted-foreground tabular-nums">
              {processedRows.length} / {rows.length}
            </span>
          </div>

          {/* ── Content ── */}
          {loadingData ? (
            <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
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
            <div className="space-y-6">
              {viewMode === "table" ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">{t("entity")}</TableHead>
                        <TableHead className="text-muted-foreground">{tr("Parent", "الأب")}</TableHead>
                        <TableHead className="text-muted-foreground">{t("status")}</TableHead>
                        <TableHead className="text-muted-foreground">{t("periodFilter")}</TableHead>
                        <TableHead className="text-muted-foreground">{t("value")}</TableHead>
                        <TableHead className="text-muted-foreground">{t("target")}</TableHead>
                        <TableHead className="text-muted-foreground">{tr("Achievement", "الإنجاز")}</TableHead>
                        <TableHead className="text-muted-foreground">{t("valueStatusAll")}</TableHead>
                        {canAdmin ? <TableHead className="text-right text-muted-foreground">{t("actions")}</TableHead> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedRows.map((e) => {
                        const latest = latestEntityValue(e);
                        const unit = df(e.unit, e.unitAr) || undefined;
                        const gaugeTarget = typeof e.targetValue === "number" ? e.targetValue : null;
                        const valStatus = String(e.values?.[0]?.status ?? "");
                        const entStatus = String(e.status ?? "");
                        const period = String(e.periodType ?? "");
                        const achievement = latest !== null && gaugeTarget !== null && gaugeTarget !== 0
                          ? Math.round((latest / gaugeTarget) * 1000) / 10
                          : null;
                        return (
                          <TableRow key={e.id} className="border-border hover:bg-card/50">
                            <TableCell className="font-medium text-foreground">
                              <Link href={`/${locale}/entities/${entityTypeCode}/${e.id}`} className="hover:underline">
                                {df(e.title, e.titleAr)}
                              </Link>
                              {e.key ? <p className="mt-0.5 text-xs text-muted-foreground">{e.key}</p> : null}
                            </TableCell>
                            <TableCell>
                              {e.parent ? (
                                <Link
                                  href={`/${locale}/entities/${e.parent.orgEntityType?.code?.toLowerCase() ?? "pillar"}/${e.parent.id}`}
                                  className="text-xs text-primary hover:underline"
                                >
                                  {df(e.parent.title, e.parent.titleAr)}
                                </Link>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {entStatus ? (
                                <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${entityStatusColor(entStatus)}`}>
                                  {entityStatusLabel(entStatus)}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {period ? periodLabel(period) : "—"}
                            </TableCell>
                            <TableCell className="text-foreground tabular-nums" dir="ltr">
                              {latest !== null ? `${formatNumber(Math.round(latest * 10) / 10)}${unit ? ` ${unit}` : ""}` : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground tabular-nums" dir="ltr">
                              {gaugeTarget !== null ? `${formatNumber(gaugeTarget)}${unit ? ` ${unit}` : ""}` : "—"}
                            </TableCell>
                            <TableCell className="tabular-nums" dir="ltr">
                              {achievement !== null ? (
                                <RagBadge health={achievement >= 80 ? "GREEN" : achievement >= 60 ? "AMBER" : "RED"} label={`${achievement}%`} />
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              {valStatus ? (
                                <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${valueStatusColor(valStatus)}`}>
                                  {kpiValueStatusLabel(valStatus)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/60">{t("noData")}</span>
                              )}
                            </TableCell>
                            {canAdmin ? (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7"
                                    onClick={() => router.push(`/${locale}/entities/${entityTypeCode}/${e.id}/edit`)}
                                    aria-label={t("edit")}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => { setSelected(e); setDeleteError(null); setDeleteOpen(true); }}
                                    aria-label={t("delete")}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
              <>{groupedRows.map((group) => (
                <div key={group.key}>
                  {/* Group header */}
                  {groupBy !== "none" && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className="mb-3 flex w-full items-center gap-2 text-start group/ghdr"
                    >
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ${
                          collapsedGroups.has(group.key) ? "-rotate-90" : ""
                        }`}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover/ghdr:text-foreground transition-colors">
                        {groupLabelText(group.label)}
                      </span>
                      <span className="inline-flex h-4 min-w-[1.25rem] items-center justify-center rounded-full bg-muted/60 px-1.5 text-[10px] font-semibold text-muted-foreground">
                        {group.items.length}
                      </span>
                      <div className="h-px flex-1 bg-border/50" />
                    </button>
                  )}

                  {/* Cards grid */}
                  {!collapsedGroups.has(group.key) && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((e) => {
                      const latest = latestEntityValue(e);
                      const unit = df(e.unit, e.unitAr) || undefined;
                      const gaugeTarget = typeof e.targetValue === "number" ? e.targetValue : null;
                      const typeLabel = entityType ? df(entityType.name, entityType.nameAr) : entityTypeCode;
                      const valStatus = String(e.values?.[0]?.status ?? "");
                      const entStatus = String(e.status ?? "");
                      const period = String(e.periodType ?? "");
                      const sparkPoints = (e.values ?? []).slice().reverse().map((v) => {
                        if (typeof v.finalValue === "number") return v.finalValue;
                        if (typeof v.calculatedValue === "number") return v.calculatedValue;
                        if (typeof v.actualValue === "number") return v.actualValue;
                        return 0;
                      });

                      return (
                        <Card key={e.id} className="bg-card/50 backdrop-blur shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-border/80">
                          <Link href={`/${locale}/entities/${entityTypeCode}/${e.id}`} className="block">
                            <CardHeader className="space-y-1.5 pb-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <CardTitle className="line-clamp-2 text-sm leading-snug font-semibold hover:underline underline-offset-4 decoration-primary/40 hover:decoration-primary/70">
                                    {df(e.title, e.titleAr)}
                                  </CardTitle>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                    {/* Parent breadcrumb */}
                                    {e.parent && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(ev) => {
                                            ev.stopPropagation();
                                            ev.preventDefault();
                                            router.push(`/${locale}/entities/${e.parent?.orgEntityType?.code?.toLowerCase() ?? "pillar"}/${e.parent?.id}`);
                                          }}
                                          className="text-[10px] text-primary hover:underline truncate max-w-[150px] text-start"
                                        >
                                          {df(e.parent.title, e.parent.titleAr)}
                                        </button>
                                        <span className="text-[10px] text-muted-foreground">›</span>
                                      </>
                                    )}
                                    <span className="truncate text-xs text-muted-foreground">{typeLabel}</span>
                                    {period && (
                                      <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                        {periodLabel(period)}
                                      </span>
                                    )}
                                    {entStatus && (
                                      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${entityStatusColor(entStatus)}`}>
                                        {entityStatusLabel(entStatus)}
                                      </span>
                                    )}
                                    {valStatus && (
                                      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${valueStatusColor(valStatus)}`}>
                                        {kpiValueStatusLabel(valStatus)}
                                      </span>
                                    )}
                                    {!valStatus && (
                                      <span className="inline-flex items-center rounded-md border border-border/40 bg-muted/20 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60">
                                        {t("noData")}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {canAdmin ? (
                                  <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={(ev) => {
                                        ev.preventDefault();
                                        router.push(`/${locale}/entities/${entityTypeCode}/${e.id}/edit`);
                                      }}
                                      aria-label={t("edit")}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={(ev) => {
                                        ev.preventDefault();
                                        setSelected(e);
                                        setDeleteError(null);
                                        setDeleteOpen(true);
                                      }}
                                      aria-label={t("delete")}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            </CardHeader>

                            <CardContent className="pt-0 space-y-2">
                              {viewMode === "gauge" ? (
                                <KpiGauge value={latest} target={gaugeTarget} unit={unit} height={160} withCard={false} />
                              ) : viewMode === "ring" ? (
                                <KpiRingCard value={latest} target={gaugeTarget} unit={unit} size={112} />
                              ) : (
                                <KpiLineCard value={latest} target={gaugeTarget} unit={unit} />
                              )}

                              <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs text-muted-foreground">
                                <span className="truncate">{t("target")}: {gaugeTarget !== null ? formatNumber(gaugeTarget) : "—"}</span>
                                <div className="flex items-center gap-2 shrink-0 ms-2">
                                  {sparkPoints.length >= 2 && <MiniSparkline points={sparkPoints} width={48} height={18} />}
                                  <span dir="ltr" className="font-medium tabular-nums">
                                    {latest === null ? "—" : formatNumber(Math.round(latest * 10) / 10)}{unit ? ` ${unit}` : ""}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Link>
                        </Card>
                      );
                    })}
                  </div>
                  )}
                </div>
              ))}</>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelected(null);
          if (open) setDeleteError(null);
        }}
      >
        <DialogContent className="border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>{t("delete")} {selected ? `"${df(selected.title, selected.titleAr)}"` : ""}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{t("deleteConfirmDesc")}</DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-line">
              {deleteError}
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-semibold">{selected ? df(selected.title, selected.titleAr) : "—"}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={submitting}>
              {submitting ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
