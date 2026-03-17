"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useMessagePartReasoning,
  useMessagePartText,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useAISDKRuntime,
} from "@assistant-ui/react-ai-sdk";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/icon";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";
import { AiMarkdown } from "./ai-markdown";

// ── Types ─────────────────────────────────────────────────────────────────────

type QuickSuggestion = {
  id: string;
  icon: string;
  label: string;
  labelAr: string;
  prompt: string;
  promptAr: string;
};

type ToolState =
  | "running"
  | "complete"
  | "incomplete"
  | "requires-action"
  | undefined;

type ToolDisplay = {
  icon: string;
  label: string;
  detail: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPart = any;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isToolPart(part: AnyPart): boolean {
  return typeof part?.type === "string" && part.type.startsWith("tool-");
}

function getToolNameFromPart(part: AnyPart): string {
  return String(part?.type ?? "").replace(/^tool-/, "");
}

function getToolOutputFromPart(part: AnyPart): unknown {
  return part?.output;
}

function getToolStatusType(status: unknown): ToolState {
  if (!status || typeof status !== "object" || !("type" in status)) return undefined;
  return (status as { type?: ToolState }).type;
}

function getToolDisplay(
  toolName: string,
  args: Record<string, unknown>,
  isRunning: boolean,
  tr: (en: string, ar: string) => string,
): ToolDisplay {
  switch (toolName) {
    case "getOrgOverview":
      return {
        icon: "tabler:building-community",
        label: isRunning ? tr("Analyzing organization", "جاري تحليل الجهة") : tr("Organization summary ready", "ملخص الجهة جاهز"),
        detail: tr("Health, approvals, stale KPIs", "الصحة والموافقات والمؤشرات المتأخرة"),
      };
    case "getKpiList":
      return {
        icon: "tabler:list-details",
        label: isRunning ? tr("Collecting KPI list", "جاري جمع قائمة المؤشرات") : tr("KPI list ready", "قائمة المؤشرات جاهزة"),
        detail:
          typeof args.search === "string" && args.search.length > 0
            ? String(args.search)
            : typeof args.statusFilter === "string"
              ? String(args.statusFilter)
              : tr("Filtered KPI view", "عرض المؤشرات المفلتر"),
      };
    case "getKpiDetail":
      return {
        icon: "tabler:chart-line",
        label: isRunning ? tr("Inspecting KPI", "جاري فحص المؤشر") : tr("KPI detail ready", "تفاصيل المؤشر جاهزة"),
        detail:
          typeof args.kpiTitle === "string" && args.kpiTitle.length > 0
            ? String(args.kpiTitle)
            : tr("Detailed KPI analysis", "تحليل مفصل للمؤشر"),
      };
    case "getPendingApprovals":
      return {
        icon: "tabler:clock-check",
        label: isRunning ? tr("Checking approvals", "جاري فحص الموافقات") : tr("Approvals queue ready", "قائمة الموافقات جاهزة"),
        detail: tr("Submission review queue", "قائمة مراجعة التقديمات"),
      };
    case "getStaleKpis":
      return {
        icon: "tabler:alert-triangle",
        label: isRunning ? tr("Checking stale KPIs", "جاري فحص المؤشرات المتأخرة") : tr("Stale KPI list ready", "قائمة المؤشرات المتأخرة جاهزة"),
        detail: tr("Missing or outdated updates", "التحديثات المفقودة أو القديمة"),
      };
    case "comparePeriods":
      return {
        icon: "tabler:chart-arrows-vertical",
        label: isRunning ? tr("Comparing periods", "جاري مقارنة الفترات") : tr("Comparison ready", "المقارنة جاهزة"),
        detail: tr("Period-over-period movement", "الحركة بين الفترات"),
      };
    case "navigateToPage":
      return {
        icon: "tabler:external-link",
        label: isRunning ? tr("Preparing navigation", "جاري تجهيز الانتقال") : tr("Navigation ready", "الانتقال جاهز"),
        detail: typeof args.page === "string" ? String(args.page) : tr("App navigation", "التنقل داخل التطبيق"),
      };
    case "getOrgUsers":
      return {
        icon: "tabler:users",
        label: isRunning ? tr("Loading team", "جاري تحميل الفريق") : tr("Team overview ready", "عرض الفريق جاهز"),
        detail: tr("Users and ownership", "المستخدمون والملكية"),
      };
    case "getEntityHierarchy":
      return {
        icon: "tabler:hierarchy-3",
        label: isRunning ? tr("Loading structure", "جاري تحميل الهيكل") : tr("Structure ready", "الهيكل جاهز"),
        detail: tr("Organization hierarchy", "الهيكل التنظيمي"),
      };
    default:
      return {
        icon: "tabler:cpu",
        label: isRunning ? tr("Running tool", "جاري تشغيل الأداة") : tr("Tool completed", "اكتملت الأداة"),
        detail: toolName,
      };
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Quick suggestions (real prompts, not mock data) ────────────────────────

const QUICK_SUGGESTIONS: QuickSuggestion[] = [
  {
    id: "health",
    icon: "tabler:chart-pie-2",
    label: "Health overview",
    labelAr: "نظرة عامة على الصحة",
    prompt: "Give me an overview of the organization's KPI health",
    promptAr: "أعطني نظرة عامة على صحة مؤشرات الأداء",
  },
  {
    id: "red-kpis",
    icon: "tabler:circle-x",
    label: "KPIs behind target",
    labelAr: "مؤشرات متأخرة",
    prompt: "Show me all KPIs that are behind target (RED status)",
    promptAr: "أرني جميع المؤشرات المتأخرة عن الهدف (حالة حمراء)",
  },
  {
    id: "approvals",
    icon: "tabler:clock-check",
    label: "Pending approvals",
    labelAr: "الموافقات المعلقة",
    prompt: "What approvals are pending?",
    promptAr: "ما هي الموافقات المعلقة؟",
  },
  {
    id: "stale",
    icon: "tabler:alert-triangle",
    label: "Stale KPIs",
    labelAr: "مؤشرات متأخرة التحديث",
    prompt: "Which KPIs haven't been updated recently?",
    promptAr: "أي مؤشرات لم يتم تحديثها مؤخراً؟",
  },
  {
    id: "trend",
    icon: "tabler:trending-up",
    label: "Performance trend",
    labelAr: "اتجاه الأداء",
    prompt: "Compare our KPI performance over the last 6 months vs last 3 months",
    promptAr: "قارن أداء مؤشراتنا خلال آخر 6 أشهر مقابل آخر 3 أشهر",
  },
  {
    id: "team",
    icon: "tabler:users",
    label: "Team & ownership",
    labelAr: "الفريق والملكية",
    prompt: "Show me the team and who owns which KPIs",
    promptAr: "أرني الفريق ومن يملك أي مؤشرات",
  },
];

// ── Tool result renderer ──────────────────────────────────────────────────────

function ToolResultCard({ toolName, result }: { toolName: string; result: unknown }) {
  const { tr, isArabic } = useLocale();
  const data = result as Record<string, unknown>;

  if (toolName === "getOrgOverview" && data.totalEntities != null) {
    const d = data as {
      totalEntities: number;
      green: number;
      amber: number;
      red: number;
      overallHealth: number;
      pendingApprovals: number;
      staleKpisCount: number;
    };
    const total = d.totalEntities;
    const greenPct = total > 0 ? (d.green / total) * 100 : 0;
    const amberPct = total > 0 ? (d.amber / total) * 100 : 0;
    const redPct = total > 0 ? (d.red / total) * 100 : 0;
    const scoreColor =
      d.overallHealth >= 80
        ? "text-emerald-600 dark:text-emerald-400"
        : d.overallHealth >= 60
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400";

    return (
      <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {tr("Organization Health", "صحة الجهة")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tr("Grounded in approved KPI data", "مبني على بيانات المؤشرات المعتمدة")}
            </p>
          </div>
          <div className="flex flex-col items-end rounded-2xl bg-background/80 px-3 py-2">
            <span className={cn("text-2xl font-bold", scoreColor)}>{d.overallHealth}%</span>
            <span className="text-[10px] text-muted-foreground">{tr("Health", "الصحة")}</span>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {[
            { label: tr("On Track", "في المسار"), value: d.green, pct: greenPct, color: "bg-emerald-500" },
            { label: tr("At Risk", "في خطر"), value: d.amber, pct: amberPct, color: "bg-amber-400" },
            { label: tr("Behind", "متأخر"), value: d.red, pct: redPct, color: "bg-red-500" },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">{row.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/80">
                <div className={cn("h-full rounded-full", row.color)} style={{ width: `${row.pct}%` }} />
              </div>
              <span className="w-6 text-right text-sm font-semibold text-foreground">{row.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MetricPill label={tr("Total", "الإجمالي")} value={String(total)} />
          <MetricPill label={tr("Pending", "معلقة")} value={String(d.pendingApprovals)} />
          <MetricPill label={tr("Stale", "متأخرة")} value={String(d.staleKpisCount)} />
        </div>
      </div>
    );
  }

  if (toolName === "navigateToPage" && data.navigate) {
    return (
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-600 dark:text-blue-400">
        <div className="flex items-center gap-2">
          <Icon name="tabler:external-link" className="h-3.5 w-3.5" />
          <span>{tr("Navigating inside the workspace", "جاري الانتقال داخل مساحة العمل")}</span>
        </div>
      </div>
    );
  }

  if (toolName === "getKpiList" && Array.isArray(result)) {
    const kpis = result as Array<{
      title: string;
      titleAr?: string;
      ragStatus: string;
      achievement: number | null;
    }>;
    if (kpis.length === 0) return null;

    return (
      <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {tr("KPI List", "قائمة المؤشرات")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tr("Ranked KPI snapshot", "لقطة مرتبة للمؤشرات")}
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5 py-1">
            {kpis.length}
          </Badge>
        </div>
        <div className="space-y-2">
          {kpis.slice(0, 8).map((kpi, i) => {
            const ragColor =
              kpi.ragStatus === "green"
                ? "bg-emerald-500"
                : kpi.ragStatus === "amber"
                  ? "bg-amber-400"
                  : kpi.ragStatus === "red"
                    ? "bg-red-500"
                    : "bg-muted-foreground/40";

            return (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-background/70 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", ragColor)} />
                  <span className="truncate text-sm text-foreground">
                    {isArabic && kpi.titleAr ? kpi.titleAr : kpi.title}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-semibold text-foreground">
                  {kpi.achievement != null ? `${kpi.achievement}%` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (toolName === "getPendingApprovals" && Array.isArray(data.items)) {
    const items = data.items as Array<{
      kpiTitle: string;
      kpiTitleAr?: string;
      submittedBy: string;
      achievement: number | null;
    }>;
    if (items.length === 0) return null;

    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
              {tr("Pending Approvals", "الموافقات المعلقة")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tr("Awaiting review", "بانتظار المراجعة")}
            </p>
          </div>
          <Badge className="rounded-full bg-amber-500 px-2.5 py-1 text-white">
            {String(data.totalPending ?? items.length)}
          </Badge>
        </div>
        <div className="space-y-2">
          {items.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-background/70 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">
                  {isArabic && item.kpiTitleAr ? item.kpiTitleAr : item.kpiTitle}
                </p>
                <p className="truncate text-xs text-muted-foreground">{item.submittedBy}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-foreground">
                {item.achievement != null ? `${item.achievement}%` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (toolName === "comparePeriods" && data.highlights) {
    const highlights = Array.isArray(data.highlights)
      ? (data.highlights as Array<{ name: string; changepp: number; direction: string }>)
      : [];

    return (
      <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {tr("Period Comparison", "مقارنة الفترات")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tr("Movement across periods", "الحركة عبر الفترات")}
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <MetricChip tone="emerald" value={`${String(data.improved ?? 0)} ↑`} />
            <MetricChip tone="red" value={`${String(data.declined ?? 0)} ↓`} />
          </div>
        </div>
        <div className="space-y-2">
          {highlights.slice(0, 6).map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-background/70 px-3 py-2">
              <span className="truncate text-sm text-foreground">{item.name}</span>
              <span
                className={cn(
                  "shrink-0 text-sm font-semibold",
                  item.changepp >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                )}
              >
                {item.changepp > 0 ? "+" : ""}
                {item.changepp}pp
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (toolName === "getStaleKpis" && Array.isArray(data.kpis)) {
    const items = data.kpis as Array<{ title: string; titleAr?: string; daysSinceUpdate: number | null; hasNoValues: boolean }>;
    if (items.length === 0) return null;

    return (
      <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-4 shadow-sm">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700 dark:text-red-300">
            {tr("Stale KPIs", "المؤشرات المتأخرة")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr("Needs data refresh", "بحاجة إلى تحديث البيانات")}
          </p>
        </div>
        <div className="space-y-2">
          {items.slice(0, 6).map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-background/70 px-3 py-2">
              <span className="truncate text-sm text-foreground">
                {isArabic && item.titleAr ? item.titleAr : item.title}
              </span>
              <span className="shrink-0 text-xs font-semibold text-red-600 dark:text-red-400">
                {item.hasNoValues ? tr("No data", "لا توجد بيانات") : `${item.daysSinceUpdate ?? 0}d`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background/75 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MetricChip({ tone, value }: { tone: "emerald" | "red"; value: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 font-semibold",
        tone === "emerald"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "bg-red-500/10 text-red-700 dark:text-red-300",
      )}
    >
      {value}
    </span>
  );
}

function ToolStatusRow({
  toolName,
  args,
  status,
  result,
}: ToolCallMessagePartProps) {
  const { tr } = useLocale();
  const isRunning = getToolStatusType(status) === "running";
  const [duration, setDuration] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning && startRef.current === null) {
      startRef.current = Date.now();
    }
    if (!isRunning && startRef.current !== null) {
      setDuration(Date.now() - startRef.current);
    }
  }, [isRunning]);

  const display = getToolDisplay(toolName, (args ?? {}) as Record<string, unknown>, isRunning, tr);
  const hasRichResult = Boolean(result) && (
    toolName === "getOrgOverview" ||
    toolName === "getKpiList" ||
    toolName === "getPendingApprovals" ||
    toolName === "comparePeriods" ||
    toolName === "getStaleKpis" ||
    toolName === "navigateToPage"
  );

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground",
          isRunning && "animate-pulse",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background/80">
          {isRunning ? (
            <Icon name="tabler:loader-2" className="h-4 w-4 animate-spin" />
          ) : (
            <Icon name={display.icon} className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{display.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">{display.detail}</p>
        </div>
        <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
          {isRunning ? tr("Running", "قيد التشغيل") : tr("Done", "تم")}
        </Badge>
        {!isRunning && duration !== null ? (
          <span className="shrink-0 text-[10px] text-muted-foreground/80">{formatDuration(duration)}</span>
        ) : null}
      </div>
      {!isRunning && hasRichResult ? (
        <ToolResultCard toolName={toolName} result={result} />
      ) : null}
    </div>
  );
}

function MarkdownMessagePart() {
  const { isArabic } = useLocale();
  const part = useMessagePartText();
  return <AiMarkdown content={part.text ?? ""} dir={isArabic ? "rtl" : "ltr"} />;
}

function ReasoningPart() {
  const { tr, isArabic } = useLocale();
  const part = useMessagePartReasoning();
  const active = part.status?.type === "running";
  const hasText = (part.text?.length ?? 0) > 0;
  const [open, setOpen] = useState(false);
  const wasActiveRef = useRef(false);

  // Auto-open when running starts, auto-close when reasoning finishes
  useEffect(() => {
    if (active) {
      setOpen(true);
      wasActiveRef.current = true;
    } else if (wasActiveRef.current && !active) {
      // Reasoning just finished - auto close
      setOpen(false);
      wasActiveRef.current = false;
    }
  }, [active]);

  // Don't show if there's no reasoning text and not running
  if (!hasText && !active) return null;

  return (
    <div className="mb-2 rounded-lg border border-border/50 bg-muted/20 opacity-80 transition-opacity hover:opacity-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left"
      >
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
            active ? "bg-primary/20 text-primary" : "bg-muted-foreground/10 text-muted-foreground"
          )}>
            {active ? (
              <Icon name="tabler:loader-2" className="h-3 w-3 animate-spin" />
            ) : (
              <Icon name="tabler:check" className="h-3 w-3" />
            )}
          </span>
          <span className={cn(
            "text-xs font-medium",
            active ? "text-foreground" : "text-muted-foreground"
          )}>
            {active ? tr("Thinking...", "جاري التفكير...") : tr("Reasoning done", "اكتمل التفكير")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {active && (
            <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          )}
          <Icon
            name={open ? "tabler:chevron-up" : "tabler:chevron-down"}
            className="h-3.5 w-3.5 text-muted-foreground"
          />
        </div>
      </button>
      {open && hasText ? (
        <div className="border-t border-border/40 px-2.5 py-2">
          <div className="max-h-40 overflow-y-auto text-muted-foreground/80">
            <AiMarkdown
              content={part.text ?? ""}
              dir={isArabic ? "rtl" : "ltr"}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ThinkingPart({ status }: { status: { type: string } }) {
  const { tr } = useLocale();
  if (status.type !== "running") return null;

  return (
    <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-primary">
      <Icon name="tabler:loader-2" className="h-4 w-4 animate-spin" />
      <span className="text-sm font-medium">{tr("Thinking...", "جاري التفكير...")}</span>
    </div>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end py-2" data-role="user">
      <div className="max-w-[90%] rounded-[22px] rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm">
        <MessagePrimitive.Parts components={{ Text: MarkdownMessagePart }} />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="py-2" data-role="assistant">
      <div className="flex gap-3">
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="tabler:sparkles" className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <MessagePrimitive.Parts
            components={{
              Empty: ThinkingPart,
              Text: MarkdownMessagePart,
              Reasoning: ReasoningPart,
              tools: {
                Fallback: ToolStatusRow,
              },
            }}
          />
          <MessagePrimitive.Error>
            <ErrorPrimitive.Root className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <ErrorPrimitive.Message className="line-clamp-3" />
            </ErrorPrimitive.Root>
          </MessagePrimitive.Error>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

function AiAssistantComposer() {
  const { t, tr } = useLocale();

  return (
    <ComposerPrimitive.Root className="px-4 pb-4 pt-3">
      <div className="rounded-3xl border border-border/70 bg-background/90 p-2 shadow-lg shadow-black/5">
        <ComposerPrimitive.Input asChild>
          <textarea
            placeholder={t("aiAskPlaceholder")}
            className="max-h-40 min-h-[52px] w-full resize-none bg-transparent px-2.5 pt-2 text-sm leading-6 placeholder:text-muted-foreground focus:outline-none"
            rows={1}
          />
        </ComposerPrimitive.Input>
        <div className="mt-2 flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
              {tr("Grounded", "مستند للبيانات")}
            </Badge>
            <span>{t("aiDataAsOf")}</span>
          </div>
          <div className="flex items-center gap-2">
            <AuiIf condition={({ thread }) => !thread.isRunning}>
              <ComposerPrimitive.Send asChild>
                <Button type="submit" size="icon" className="h-10 w-10 rounded-2xl">
                  <Icon name="tabler:arrow-up" className="h-4 w-4" />
                </Button>
              </ComposerPrimitive.Send>
            </AuiIf>
            <AuiIf condition={({ thread }) => thread.isRunning}>
              <ComposerPrimitive.Cancel asChild>
                <Button type="button" variant="secondary" size="icon" className="h-10 w-10 rounded-2xl">
                  <Icon name="tabler:square-filled" className="h-3.5 w-3.5" />
                </Button>
              </ComposerPrimitive.Cancel>
            </AuiIf>
          </div>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

function AiWelcomeState({
  onPrompt,
}: {
  onPrompt: (prompt: string) => void;
}) {
  const { t, tr, isArabic } = useLocale();

  return (
    <div className="flex flex-1 flex-col justify-center px-4 py-8">
      <div className="rounded-[28px] border border-border/70 bg-card/60 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon name="tabler:sparkles" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{t("aiAssistant")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("aiWelcomeMessage")}</p>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="grid grid-cols-2 gap-2">
          {QUICK_SUGGESTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPrompt(isArabic ? item.promptAr : item.prompt)}
              className="rounded-2xl border border-border/70 bg-background/70 p-3 text-left transition hover:border-primary/30 hover:bg-background"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon name={item.icon} className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {isArabic ? item.labelAr : item.label}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {tr("Ask instantly", "اسأل مباشرة")}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReadOnlyNotice() {
  const { t, tr } = useLocale();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="sticky top-0 z-10 py-3">
      <div className="flex items-start justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        <span className="flex-1">{t("aiReadOnly")}</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-0.5 hover:bg-amber-500/20"
          title={tr("Dismiss", "إغلاق")}
        >
          <Icon name="tabler:x" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AiPanelBody({
  open,
  onToggle,
  status,
  messageCount,
  onClear,
  onPrompt,
}: {
  open: boolean;
  onToggle: () => void;
  status: string;
  messageCount: number;
  onClear: () => void;
  onPrompt: (prompt: string) => void;
}) {
  const { t, tr } = useLocale();
  const running = status === "streaming" || status === "submitted";

  return (
    <div className="flex h-full min-h-0 flex-col bg-background/80 backdrop-blur-xl">
      {/* Header */}
      <div className="shrink-0 border-b border-border/70 bg-background/90 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Icon name="tabler:message-chatbot" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{t("aiAssistant")}</p>
                <p className="text-xs text-muted-foreground">
                  {running ? tr("Thinking and using tools", "يفكر ويستخدم الأدوات") : tr("Grounded workspace copilot", "مساعد عمل مستند للبيانات")}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                {running ? tr("Live", "مباشر") : tr("Ready", "جاهز")}
              </Badge>
              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                {tr("Read-only", "للقراءة فقط")}
              </Badge>
              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                {messageCount} {tr("messages", "رسائل")}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messageCount > 0 ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl"
                onClick={onClear}
                title={tr("Clear chat", "مسح المحادثة")}
              >
                <Icon name="tabler:trash" className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={onToggle}
              title={tr("Close assistant", "إغلاق المساعد")}
            >
              <Icon name="tabler:x" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
        <ThreadPrimitive.Viewport className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
          <ReadOnlyNotice />

          {/* Welcome message when empty */}
          <AuiIf condition={({ thread }) => thread.isEmpty}>
            <AiWelcomeState onPrompt={onPrompt} />
          </AuiIf>

          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />

          <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-gradient-to-t from-background via-background to-background/60 pt-3">
            {/* Input */}
            <AiAssistantComposer />
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AiChatPanel({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const lastNavigationRef = useRef<string | null>(null);

  const chat = useChat({
    transport: useMemo(
      () => new AssistantChatTransport({ api: "/api/ai/chat", body: { locale } }),
      [locale],
    ),
  });

  const runtime = useAISDKRuntime(chat);

  useEffect(() => {
    for (const message of chat.messages) {
      if (message.role !== "assistant") continue;
      const parts = (message.parts ?? []) as AnyPart[];
      for (const part of parts) {
        if (!isToolPart(part)) continue;
        if (getToolNameFromPart(part) !== "navigateToPage") continue;
        const result = getToolOutputFromPart(part) as
          | { navigate?: boolean; path?: string }
          | undefined;
        if (!result?.navigate || !result.path) continue;
        const localizedPath = `/${locale}${result.path}`;
        if (lastNavigationRef.current === localizedPath) continue;
        lastNavigationRef.current = localizedPath;
        router.push(localizedPath);
      }
    }
  }, [chat.messages, locale, router]);

  const clearChat = () => {
    chat.setMessages([]);
    lastNavigationRef.current = null;
  };

  const prompt = (text: string) => {
    void chat.sendMessage({ text });
  };

  return (
    <>
      {/* Desktop panel - takes space in layout and stays sticky */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-l border-border/70 bg-background/95 shadow-lg backdrop-blur-xl transition-all duration-300 ease-in-out lg:flex",
          open ? "w-[400px] opacity-100" : "w-0 opacity-0 overflow-hidden"
        )}
      >
        <AssistantRuntimeProvider runtime={runtime}>
          <AiPanelBody
            open={open}
            onToggle={onToggle}
            status={chat.status}
            messageCount={chat.messages.length}
            onClear={clearChat}
            onPrompt={prompt}
          />
        </AssistantRuntimeProvider>
      </aside>

      {/* Mobile fixed panel (overlay only on mobile) */}
      {open ? (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/35 lg:hidden"
            onClick={onToggle}
          />
          <aside className="fixed inset-y-0 right-0 z-[60] w-full max-w-[400px] border-l border-border/70 bg-background shadow-2xl lg:hidden">
            <AssistantRuntimeProvider runtime={runtime}>
              <AiPanelBody
                open={open}
                onToggle={onToggle}
                status={chat.status}
                messageCount={chat.messages.length}
                onClear={clearChat}
                onPrompt={prompt}
              />
            </AssistantRuntimeProvider>
          </aside>
        </>
      ) : null}

      {/* Floating toggle button - visible when closed on desktop */}
      {!open && (
        <button
          onClick={onToggle}
          className={cn(
            "fixed z-[50] flex h-12 w-12 items-center justify-center",
            "rounded-full bg-primary text-primary-foreground shadow-lg",
            "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50",
            "transition-all duration-300 ease-in-out",
            "right-6 bottom-6 lg:right-8 lg:bottom-8"
          )}
          title="AI Assistant"
        >
          <Icon name="tabler:message-chatbot" className="h-6 w-6" />
        </button>
      )}
    </>
  );
}
