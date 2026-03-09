"use client";

import { useLocale } from "@/providers/locale-provider";
import { useTheme } from "@/providers/theme-provider";

type KpiLineCardProps = {
  value: number | null | undefined;
  target: number | null | undefined;
  unit?: string | null;
};

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Number.isInteger(n) ? `${n}` : `${n.toFixed(2)}`;
}

export function KpiLineCard({ value, target, unit }: KpiLineCardProps) {
  const { t } = useLocale();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const hasValue = typeof value === "number" && Number.isFinite(value);
  const safeValue = hasValue ? value : 0;
  const isPercentUnit = typeof unit === "string" && (unit.includes("%") || unit.includes("٪"));
  const effectiveTarget =
    typeof target === "number" && Number.isFinite(target) && target > 0
      ? target
      : isPercentUnit
        ? 100
        : null;

  const ratio =
    effectiveTarget && hasValue
      ? Math.min(Math.max(safeValue / effectiveTarget, 0), 1)
      : null;

  const red = 0.6;
  const amber = 0.9;

  const statusColor =
    !hasValue || ratio === null
      ? "#60a5fa"
      : ratio >= amber
        ? "#10b981"
        : ratio >= red
          ? "#f59e0b"
          : "#ef4444";

  const statusLabel =
    !hasValue || ratio === null
      ? "—"
      : ratio >= amber
        ? t("onTrack")
        : ratio >= red
          ? t("atRisk")
          : effectiveTarget
            ? t("offTrack")
            : "—";

  const pct = ratio !== null ? Math.round(ratio * 100) : null;

  const trackBg = isDark ? "rgba(148,163,184,0.14)" : "rgba(15,23,42,0.08)";

  return (
    <div className="flex flex-col gap-3 py-4 px-1">
      {/* Value row */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-extrabold tabular-nums leading-none">
            {hasValue ? fmt(safeValue) : "—"}
          </span>
          {unit && (
            <span className="text-xs font-medium text-muted-foreground">{unit}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ background: statusColor }}
          />
          <span className="text-xs text-muted-foreground">{statusLabel}</span>
          {pct !== null && (
            <span className="text-xs font-semibold tabular-nums" style={{ color: statusColor }}>
              {pct}%
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="relative h-3 w-full overflow-hidden rounded-full"
        style={{ background: trackBg }}
      >
        <div
          className="absolute inset-y-0 start-0 rounded-full"
          style={{
            width: `${(ratio ?? 0) * 100}%`,
            background: statusColor,
            transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>

      {/* Target */}
      {effectiveTarget && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>0{unit ? ` ${unit}` : ""}</span>
          <span>
            {t("target")}: {fmt(effectiveTarget)}{unit ? ` ${unit}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
