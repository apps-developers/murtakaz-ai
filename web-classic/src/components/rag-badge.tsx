"use client";

import { Badge } from "@/components/ui/badge";
import type { Health, Status } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";

const healthStyles: Record<Health, string> = {
  GREEN: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  AMBER: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
  RED: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25",
};

const healthIcons: Record<Health, React.ReactNode> = {
  GREEN: <CheckCircle2 className="h-3.5 w-3.5 mr-1" />,
  AMBER: <AlertTriangle className="h-3.5 w-3.5 mr-1" />,
  RED: <AlertCircle className="h-3.5 w-3.5 mr-1" />,
};

export function RagBadge({ health, className, label: labelOverride }: { health: Health; className?: string; label?: string }) {
  const { t } = useLocale();
  const label = labelOverride ?? (health === "GREEN" ? t("onTrack") : health === "AMBER" ? t("atRisk") : t("offTrack"));
  return (
    <Badge variant="outline" className={cn("border px-2.5 py-1 text-xs font-semibold inline-flex items-center", healthStyles[health], className)}>
      {healthIcons[health]}
      {label}
    </Badge>
  );
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const { t } = useLocale();
  const label = status === "PLANNED" ? t("planned") : status === "ACTIVE" ? t("active") : status === "AT_RISK" ? t("atRisk") : t("completed");
  return (
    <Badge variant="outline" className={cn("border border-border bg-card/50 text-xs text-foreground", className)}>
      {label}
    </Badge>
  );
}

export function ApprovalBadge({
  status,
  className,
}: {
  status: "PENDING" | "APPROVED" | "REJECTED";
  className?: string;
}) {
  const { t } = useLocale();
  const styles =
    status === "PENDING"
      ? "border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-400"
      : status === "APPROVED"
        ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        : "border-rose-500/25 bg-rose-500/15 text-rose-700 dark:text-rose-400";

  return (
    <Badge variant="outline" className={cn("border px-2.5 py-1 text-xs font-semibold", styles, className)}>
      {status === "PENDING" ? t("pending") : status === "APPROVED" ? t("approved") : t("rejected")}
    </Badge>
  );
}
