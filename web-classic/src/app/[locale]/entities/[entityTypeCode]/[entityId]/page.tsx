"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { EChartsOption } from "echarts";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Link2, Loader2, Pencil, Trash2, Upload, File, X, Plus, Calendar, Gauge, Activity, AlignJustify } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EChart } from "@/components/charts/echart";
import { KpiGauge } from "@/components/charts/kpi-gauge";
import { KpiRingCard } from "@/components/charts/kpi-ring-card";
import { KpiLineCard } from "@/components/charts/kpi-line-card";
import { EntityAssignments } from "@/components/entity-assignments";
import { EntityDependencyDiagram } from "@/components/entity-dependency-diagram";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { useTheme } from "@/providers/theme-provider";
import { Toaster, useToast } from "@/components/ui/toast";
import { ActionValidationIssue } from "@/types/actions";
import {
  deleteOrgEntity,
  getOrgEntityDetail,
  saveOrgEntityKpiValuesDraft,
  getOrgEntitiesByKeys,
  recalculateEntityValue,
  getEntityDependencyTree,
} from "@/actions/entities";
import {
  submitEntityForApproval,
  approveEntityValue,
  rejectEntityValue,
} from "@/actions/approvals";
import {
  addEntityAttachmentUrl,
  deleteEntityAttachment,
  getEntityAttachments,
  type EntityAttachment,
} from "@/actions/entity-attachments";
import { useDiagramsEnabled, useApprovalsWorkflowEnabled, useFileAttachmentsEnabled } from "@/lib/ai-features";

type EntityDetail = Awaited<ReturnType<typeof getOrgEntityDetail>>;

type EntityVariableRow = NonNullable<EntityDetail>["entity"]["variables"][number];

type ReferencedEntity = Awaited<ReturnType<typeof getOrgEntitiesByKeys>>[number];

type DependencyTree = Awaited<ReturnType<typeof getEntityDependencyTree>>;


function toNumberOrUndefined(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function numberToInputString(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  if (Number.isInteger(value)) return String(value);
  const fixed = value.toFixed(4);
  return fixed.replace(/\.0+$/, "").replace(/(\.[0-9]*?)0+$/, "$1");
}

function periodValue(period: {
  actualValue: number | null;
  calculatedValue: number | null;
  finalValue: number | null;
}) {
  if (typeof period.finalValue === "number") return period.finalValue;
  if (typeof period.calculatedValue === "number") return period.calculatedValue;
  if (typeof period.actualValue === "number") return period.actualValue;
  return null;
}

function extractFormulaKeys(formula: string): string[] {
  const keys: string[] = [];
  const re = /get\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of formula.matchAll(re)) {
    const key = String(match[1] ?? "").toUpperCase().trim();
    if (key) keys.push(key);
  }

  return Array.from(new Set(keys));
}

function latestEntityValue(values: { actualValue: number | null; calculatedValue: number | null; finalValue: number | null } | null) {
  if (!values) return null;
  if (typeof values.finalValue === "number") return values.finalValue;
  if (typeof values.calculatedValue === "number") return values.calculatedValue;
  if (typeof values.actualValue === "number") return values.actualValue;
  return null;
}

export default function EntityDetailPage() {
  const params = useParams<{ entityTypeCode: string; entityId: string }>();
  const router = useRouter();
  const { user, loading: sessionLoading } = useAuth();
  const { locale, t, tr, df, formatNumber, te, kpiValueStatusLabel } = useLocale();
  const diagramsEnabled = useDiagramsEnabled();
  const approvalsWorkflowEnabled = useApprovalsWorkflowEnabled();
  const fileAttachmentsEnabled = useFileAttachmentsEnabled();

  const userRole = typeof (user as unknown as { role?: unknown })?.role === "string" ? String((user as unknown as { role?: unknown })?.role) : undefined;
  const canAdmin = userRole === "ADMIN";

  const entityTypeCode = String(params.entityTypeCode ?? "");

  const [data, setData] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [valuesByVariableId, setValuesByVariableId] = useState<Record<string, string>>({});
  const [manualValue, setManualValue] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  
  const [referencedEntities, setReferencedEntities] = useState<ReferencedEntity[]>([]);
  
  const [dependencyTree, setDependencyTree] = useState<DependencyTree>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [dependencyTreeError, setDependencyTreeError] = useState<string | null>(null);
  
  const [calculating, setCalculating] = useState(false);
  const [calculateError, setCalculateError] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<EntityAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlName, setUrlName] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [depViewMode, setDepViewMode] = useState<"gauge" | "ring" | "line">("ring");
  const { toasts, toast, dismiss } = useToast();

  async function reload() {
    setLoading(true);
    setLoadError(null);

    try {
      const result = await getOrgEntityDetail({ entityId: String(params.entityId) });
      setData(result);

      const current = result?.currentPeriod ?? null;
      if (current?.note) setNote(String(current.note));

      const vv = current?.variableValues ?? [];
      const preset: Record<string, string> = {};
      for (const row of vv) preset[String(row.entityVariableId)] = numberToInputString(row.value);
      setValuesByVariableId(preset);

      const mv = current ? periodValue(current) : null;
      if (typeof mv === "number") {
        setManualValue(String(mv));
      }

      // Load referenced entities from formula
      if (result?.entity?.formula) {
        const keys = extractFormulaKeys(result.entity.formula);
        if (keys.length > 0) {
          try {
            const refs = await getOrgEntitiesByKeys({ keys });
            setReferencedEntities(refs);
          } catch (err) {
            console.error("Failed to load referenced entities:", err);
          }
        }
      }

      // Load dependency tree for Mermaid diagram
      if (result?.entity?.id) {
        setLoadingTree(true);
        setDependencyTreeError(null);
        try {
          const tree = await getEntityDependencyTree({ entityId: result.entity.id, maxDepth: 5 });
          setDependencyTree(tree);
        } catch (err) {
          console.error("Failed to load dependency tree:", err);
          setDependencyTreeError(err instanceof Error ? err.message : "Failed to load dependency tree");
        } finally {
          setLoadingTree(false);
        }
      }

      if (result?.entity?.id) {
        setAttachmentsLoading(true);
        setAttachmentsError(null);
        try {
          const rows = await getEntityAttachments({ entityId: result.entity.id });
          setAttachments(rows);
        } catch (err) {
          console.error("Failed to load attachments:", err);
          setAttachmentsError(err instanceof Error ? err.message : "Failed to load attachments");
        } finally {
          setAttachmentsLoading(false);
        }
      }

    } catch (error: unknown) {
      console.error("Failed to load item", error);
      setData(null);
      setLoadError(error instanceof Error ? error.message : "Failed to load item");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) return;
    if (userRole === "SUPER_ADMIN") return;
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.entityId, sessionLoading, userRole]);

  const entity = data?.entity ?? null;
  const isKpiEntity = String(entity?.orgEntityType?.code ?? "").toUpperCase() === "KPI";

  async function refreshAttachments(entityId: string) {
    setAttachmentsLoading(true);
    setAttachmentsError(null);
    try {
      const rows = await getEntityAttachments({ entityId });
      setAttachments(rows);
    } catch (err) {
      console.error("Failed to load attachments:", err);
      setAttachmentsError(err instanceof Error ? err.message : "Failed to load attachments");
    } finally {
      setAttachmentsLoading(false);
    }
  }

  async function handleUploadAttachments() {
    if (!entity) return;
    if (selectedFiles.length === 0) return;

    setUploadingFile(true);
    setUploadError(null);

    try {
      for (const file of selectedFiles) {
        const fd = new FormData();
        fd.set("entityId", entity.id);
        fd.set("file", file);

        const res = await fetch("/api/entity-attachments/upload", {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          setUploadError(te(json?.error) || json?.error || tr("Failed to upload", "فشل رفع الملف"));
          return;
        }
      }

      setSelectedFiles([]);
      await refreshAttachments(entity.id);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : tr("Failed to upload", "فشل رفع الملف"));
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleAddUrlAttachment() {
    if (!entity) return;

    setAddingUrl(true);
    setUrlError(null);

    try {
      const res = await addEntityAttachmentUrl({
        entityId: entity.id,
        name: urlName.trim() ? urlName.trim() : urlValue.trim(),
        url: urlValue.trim(),
      });

      if (!res.success) {
        setUrlError(te(res.error) || res.error || tr("Failed to add", "فشل الإضافة"));
        return;
      }

      setUrlName("");
      setUrlValue("");
      await refreshAttachments(entity.id);
    } catch (err: unknown) {
      setUrlError(err instanceof Error ? err.message : tr("Failed to add", "فشل الإضافة"));
    } finally {
      setAddingUrl(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!entity) return;
    setDeletingAttachmentId(attachmentId);
    setAttachmentsError(null);

    try {
      const res = await deleteEntityAttachment({ attachmentId });
      if (!res.success) {
        setAttachmentsError(te(res.error) || res.error || tr("Failed to delete", "فشل الحذف"));
        return;
      }
      await refreshAttachments(entity.id);
    } catch (err: unknown) {
      setAttachmentsError(err instanceof Error ? err.message : tr("Failed to delete", "فشل الحذف"));
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  const staticVariables = useMemo(() => {
    return (entity?.variables ?? []).filter((v) => v.isStatic);
  }, [entity?.variables]);

  const fillableVariables = useMemo(() => {
    return (entity?.variables ?? []).filter((v) => !v.isStatic);
  }, [entity?.variables]);

  const needsManualValue = useMemo(() => {
    const hasFormula = Boolean(entity?.formula && entity.formula.trim().length > 0);
    return fillableVariables.length === 0 && staticVariables.length === 0 && !hasFormula;
  }, [entity?.formula, fillableVariables.length, staticVariables.length]);

  const enDateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }, []);

  const arDateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }, []);

  const currentValue = useMemo(() => {
    const current = data?.currentPeriod ?? null;
    if (current) return periodValue(current);
    const latest = data?.latest ?? null;
    if (latest) return periodValue(latest);
    return null;
  }, [data?.currentPeriod, data?.latest]);

  const unitLabel = entity ? df(entity.unit, entity.unitAr) : "";

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const trendOption = useMemo<EChartsOption>(() => {
    const points = (entity?.values ?? []).slice().reverse();
    const labels = points.map((p) => p.createdAt.toISOString().slice(0, 10));
    const values = points.map((p) => periodValue(p) ?? 0);
    const axisLabelColor = isDark ? "rgba(226,232,240,0.6)" : "rgba(15,23,42,0.5)";
    const splitLineColor = isDark ? "rgba(148,163,184,0.08)" : "rgba(15,23,42,0.06)";
    const tooltipBg = isDark ? "rgba(2,6,23,0.9)" : "rgba(255,255,255,0.95)";
    const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(2,6,23,0.08)";

    return {
      grid: { left: 16, right: 16, top: 12, bottom: 20, containLabel: true },
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: isDark ? "rgba(226,232,240,0.9)" : "rgba(15,23,42,0.9)", fontSize: 11 },
        extraCssText: "border-radius: 6px;",
      },
      xAxis: { 
        type: "category", 
        data: labels, 
        axisLabel: { color: axisLabelColor, fontSize: 10 }, 
        axisLine: { lineStyle: { color: splitLineColor } }, 
        axisTick: { show: false } 
      },
      yAxis: {
        type: "value",
        axisLabel: { color: axisLabelColor, fontSize: 10 },
        splitLine: { lineStyle: { color: splitLineColor } },
      },
      series: [
        {
          type: "line",
          data: values,
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          lineStyle: { width: 2, color: "#3b82f6" },
          itemStyle: { color: "#3b82f6", borderWidth: 0 },
          areaStyle: { color: isDark ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.08)" },
          markLine: {
            symbol: "none",
            lineStyle: { color: "rgba(59,130,246,0.4)", type: "dashed", width: 1 },
            label: { show: false },
            data: [{ yAxis: entity?.targetValue ?? 0 }],
          },
        },
      ],
    };
  }, [entity?.targetValue, entity?.values, isDark]);

  async function handleCalculate() {
    if (!entity) return;
    setCalculating(true);
    setCalculateError(null);

    try {
      const res = await recalculateEntityValue({ entityId: entity.id });
      if (!res.success) {
        const translated = te(res.error) || res.error || tr("Calculation failed", "فشل الحساب");
        setCalculateError(translated);
        return;
      }

      await reload();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr("Calculation failed", "فشل الحساب");
      setCalculateError(message);
    } finally {
      setCalculating(false);
    }
  }

  async function handleSaveDraft() {
    if (!entity) return;
    setSaving(true);
    setSaveError(null);

    try {
      const values: Record<string, number> = {};
      for (const v of fillableVariables) {
        const raw = valuesByVariableId[v.id] ?? "";
        if (!raw.trim()) continue;
        const n = Number(raw);
        values[v.id] = n;
      }

      const payload: {
        entityId: string;
        note?: string;
        manualValue?: number;
        values: Record<string, number>;
      } = {
        entityId: entity.id,
        values,
      };

      if (note.trim()) payload.note = note.trim();

      if (needsManualValue) {
        const mv = toNumberOrUndefined(manualValue);
        if (typeof mv === "number") payload.manualValue = mv;
      }

      const res = await saveOrgEntityKpiValuesDraft(payload);
      if (!res.success) {
        const issues = (res as { issues?: ActionValidationIssue[] }).issues ?? null;
        const translated = te(res.error, issues);
        setSaveError(translated || res.error || t("failedToSave"));
        return;
      }

      toast(t("savedSuccessfully"));
      await reload();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("failedToSave");
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entity) return;
    if (!canAdmin) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await deleteOrgEntity({ entityId: entity.id });
      if (!res.success) {
        setDeleteError(te(res.error) || res.error || t("failedToDelete"));
        return;
      }

      setDeleteOpen(false);
      router.push(`/${locale}/entities/${entityTypeCode}`);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("failedToDelete");
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmitForApproval() {
    if (!entity || !data?.currentPeriod?.id) return;

    setSubmitting(true);
    setApprovalError(null);

    try {
      const res = await submitEntityForApproval({ 
        entityId: entity.id, 
        periodId: data.currentPeriod.id 
      });
      if (!res.success) {
        setApprovalError(te(res.error) || res.error || tr("Failed to submit", "فشل الإرسال"));
        return;
      }

      if (res.autoApproved) {
        setApprovalError(null);
      }
      toast(t("submittedForApproval"));
      await reload();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr("Failed to submit", "فشل الإرسال");
      setApprovalError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!entity || !data?.currentPeriod?.id) return;

    setApproving(true);
    setApprovalError(null);

    try {
      const res = await approveEntityValue({ 
        entityId: entity.id, 
        periodId: data.currentPeriod.id 
      });
      if (!res.success) {
        setApprovalError(te(res.error) || res.error || tr("Failed to approve", "فشل الاعتماد"));
        return;
      }

      toast(t("approvedSuccess"));
      await reload();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr("Failed to approve", "فشل الاعتماد");
      setApprovalError(message);
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!entity || !data?.currentPeriod?.id) return;

    setRejecting(true);
    setApprovalError(null);

    try {
      const res = await rejectEntityValue({ 
        entityId: entity.id, 
        periodId: data.currentPeriod.id 
      });
      if (!res.success) {
        setApprovalError(te(res.error) || res.error || tr("Failed to reject", "فشل الرفض"));
        return;
      }

      toast(t("rejectedSuccess"));
      await reload();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr("Failed to reject", "فشل الرفض");
      setApprovalError(message);
    } finally {
      setRejecting(false);
    }
  }


  if (sessionLoading || loading) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-6">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-6">
        <p className="text-sm text-muted-foreground">{t("noActiveSession")}</p>
        <Link
          href={`/${locale}/auth/login`}
          className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
        >
          {t("goToSignIn")}
        </Link>
      </div>
    );
  }

  if (userRole === "SUPER_ADMIN") {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-6">
        <p className="text-sm text-muted-foreground">{t("unauthorized")}</p>
        <Link
          href={`/${locale}/super-admin`}
          className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
        >
          {t("back")}
        </Link>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-6">
        <p className="text-sm text-muted-foreground">{loadError ? te(loadError) || loadError : t("notFound")}</p>
        <Link
          href={`/${locale}/entities/${entityTypeCode}`}
          className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
        >
          {t("back")}
        </Link>
      </div>
    );
  }

  const pageTitle = df(entity.title, entity.titleAr);
  const canEditValues = canAdmin || (data?.userAccess?.canEditValues ?? false);
  const currentStatus = data?.currentPeriod?.status ?? "DRAFT";
  const canApprove = data?.approvalContext?.canApprove ?? false;
  const isSubmitted = currentStatus === "SUBMITTED";
  const isApproved = currentStatus === "APPROVED";
  const isDraft = currentStatus === "DRAFT";
  const canEditPeriod = canEditValues && (isDraft || isApproved);
  
  // Check if KPI has any fillable inputs
  const hasFillableInputs = fillableVariables.length > 0 || needsManualValue;
  const showInputsSection = staticVariables.length > 0 || fillableVariables.length > 0 || needsManualValue;

  return (
    <div className="space-y-8">
      <PageHeader
        title={pageTitle}
        subtitle={df(entity.orgEntityType.name, entity.orgEntityType.nameAr)}
        breadcrumbs={[
          { label: df(entity.orgEntityType.name, entity.orgEntityType.nameAr), href: `/${locale}/entities/${entityTypeCode}` },
          { label: pageTitle },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href={`/${locale}/entities/${entityTypeCode}`}>{t("back")}</Link>
            </Button>
            {canAdmin ? (
              <>
                <Button type="button" variant="outline" asChild>
                  <Link href={`/${locale}/entities/${entityTypeCode}/${params.entityId}/edit`}>
                    <Pencil className="me-2 h-4 w-4" />
                    {t("edit")}
                  </Link>
                </Button>
                <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="me-2 h-4 w-4" />
                  {t("delete")}
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {entity.description || entity.descriptionAr ? (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{t("description")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{df(entity.description, entity.descriptionAr)}</p>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview" className="gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            {tr("Overview", "نظرة عامة")}
          </TabsTrigger>
          {showInputsSection && (
            <TabsTrigger value="inputs" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              {t("inputs")}
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {tr("History", "السجل")}
          </TabsTrigger>
          {fileAttachmentsEnabled && (
            <TabsTrigger value="attachments" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {tr("Attachments", "المرفقات")}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-border/60 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{isKpiEntity ? tr("KPI", "مؤشر الأداء") : tr("Value", "القيمة")}</CardTitle>
          </CardHeader>
          <CardContent>
            <KpiRingCard value={currentValue} target={entity.targetValue ?? null} unit={unitLabel || undefined} size={112} />
            {/* Baseline → Current → Target */}
            {(typeof entity.baselineValue === "number" || typeof entity.targetValue === "number") && (
              <div className="mt-4 flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                {typeof entity.baselineValue === "number" && (
                  <div className="text-center flex-1">
                    <div className="text-[10px] text-muted-foreground">{tr("Baseline", "خط الأساس")}</div>
                    <div className="text-sm font-medium tabular-nums" dir="ltr">{formatNumber(entity.baselineValue)}{unitLabel ? ` ${unitLabel}` : ""}</div>
                  </div>
                )}
                {typeof entity.baselineValue === "number" && <div className="text-muted-foreground/40">→</div>}
                <div className="text-center flex-1">
                  <div className="text-[10px] text-muted-foreground">{tr("Current", "الحالي")}</div>
                  <div className="text-sm font-semibold tabular-nums text-primary" dir="ltr">{currentValue !== null ? formatNumber(Math.round(currentValue * 10) / 10) : "—"}{unitLabel ? ` ${unitLabel}` : ""}</div>
                </div>
                {typeof entity.targetValue === "number" && <div className="text-muted-foreground/40">→</div>}
                {typeof entity.targetValue === "number" && (
                  <div className="text-center flex-1">
                    <div className="text-[10px] text-muted-foreground">{tr("Target", "المستهدف")}</div>
                    <div className="text-sm font-medium tabular-nums" dir="ltr">{formatNumber(entity.targetValue)}{unitLabel ? ` ${unitLabel}` : ""}</div>
                  </div>
                )}
              </div>
            )}
            {isKpiEntity && (
              <div className="mt-3 text-xs text-muted-foreground">
                {tr("Status", "الحالة")}: {kpiValueStatusLabel(String(data?.currentPeriod?.status ?? data?.latest?.status ?? "DRAFT"))}
              </div>
            )}
            {entity.formula && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{tr("Formula", "الصيغة")}</div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCalculate()}
                    disabled={calculating}
                    className="h-6 text-xs"
                  >
                    {calculating ? (
                      <>
                        <Loader2 className="me-1 h-3 w-3 animate-spin" />
                        {tr("Calculating", "جارٍ الحساب")}
                      </>
                    ) : (
                      tr("Calculate", "احسب")
                    )}
                  </Button>
                </div>
                <div className="rounded-md bg-muted/30 p-2 font-mono text-[10px] overflow-x-auto">
                  {entity.formula}
                </div>
                {calculateError && (
                  <div className="text-xs text-destructive">{calculateError}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{tr("Trend", "الاتجاه")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EChart option={trendOption} height={240} />
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="inputs" className="space-y-4">
      {showInputsSection ? (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{t("inputs")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Approval Status Badge */}
            {approvalsWorkflowEnabled && data?.currentPeriod && (
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{tr("Status", "الحالة")}:</span>
                  {isApproved && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {tr("Approved", "معتمد")}
                    </span>
                  )}
                  {isSubmitted && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {tr("Pending Approval", "في انتظار الاعتماد")}
                    </span>
                  )}
                  {isDraft && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      {tr("Draft", "مسودة")}
                    </span>
                  )}
                </div>
                {data.approvalContext && (
                  <span className="text-xs text-muted-foreground">
                    {tr("Approval Level", "مستوى الاعتماد")}: {data.approvalContext.orgApprovalLevel}
                  </span>
                )}
              </div>
            )}

            {saveError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveError}
              </div>
            ) : null}

            {approvalError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {approvalError}
              </div>
            ) : null}

            {entity.formula ? (
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                <div className="text-xs text-muted-foreground">{tr("Formula", "المعادلة")}</div>
                <div className="mt-1 font-mono text-xs">{entity.formula}</div>
              </div>
            ) : null}

            {staticVariables.length ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">{t("staticInputs")}</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {staticVariables.map((v) => (
                    <div key={v.id} className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                      <div className="text-sm font-medium">{df(v.displayName, v.nameAr)}</div>
                      <div className="text-xs text-muted-foreground">{v.code}</div>
                      <div className="mt-1 text-sm">{typeof v.staticValue === "number" ? formatNumber(v.staticValue) : "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {fillableVariables.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {fillableVariables.map((v: EntityVariableRow) => (
                  <div key={v.id} className="space-y-1">
                    <Label htmlFor={`var-${v.id}`} className="text-sm">{df(v.displayName, v.nameAr)}</Label>
                    <Input
                      id={`var-${v.id}`}
                      value={valuesByVariableId[v.id] ?? ""}
                      onChange={(e) => setValuesByVariableId((p) => ({ ...p, [v.id]: e.target.value }))}
                      placeholder={v.dataType === "PERCENTAGE" ? "0-100" : "0"}
                      disabled={!canEditPeriod}
                    />
                    <div className="text-xs text-muted-foreground">{v.code}</div>
                  </div>
                ))}
              </div>
            ) : needsManualValue ? (
              <div className="space-y-1">
                <Label htmlFor="manualValue" className="text-sm">{t("value")}</Label>
                <Input id="manualValue" value={manualValue} onChange={(e) => setManualValue(e.target.value)} disabled={!canEditPeriod} />
              </div>
            ) : (
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {tr("No editable inputs for this entity.", "لا توجد مدخلات قابلة للتعديل لهذا الكيان.")}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="note" className="text-sm">{tr("Note", "ملاحظة")}</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} disabled={!canEditPeriod} />
            </div>

            {/* Action Buttons */}
            {hasFillableInputs && (
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                {!canEditValues ? (
                  <div className="text-sm text-muted-foreground">
                    {tr("Read-only: You can view this entity but cannot edit its values.", "للقراءة فقط: يمكنك عرض هذا الكيان لكن لا يمكنك تعديل قيمه.")}
                  </div>
                ) : approvalsWorkflowEnabled && isSubmitted ? (
                <div className="flex items-center justify-between w-full">
                  <div className="text-sm text-muted-foreground">
                    {tr("Locked for approval. Contact an approver to make changes.", "مقفل للاعتماد. اتصل بالمعتمد لإجراء تغييرات.")}
                  </div>
                  {canApprove && (
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => void handleReject()} disabled={rejecting}>
                        {rejecting ? (
                          <>
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            {tr("Rejecting", "جارٍ الرفض")}
                          </>
                        ) : (
                          tr("Reject", "رفض")
                        )}
                      </Button>
                      <Button type="button" onClick={() => void handleApprove()} disabled={approving}>
                        {approving ? (
                          <>
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            {tr("Approving", "جارٍ الاعتماد")}
                          </>
                        ) : (
                          tr("Approve", "اعتماد")
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  {isApproved ? (
                    <div className="text-sm text-muted-foreground">
                      {tr("This period has been approved. Changes require creating a new version.", "تم اعتماد هذه الفترة. التغييرات تتطلب إنشاء نسخة جديدة.")}
                    </div>
                  ) : (
                    <div />
                  )}
                  <div className="flex items-center justify-end gap-2">
                    {canEditPeriod && (
                      <>
                        <Button type="button" variant="outline" onClick={() => void handleSaveDraft()} disabled={saving}>
                          {saving ? (
                            <>
                              <Loader2 className="me-2 h-4 w-4 animate-spin" />
                              {t("saving")}
                            </>
                          ) : (
                            t("save")
                          )}
                        </Button>
                        {approvalsWorkflowEnabled && !isApproved && (
                          <Button type="button" onClick={() => void handleSubmitForApproval()} disabled={submitting}>
                            {submitting ? (
                              <>
                                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                {tr("Submitting", "جارٍ الإرسال")}
                              </>
                            ) : (
                              tr("Submit for Approval", "إرسال للاعتماد")
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
      {/* Previous Values Table */}
      {entity ? (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{tr("Previous Values", "القيم السابقة")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-medium">{tr("Date", "التاريخ")}</TableHead>
                    <TableHead className="text-xs font-medium">{tr("Status", "الحالة")}</TableHead>
                    <TableHead className="text-right text-xs font-medium">{tr("Value", "القيمة")}</TableHead>
                    <TableHead className="text-xs font-medium">{tr("Note", "ملاحظة")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entity.values && entity.values.length > 0 ? (
                    entity.values.map((value) => {
                      const displayValue = periodValue(value);
                      return (
                        <TableRow key={value.id} className="hover:bg-muted/20">
                          <TableCell className="text-sm py-2">
                            {df(
                              enDateFormatter.format(value.createdAt),
                              arDateFormatter.format(value.createdAt)
                            )}
                          </TableCell>
                          <TableCell className="py-2">
                            <span className={`inline-flex items-center gap-1 text-xs ${
                              value.status === "APPROVED" 
                                ? "text-green-600 dark:text-green-500"
                                : value.status === "SUBMITTED"
                                ? "text-amber-600 dark:text-amber-500"
                                : "text-muted-foreground"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                value.status === "APPROVED" 
                                  ? "bg-green-500"
                                  : value.status === "SUBMITTED"
                                  ? "bg-amber-500"
                                  : "bg-muted-foreground"
                              }`} />
                              {kpiValueStatusLabel(String(value.status))}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm py-2">
                            {displayValue !== null ? formatNumber(displayValue) : "—"}
                            {unitLabel && displayValue !== null ? ` ${unitLabel}` : ""}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate py-2">
                            {value.note || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                        {tr("No previous values yet.", "لا توجد قيم سابقة بعد.")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
      {/* Attachments Section */}
      {fileAttachmentsEnabled && entity ? (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{tr("Attachments", "المرفقات")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attachmentsError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {attachmentsError}
              </div>
            ) : null}

            {/* Upload Files Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                {tr("Upload Files", "رفع الملفات")}
              </h3>
              
              {uploadError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {uploadError}
                </div>
              ) : null}

              <div className="flex gap-2">
                <Input
                  type="file"
                  multiple
                  className="flex-1"
                  disabled={uploadingFile}
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
                />
                <Button
                  type="button"
                  onClick={() => void handleUploadAttachments()}
                  disabled={uploadingFile || selectedFiles.length === 0}
                >
                  {uploadingFile ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {tr("Uploading", "جارٍ الرفع")}
                    </>
                  ) : (
                    <>
                      <Upload className="me-2 h-4 w-4" />
                      {tr("Upload", "رفع")}
                    </>
                  )}
                </Button>
              </div>
              {selectedFiles.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {selectedFiles.length} {tr("file(s) selected", "ملف محدد")}: {selectedFiles.map(f => f.name).join(", ")}
                </div>
              )}
            </div>

            {/* Add URL Section */}
            <div className="space-y-2 pt-3 border-t border-border/60">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                {tr("Add Link", "إضافة رابط")}
              </h3>
              
              {urlError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {urlError}
                </div>
              ) : null}

              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder={tr("Link name (optional)", "اسم الرابط (اختياري)")}
                  value={urlName}
                  onChange={(e) => setUrlName(e.target.value)}
                  disabled={addingUrl}
                />
                <Input
                  placeholder={tr("URL", "رابط")}
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  disabled={addingUrl}
                />
              </div>
              <Button
                type="button"
                onClick={() => void handleAddUrlAttachment()}
                disabled={addingUrl || !urlValue.trim()}
                variant="outline"
              >
                {addingUrl ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {tr("Adding", "جارٍ الإضافة")}
                  </>
                ) : (
                  <>
                    <Plus className="me-2 h-4 w-4" />
                    {tr("Add Link", "إضافة رابط")}
                  </>
                )}
              </Button>
            </div>

            {/* Display Attachments */}
            {attachmentsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : attachments.length > 0 ? (
              <div className="space-y-2 pt-3 border-t border-border/60">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {tr("Uploaded Files", "الملفات المرفوعة")} ({attachments.length})
                </h3>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {attachments.map((attachment) => {
                    const isUrl = attachment.type === "URL";
                    const displayName = attachment.name;
                    const fileExtension = attachment.name?.split(".").pop()?.toUpperCase() || "FILE";
                    const attachmentUrl = isUrl ? (attachment.url || "#") : `/api/entity-attachments/${attachment.id}`;
                    
                    return (
                      <a
                        key={attachment.id}
                        href={attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 p-2 hover:border-primary/30 transition-colors"
                      >
                        <div className="shrink-0 rounded-md p-1.5 bg-primary/10">
                          {isUrl ? (
                            <Link2 className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <File className="h-3.5 w-3.5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {displayName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {isUrl ? attachment.url : fileExtension}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleDeleteAttachment(attachment.id);
                          }}
                          disabled={deletingAttachmentId === attachment.id}
                        >
                          {deletingAttachmentId === attachment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-6 text-center">
                <FileText className="mx-auto h-6 w-6 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {tr("No attachments yet. Upload files or add links above.", "لا توجد مرفقات بعد. قم برفع الملفات أو إضافة الروابط أعلاه.")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
        </TabsContent>
      </Tabs>

      {diagramsEnabled && entity ? (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{tr("Formula Dependency Tree", "شجرة الاعتماديات")}</CardTitle>
          </CardHeader>
          <CardContent>
            {dependencyTreeError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {dependencyTreeError}
              </div>
            ) : null}
            <EntityDependencyDiagram tree={dependencyTree} locale={locale} loading={loadingTree} />
          </CardContent>
        </Card>
      ) : null}

      {/* Referenced Entities Section */}
      {entity.formula && referencedEntities.length > 0 && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base font-medium">{tr("Formula Dependencies", "اعتماديات الصيغة")}</CardTitle>
              <div className="flex items-center rounded-md border border-border/60 bg-muted/30 p-0.5 gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setDepViewMode("gauge")}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                    depViewMode === "gauge" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Gauge view"
                >
                  <Gauge className="h-3 w-3" />
                  <span className="hidden sm:inline">{tr("Gauge", "مقياس")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDepViewMode("ring")}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                    depViewMode === "ring" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Ring view"
                >
                  <Activity className="h-3 w-3" />
                  <span className="hidden sm:inline">{tr("Ring", "حلقة")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDepViewMode("line")}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                    depViewMode === "line" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Line view"
                >
                  <AlignJustify className="h-3 w-3" />
                  <span className="hidden sm:inline">{tr("Line", "شريط")}</span>
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {referencedEntities.map((ref) => {
                const refValue = latestEntityValue(ref.latestValue);
                const refUnit = df(ref.unit, ref.unitAr);
                return (
                  <Link
                    key={ref.id}
                    href={`/${locale}/entities/${ref.entityType.code.toLowerCase()}/${ref.id}`}
                    className="block group"
                  >
                    <Card className="h-full border border-border/60 hover:border-primary/30 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground uppercase">
                              {df(ref.entityType.name, ref.entityType.nameAr)}
                            </div>
                            <div className="mt-0.5 text-sm font-medium truncate group-hover:underline">
                              {df(ref.title, ref.titleAr)}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <svg 
                              className="h-4 w-4 text-muted-foreground" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {depViewMode === "gauge" ? (
                          <KpiGauge
                            value={refValue}
                            target={ref.targetValue}
                            unit={refUnit || undefined}
                            height={140}
                            withCard={false}
                          />
                        ) : depViewMode === "ring" ? (
                          <KpiRingCard value={refValue} target={ref.targetValue} unit={refUnit || undefined} size={100} />
                        ) : (
                          <KpiLineCard value={refValue} target={ref.targetValue} unit={refUnit || undefined} />
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignments Section */}
      {canAdmin ? <EntityAssignments entityId={entity.id} entityTitle={pageTitle} /> : null}

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (open) setDeleteError(null);
        }}
      >
        <DialogContent className="border border-border/60 bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">{t("delete")}</DialogTitle>
            <DialogDescription>{tr("This will remove the item.", "سيتم حذف العنصر.")}</DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          ) : null}

          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium">{pageTitle}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
