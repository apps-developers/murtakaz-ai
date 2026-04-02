"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/providers/locale-provider";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import {
  getEntityValueDetail,
  addEntityValueComment,
  approveEntityValue,
  rejectEntityValue,
} from "@/actions/approvals";
import { KpiValueStatus } from "@/generated/prisma-client";

type EntityValueDetail = Awaited<ReturnType<typeof getEntityValueDetail>> & {
  success: true;
};

export default function ApprovalDetailPage() {
  const params = useParams<{ requestId: string }>();
  const { locale, t, formatDate, formatNumber } = useLocale();
  const { user } = useAuth();

  const [data, setData] = useState<EntityValueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!params.requestId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getEntityValueDetail(params.requestId);
      if (result.success) {
        setData(result as EntityValueDetail);
      } else {
        setError(result.error ?? "Failed to load");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params.requestId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleApprove = async () => {
    if (!data?.entityValue) return;
    
    setActionLoading(true);
    try {
      const result = await approveEntityValue({
        entityId: data.entityValue.entityId,
        periodId: data.entityValue.id,
      });
      
      if (result.success) {
        await loadData();
      } else {
        setError(result.error ?? "Failed to approve");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!data?.entityValue) return;
    
    setActionLoading(true);
    try {
      const result = await rejectEntityValue({
        entityId: data.entityValue.entityId,
        periodId: data.entityValue.id,
      });
      
      if (result.success) {
        await loadData();
      } else {
        setError(result.error ?? "Failed to reject");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (comment: string) => {
    if (!data?.entityValue) return;
    
    try {
      const result = await addEntityValueComment({
        entityValueId: data.entityValue.id,
        comment,
      });
      
      if (result.success) {
        await loadData();
      } else {
        setError(result.error ?? "Failed to add comment");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add comment");
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-foreground">
        <p className="text-sm text-muted-foreground">
          {locale === "ar" ? "جاري التحميل..." : "Loading..."}
        </p>
      </div>
    );
  }

  if (error || !data?.entityValue) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-foreground">
        <p className="text-sm text-muted-foreground">
          {error ?? (locale === "ar" ? "لم يتم العثور على الطلب" : "Request not found")}
        </p>
        <Link
          href={`/${locale}/approvals`}
          className="mt-3 inline-flex text-sm font-semibold text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary/70"
        >
          {locale === "ar" ? "العودة للموافقات" : "Back to Approvals"}
        </Link>
      </div>
    );
  }

  const { entityValue, historicalValues, canApprove } = data;
  const entity = entityValue.entity;
  const submittedValue = entityValue.finalValue ?? entityValue.calculatedValue ?? entityValue.actualValue ?? 0;
  const isPending = entityValue.status === KpiValueStatus.SUBMITTED;

  // Parse comments from note field
  const comments = entityValue.note 
    ? entityValue.note.split("\n\n").filter(line => line.includes("]")).map(line => {
        const match = line.match(/^\[(.+?)\]\s*(.+?):\s*(.+)$/);
        if (match) {
          return { at: match[1], author: match[2], message: match[3] };
        }
        return null;
      }).filter(Boolean)
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={locale === "ar" ? (entity.titleAr ?? entity.title) : entity.title}
        subtitle={`${locale === "ar" ? "مقدم من" : "Submitted by"} ${entityValue.submittedByUser?.name ?? "—"} • ${
          entityValue.submittedAt ? formatDate(entityValue.submittedAt, { dateStyle: "medium", timeStyle: "short" }) : "—"
        }`}
        icon={<Icon name="tabler:gavel" className="h-5 w-5" />}
        breadcrumbs={[
          { label: t("approvals"), href: `/${locale}/approvals` },
          { label: locale === "ar" ? (entity.titleAr ?? entity.title) : entity.title },
        ]}
        actions={
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            isPending 
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
              : entityValue.status === KpiValueStatus.APPROVED
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              isPending ? "bg-amber-500" : entityValue.status === KpiValueStatus.APPROVED ? "bg-emerald-500" : "bg-rose-500"
            }`} />
            {isPending 
              ? (locale === "ar" ? "معلق" : "Pending")
              : entityValue.status === KpiValueStatus.APPROVED
              ? (locale === "ar" ? "معتمد" : "Approved")
              : (locale === "ar" ? "مرفوض" : "Rejected")
            }
          </span>
        }
      />

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:chart-bar" className="h-4 w-4 text-foreground" />
                {locale === "ar" ? "تفاصيل القيمة" : "Value Details"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {locale === "ar" ? "تفاصيل القيمة المُدخلة للمراجعة" : "Details of submitted value for review"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-foreground">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {locale === "ar" ? "القيمة المُدخلة" : "Submitted Value"}
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {formatNumber(submittedValue)}{entity.unit ? ` ${entity.unit}` : ""}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {locale === "ar" ? "نسبة الإنجاز" : "Achievement"}
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {entityValue.achievementValue != null 
                    ? `${formatNumber(entityValue.achievementValue)}%`
                    : "—"
                  }
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {locale === "ar" ? "النوع" : "Type"}
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {locale === "ar" 
                    ? (entity.orgEntityType.nameAr ?? entity.orgEntityType.name)
                    : entity.orgEntityType.name
                  }
                </p>
              </div>
            </div>

            <Separator className="bg-muted/30" />

            {historicalValues.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {locale === "ar" ? "القيم التاريخية" : "Historical Values"}
                </p>
                <div className="flex flex-wrap gap-2" dir="ltr">
                  {historicalValues.map((hv, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1">
                      <span className="text-[10px] text-muted-foreground">{formatDate(hv.createdAt)}:</span>
                      <span className="text-xs font-semibold">
                        {formatNumber(hv.finalValue ?? hv.calculatedValue ?? hv.actualValue ?? 0)}{entity.unit ?? ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {locale === "ar" ? "الملاحظات" : "Notes"}
              </p>
              <div className="mt-3 space-y-3">
                <ApprovalCommentBox
                  onSubmit={handleAddComment}
                  disabled={!canApprove || !isPending}
                  locale={locale}
                />
                {comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {locale === "ar" ? "لا توجد ملاحظات بعد" : "No comments yet"}
                  </p>
                ) : (
                  comments.map((c, i) => (
                    <div key={i} className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{c?.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c?.author} • {c?.at ? new Date(c.at).toLocaleString() : "—"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="tabler:bolt" className="h-4 w-4 text-foreground" />
              {t("actions")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {locale === "ar" ? "اعتماد أو رفض القيمة المُدخلة" : "Approve or reject the submitted value"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground">
            {!canApprove && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 mb-3">
                {locale === "ar" 
                  ? "ليس لديك صلاحية الموافقة على هذه القيمة"
                  : "You do not have approval authority for this value"
                }
              </div>
            )}
            
            <Button
              variant="secondary"
              className="w-full"
              disabled={!canApprove || !isPending || actionLoading}
              onClick={handleApprove}
            >
              <span className="inline-flex items-center gap-2">
                {actionLoading ? (
                  <Icon name="tabler:loader-2" className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon name="tabler:circle-check" className="h-4 w-4" />
                )}
                {locale === "ar" ? "اعتماد" : "Approve"}
              </span>
            </Button>
            
            <Button
              variant="outline"
              className="w-full border-border bg-card/50 text-foreground hover:bg-muted/30 hover:text-foreground"
              disabled={!canApprove || !isPending || actionLoading}
              onClick={handleReject}
            >
              <span className="inline-flex items-center gap-2">
                {actionLoading ? (
                  <Icon name="tabler:loader-2" className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon name="tabler:circle-x" className="h-4 w-4" />
                )}
                {locale === "ar" ? "رفض" : "Reject"}
              </span>
            </Button>
            
            <Link
              href={`/${locale}/approvals`}
              className="mt-2 inline-flex text-sm font-semibold text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary/70"
            >
              {t("backToApprovals")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ApprovalCommentBox({ 
  onSubmit, 
  disabled,
  locale 
}: { 
  onSubmit: (message: string) => void; 
  disabled?: boolean;
  locale: string;
}) {
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-3">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={locale === "ar" ? "أضف ملاحظة..." : "Add a comment..."}
        className="border-border bg-muted/20 text-foreground placeholder:text-muted-foreground"
        disabled={disabled}
      />
      <Button
        variant="outline"
        className="border-border bg-card/50 text-foreground hover:bg-muted/30 hover:text-foreground"
        disabled={message.trim().length === 0 || disabled}
        onClick={() => {
          onSubmit(message.trim());
          setMessage("");
        }}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="tabler:message-plus" className="h-4 w-4" />
          {locale === "ar" ? "إضافة ملاحظة" : "Add Comment"}
        </span>
      </Button>
    </div>
  );
}
