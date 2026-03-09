"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutList, Search, X, CircleDot } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiRingCard } from "@/components/charts/kpi-ring-card";
import { useLocale } from "@/providers/locale-provider";
import { getAllOrgEntities } from "@/actions/entities";

const TYPE_ORDER = ["PILLAR", "OBJECTIVE", "DEPARTMENT", "INITIATIVE", "KPI"];

type EntityRow = {
  id: string;
  key: string | null;
  title: string;
  titleAr: string | null;
  status: string | null;
  unit: string | null;
  unitAr: string | null;
  targetValue: number | null;
  orgEntityType: {
    code: string;
    name: string;
    nameAr: string | null;
  };
  values: Array<{
    createdAt: Date;
    actualValue: number | null;
    calculatedValue: number | null;
    finalValue: number | null;
    status: string;
  }>;
};

type ViewMode = "ring" | "list";

type EntitySelectorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (entityKey: string) => void;
};

export function EntitySelectorModal({ open, onOpenChange, onSelect }: EntitySelectorModalProps) {
  const { df, tr, formatNumber } = useLocale();
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("ring");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setLoading(true);

    void (async () => {
      try {
        const result = await getAllOrgEntities();
        if (!mounted) return;
        setEntities(result);
      } catch (error) {
        console.error("Failed to load entities:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [open]);

  // Auto-focus search when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 80);
    } else {
      setSearchQuery("");
      setActiveTab("all");
    }
  }, [open]);

  const entitiesWithKeys = useMemo(() => {
    return (entities ?? []).filter((e) => e.key && e.key.trim().length > 0);
  }, [entities]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredBySearch = useMemo(() => {
    if (!normalizedSearch) return entitiesWithKeys;
    return entitiesWithKeys.filter((entity) => {
      const title = entity.title.toLowerCase();
      const titleAr = entity.titleAr?.toLowerCase() ?? "";
      const key = entity.key?.toLowerCase() ?? "";
      const typeCode = entity.orgEntityType.code.toLowerCase();
      return title.includes(normalizedSearch) || titleAr.includes(normalizedSearch) || key.includes(normalizedSearch) || typeCode.includes(normalizedSearch);
    });
  }, [entitiesWithKeys, normalizedSearch]);

  const types = useMemo(() => {
    const codes = new Set<string>();
    for (const e of entitiesWithKeys) {
      const code = String(e.orgEntityType.code ?? "").toUpperCase();
      if (code) codes.add(code);
    }
    const ordered = TYPE_ORDER.filter((c) => codes.has(c));
    const remaining = Array.from(codes).filter((c) => !TYPE_ORDER.includes(c)).sort();
    return [...ordered, ...remaining];
  }, [entitiesWithKeys]);

  const countByType = useMemo(() => {
    const map: Record<string, number> = { all: filteredBySearch.length };
    for (const e of filteredBySearch) {
      const code = String(e.orgEntityType.code ?? "").toUpperCase();
      map[code] = (map[code] ?? 0) + 1;
    }
    return map;
  }, [filteredBySearch]);

  const filteredByTab = useMemo(() => {
    if (activeTab === "all") return filteredBySearch;
    return filteredBySearch.filter((e) => String(e.orgEntityType.code ?? "").toUpperCase() === activeTab);
  }, [activeTab, filteredBySearch]);

  function latestEntityValue(entity: EntityRow) {
    const latest = entity.values?.[0];
    if (!latest) return null;
    if (typeof latest.finalValue === "number") return latest.finalValue;
    if (typeof latest.calculatedValue === "number") return latest.calculatedValue;
    if (typeof latest.actualValue === "number") return latest.actualValue;
    return null;
  }

  function handleSelect(entityKey: string) {
    onSelect(entityKey);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-semibold">
              {tr("Select Entity", "اختر الكيان")}
            </DialogTitle>
            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("ring")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewMode === "ring"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CircleDot className="h-3.5 w-3.5" />
                {tr("Ring", "حلقة")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                {tr("List", "قائمة")}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchRef}
              placeholder={tr("Search entities...", "ابحث عن الكيانات...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 bg-muted/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="text-sm">{tr("Loading entities...", "جاري تحميل الكيانات...")}</p>
            </div>
          ) : entitiesWithKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <CircleDot className="h-10 w-10 opacity-20" />
              <p className="text-sm">{tr("No entities with keys found", "لا توجد كيانات بمفاتيح")}</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
              <TabsList className="w-full justify-start overflow-x-auto shrink-0 mb-3 h-auto gap-1 bg-transparent p-0">
                <TabsTrigger
                  value="all"
                  className="h-7 gap-1.5 rounded-full border border-border px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
                >
                  {tr("All", "الكل")}
                  {countByType["all"] !== undefined && (
                    <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] data-[active]:bg-primary-foreground/20">
                      {countByType["all"]}
                    </Badge>
                  )}
                </TabsTrigger>
                {types.map((typeCode) => (
                  <TabsTrigger
                    key={typeCode}
                    value={typeCode}
                    className="h-7 gap-1.5 rounded-full border border-border px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
                  >
                    {typeCode}
                    {countByType[typeCode] !== undefined && (
                      <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                        {countByType[typeCode]}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                {filteredByTab.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                    <Search className="h-8 w-8 opacity-20" />
                    <p className="text-sm">{tr("No matching entities", "لا توجد نتائج")}</p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="text-xs text-primary hover:underline"
                      >
                        {tr("Clear search", "مسح البحث")}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="pb-2">
                    {viewMode === "ring" ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredByTab.map((entity) => {
                          const latest = latestEntityValue(entity);
                          const unit = df(entity.unit, entity.unitAr) || undefined;
                          const target = typeof entity.targetValue === "number" ? entity.targetValue : null;
                          const typeLabel = df(entity.orgEntityType.name, entity.orgEntityType.nameAr) || String(entity.orgEntityType.code);

                          return (
                            <button
                              key={entity.id}
                              type="button"
                              onClick={() => handleSelect(entity.key!)}
                              className="group text-left w-full rounded-xl border border-border bg-card/50 p-4 hover:border-primary/50 hover:bg-card hover:shadow-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-full mb-1">
                                  <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                                    {df(entity.title, entity.titleAr)}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                                    {typeLabel}
                                    {entity.key ? <span className="text-muted-foreground/60"> • {String(entity.key)}</span> : null}
                                  </p>
                                </div>
                                <KpiRingCard value={latest} target={target} unit={unit} size={88} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {filteredByTab.map((entity) => {
                          const latest = latestEntityValue(entity);
                          const unit = df(entity.unit, entity.unitAr) || undefined;
                          const typeLabel = df(entity.orgEntityType.name, entity.orgEntityType.nameAr) || String(entity.orgEntityType.code);

                          return (
                            <button
                              key={entity.id}
                              type="button"
                              onClick={() => handleSelect(entity.key!)}
                              className="group flex items-center justify-between w-full rounded-lg border border-border bg-card/50 px-4 py-3 hover:border-primary/50 hover:bg-card hover:shadow-sm transition-all duration-150 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                  {df(entity.title, entity.titleAr)}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {typeLabel}
                                  {entity.key ? ` • ${String(entity.key)}` : ""}
                                </p>
                              </div>
                              <div className="shrink-0 flex items-center gap-3 ml-4">
                                {latest !== null ? (
                                  <span className="text-sm font-semibold tabular-nums text-foreground" dir="ltr">
                                    {formatNumber(latest)}{unit ? ` ${unit}` : ""}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0 bg-muted/20">
          <p className="text-xs text-muted-foreground">
            {filteredByTab.length > 0
              ? tr(`${filteredByTab.length} entities`, `${filteredByTab.length} كيان`)
              : ""}
          </p>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {tr("Cancel", "إلغاء")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
