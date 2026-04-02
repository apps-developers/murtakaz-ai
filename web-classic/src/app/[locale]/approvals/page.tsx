"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocale } from "@/providers/locale-provider";
import { getEntityApprovals, approveEntityValue, rejectEntityValue } from "@/actions/approvals";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";


export default function ApprovalsPage() {
  const { locale, t, kpiValueStatusLabel, formatDate, formatNumber } = useLocale();

  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "ALL">("PENDING");
  const [actionLoading, setActionLoading] = useState<Record<string, "approve" | "reject" | null>>({});
  const [actionError, setActionError] = useState<Record<string, string | null>>({});
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getEntityApprovals>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Batch selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const statusParam = useMemo(() => {
    if (filter === "PENDING") return "SUBMITTED" as const;
    if (filter === "APPROVED") return "APPROVED" as const;
    return undefined;
  }, [filter]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setSelectedItems(new Set()); // Clear selection on filter change
    (async () => {
      try {
        const data = await getEntityApprovals(statusParam ? { status: statusParam } : undefined);
        if (!mounted) return;
        setRows(data);
      } catch (e: unknown) {
        if (!mounted) return;
        setRows([]);
        setError(e instanceof Error ? e.message : t("approvalsFailedToLoad"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [statusParam, t]);

  const pendingRows = useMemo(() => rows.filter(r => String(r.status) === "SUBMITTED"), [rows]);
  const allSelected = pendingRows.length > 0 && pendingRows.every(r => selectedItems.has(r.id));
  const someSelected = pendingRows.some(r => selectedItems.has(r.id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pendingRows.map(r => r.id)));
    }
  }, [allSelected, pendingRows]);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const openRejectDialog = useCallback((periodId: string) => {
    setRejectingItemId(periodId);
    setRejectionReason("");
    setRejectDialogOpen(true);
  }, []);

  const handleInlineApprove = useCallback(async (entityId: string, periodId: string) => {
    setActionLoading(prev => ({ ...prev, [periodId]: "approve" }));
    setActionError(prev => ({ ...prev, [periodId]: null }));
    try {
      const res = await approveEntityValue({ entityId, periodId });
      if (!res.success) {
        setActionError(prev => ({ ...prev, [periodId]: res.error || "Failed" }));
        return;
      }
      // Refresh
      const data = await getEntityApprovals(statusParam ? { status: statusParam } : undefined);
      setRows(data);
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.delete(periodId);
        return next;
      });
    } catch (e: unknown) {
      setActionError(prev => ({ ...prev, [periodId]: e instanceof Error ? e.message : "Failed" }));
    } finally {
      setActionLoading(prev => ({ ...prev, [periodId]: null }));
    }
  }, [statusParam]);

  const handleInlineReject = useCallback(async (entityId: string, periodId: string, reason?: string) => {
    setActionLoading(prev => ({ ...prev, [periodId]: "reject" }));
    setActionError(prev => ({ ...prev, [periodId]: null }));
    try {
      const res = await rejectEntityValue({ entityId, periodId, reason });
      if (!res.success) {
        setActionError(prev => ({ ...prev, [periodId]: res.error || "Failed" }));
        return;
      }
      const data = await getEntityApprovals(statusParam ? { status: statusParam } : undefined);
      setRows(data);
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.delete(periodId);
        return next;
      });
    } catch (e: unknown) {
      setActionError(prev => ({ ...prev, [periodId]: e instanceof Error ? e.message : "Failed" }));
    } finally {
      setActionLoading(prev => ({ ...prev, [periodId]: null }));
    }
  }, [statusParam]);

  const confirmReject = useCallback(async () => {
    if (!rejectingItemId) return;
    const row = rows.find(r => r.id === rejectingItemId);
    if (!row) return;
    
    await handleInlineReject(row.entityId, row.id, rejectionReason);
    setRejectDialogOpen(false);
    setRejectingItemId(null);
    setRejectionReason("");
  }, [rejectingItemId, rejectionReason, rows, handleInlineReject]);

  const handleBulkApprove = useCallback(async () => {
    if (selectedItems.size === 0) return;
    setBulkActionLoading(true);
    
    try {
      const promises = Array.from(selectedItems).map(async (id) => {
        const row = rows.find(r => r.id === id);
        if (!row) return { success: false, id };
        const res = await approveEntityValue({ entityId: row.entityId, periodId: row.id });
        return { success: res.success, id };
      });
      
      await Promise.all(promises);
      
      // Refresh
      const data = await getEntityApprovals(statusParam ? { status: statusParam } : undefined);
      setRows(data);
      setSelectedItems(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bulk approve failed");
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedItems, rows, statusParam]);

  const handleBulkReject = useCallback(async () => {
    if (selectedItems.size === 0) return;
    setBulkActionLoading(true);
    
    try {
      const promises = Array.from(selectedItems).map(async (id) => {
        const row = rows.find(r => r.id === id);
        if (!row) return { success: false, id };
        const res = await rejectEntityValue({ entityId: row.entityId, periodId: row.id });
        return { success: res.success, id };
      });
      
      await Promise.all(promises);
      
      // Refresh
      const data = await getEntityApprovals(statusParam ? { status: statusParam } : undefined);
      setRows(data);
      setSelectedItems(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bulk reject failed");
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedItems, rows, statusParam]);

  // Skeleton loading component
  const TableSkeleton = () => (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-4 w-[100px] ml-auto" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-border/50">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[80px]" />
          <div className="flex gap-2 ml-auto">
            <Skeleton className="h-7 w-[60px]" />
            <Skeleton className="h-7 w-[60px]" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("approvals")}
        subtitle={t("approvalsSubtitle")}
        icon={<Icon name="tabler:gavel" className="h-5 w-5" />}
        breadcrumbs={[
          { label: t("approvals") },
        ]}
      />

      <Card className="border-border bg-card/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="tabler:checks" className="h-4 w-4 text-foreground" />
            {t("kpiApprovals")}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("submittedKpiValuesDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={filter === "PENDING" ? "default" : "outline"}
              className={filter === "PENDING" ? "" : "border-border bg-card/50 text-foreground hover:bg-muted/30 hover:text-foreground"}
              onClick={() => setFilter("PENDING")}
            >
              {t("pending")}
            </Button>
            <Button
              size="sm"
              variant={filter === "APPROVED" ? "default" : "outline"}
              className={filter === "APPROVED" ? "" : "border-border bg-card/50 text-foreground hover:bg-muted/30 hover:text-foreground"}
              onClick={() => setFilter("APPROVED")}
            >
              {t("approved")}
            </Button>
            <Button
              size="sm"
              variant={filter === "ALL" ? "default" : "outline"}
              className={filter === "ALL" ? "" : "border-border bg-card/50 text-foreground hover:bg-muted/30 hover:text-foreground"}
              onClick={() => setFilter("ALL")}
            >
              {t("all")}
            </Button>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 whitespace-pre-wrap">
              {error}
            </div>
          ) : null}

          {/* Batch actions bar */}
          {filter === "PENDING" && pendingRows.length > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label={allSelected ? t("deselectAll") : t("selectAll")}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedItems.size > 0 
                    ? t("itemsSelected").replace("{count}", String(selectedItems.size))
                    : t("selectAll")}
                </span>
              </div>
              {selectedItems.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={bulkActionLoading}
                    onClick={handleBulkReject}
                  >
                    {bulkActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : t("bulkReject")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={bulkActionLoading}
                    onClick={handleBulkApprove}
                  >
                    {bulkActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : t("bulkApprove")}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-border">
            {loading ? (
              <TableSkeleton />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    {filter === "PENDING" && <TableHead className="w-10" />}
                    <TableHead className="text-muted-foreground">{t("entity")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("period")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("value")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("submittedBy")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("submittedAt")}</TableHead>
                    <TableHead className="text-right text-muted-foreground">{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={filter === "PENDING" ? 7 : 6} className="py-8 text-center text-muted-foreground">
                      {t("loading")}…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={filter === "PENDING" ? 7 : 6} className="py-8 text-center text-muted-foreground">
                      {t("noApprovalsFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const submittedValue = row.finalValue ?? row.calculatedValue ?? row.actualValue ?? 0;
                    
                    const isSelected = selectedItems.has(row.id);
                    
                    return (
                      <React.Fragment key={row.id}>
                        <TableRow className={cn("border-border hover:bg-card/50", isSelected && "bg-primary/5")}>
                          {filter === "PENDING" && (
                            <TableCell className="w-10">
                              {String(row.status) === "SUBMITTED" && (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSelectItem(row.id)}
                                />
                              )}
                            </TableCell>
                          )}
                          <TableCell className="font-medium text-foreground">
                            <Link href={`/${locale}/entities/${row.entity.orgEntityType.code}/${row.entityId}`} className="hover:underline">
                              {locale === "ar" ? (row.entity.titleAr ?? row.entity.title) : row.entity.title}
                            </Link>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {locale === "ar" ? (row.entity.orgEntityType.nameAr ?? row.entity.orgEntityType.name) : row.entity.orgEntityType.name}
                              {row.entity.key ? ` • ${row.entity.key}` : ""}
                            </p>
                          </TableCell>
                          <TableCell className="text-muted-foreground" dir="ltr">
                            {formatDate(row.createdAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground" dir="ltr">
                            {formatNumber(submittedValue)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{row.submittedByUser?.name ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground" dir="ltr">
                            {row.submittedAt ? formatDate(row.submittedAt, { dateStyle: "medium", timeStyle: "short" }) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {String(row.status) === "SUBMITTED" ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 px-2 text-xs"
                                    disabled={!!actionLoading[row.id]}
                                    onClick={() => openRejectDialog(row.id)}
                                  >
                                    {actionLoading[row.id] === "reject" ? <Loader2 className="h-3 w-3 animate-spin" /> : t("reject")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    disabled={!!actionLoading[row.id]}
                                    onClick={() => void handleInlineApprove(row.entityId, row.id)}
                                  >
                                    {actionLoading[row.id] === "approve" ? <Loader2 className="h-3 w-3 animate-spin" /> : t("approve")}
                                  </Button>
                                </>
                              ) : (
                                <span className="text-muted-foreground">{kpiValueStatusLabel(String(row.status))}</span>
                              )}
                            </div>
                            {actionError[row.id] ? (
                              <p className="mt-1 text-[10px] text-destructive">{actionError[row.id]}</p>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("reject")}</DialogTitle>
            <DialogDescription>
              {t("rejectionReason")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t("rejectionReasonPlaceholder")}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectingItemId(null);
                setRejectionReason("");
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectionReason.trim() || !!actionLoading[rejectingItemId || ""]}
            >
              {actionLoading[rejectingItemId || ""] === "reject" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
