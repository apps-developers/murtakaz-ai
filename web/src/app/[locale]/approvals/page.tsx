"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { getEntityApprovals } from "@/actions/approvals";
import React, { useEffect, useMemo, useState } from "react";
import { AiReviewContextCard } from "@/components/ai/ai-review-context-card";
import { useAiEnabled } from "@/lib/ai-features";

export default function ApprovalsPage() {
  const { locale, t, kpiValueStatusLabel, formatDate, formatNumber } = useLocale();
  const aiEnabled = useAiEnabled();

  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "ALL">("PENDING");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getEntityApprovals>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAiRow, setExpandedAiRow] = useState<string | null>(null);

  const statusParam = useMemo(() => {
    if (filter === "PENDING") return "SUBMITTED" as const;
    if (filter === "APPROVED") return "APPROVED" as const;
    return undefined;
  }, [filter]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
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

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("approvals")}
        subtitle={t("approvalsSubtitle")}
        icon={<Icon name="tabler:gavel" className="h-5 w-5" />}
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
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 whitespace-pre-wrap">
              {error}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-white/0">
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
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {t("loading")}…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {t("noApprovalsFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const submittedValue = row.finalValue ?? row.calculatedValue ?? row.actualValue ?? 0;
                    const isAiRowExpanded = expandedAiRow === row.id;
                    return (
                      <React.Fragment key={row.id}>
                        <TableRow className="border-border hover:bg-card/50">
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
                              {aiEnabled && String(row.status) === "SUBMITTED" ? (
                                <button
                                  onClick={() => setExpandedAiRow(isAiRowExpanded ? null : row.id)}
                                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                                >
                                  <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm9-3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM6.75 7.75a.75.75 0 0 1 .75-.75h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25V8.5H7.5a.75.75 0 0 1-.75-.75z" fill="currentColor"/></svg>
                                  {t("aiReviewContext")}
                                </button>
                              ) : null}
                              <span className="text-muted-foreground">{kpiValueStatusLabel(String(row.status))}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        {aiEnabled && isAiRowExpanded ? (
                          <TableRow key={`${row.id}-ai`} className="border-border bg-muted/5">
                            <TableCell colSpan={6} className="p-4">
                              <AiReviewContextCard
                                submittedValue={submittedValue}
                                historicalAvg={submittedValue * 1.8}
                                managerNote={row.note ?? null}
                                anomalyType="low"
                              />
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
