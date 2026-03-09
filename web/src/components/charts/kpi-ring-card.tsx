"use client";

import { useLocale } from "@/providers/locale-provider";
import { useTheme } from "@/providers/theme-provider";

type KpiRingCardProps = {
  value: number | null | undefined;
  target: number | null | undefined;
  unit?: string | null;
  size?: number;
};

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`;
}

export function KpiRingCard({ value, target, unit, size = 96 }: KpiRingCardProps) {
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

  // SVG ring geometry
  const r = (size - 10) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const fill = ratio !== null ? circumference * ratio : 0;
  const dash = `${fill} ${circumference - fill}`;

  const trackColor = isDark ? "rgba(148,163,184,0.14)" : "rgba(15,23,42,0.08)";
  const textStrong = isDark ? "#e5e7eb" : "#0f172a";
  const textMuted = isDark ? "rgba(226,232,240,0.60)" : "rgba(15,23,42,0.50)";

  const valueDisplay = hasValue ? `${fmt(safeValue)}${unit ? unit : ""}` : "—";
  const pctDisplay = ratio !== null ? `${Math.round(ratio * 100)}%` : null;

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {/* Ring */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block" style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={trackColor}
            strokeWidth={8}
          />
          {/* Progress arc */}
          {hasValue && (
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={statusColor}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={dash}
              strokeDashoffset={0}
              style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1)" }}
            />
          )}
        </svg>

        {/* Center number */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-0.5"
          style={{ color: textStrong }}
        >
          <span className="font-extrabold leading-none" style={{ fontSize: size * 0.22 }}>
            {hasValue ? fmt(safeValue) : "—"}
          </span>
          {unit && (
            <span className="font-medium leading-none" style={{ fontSize: size * 0.12, color: textMuted }}>
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Progress % + status */}
      <div className="flex flex-col items-center gap-0.5">
        {pctDisplay && (
          <span className="text-lg font-bold tabular-nums" style={{ color: statusColor }}>
            {pctDisplay}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ background: statusColor }}
          />
          <span className="text-xs text-muted-foreground">{statusLabel}</span>
        </div>
        {effectiveTarget && (
          <span className="text-xs text-muted-foreground">
            {t("target")} {fmt(effectiveTarget)}{unit ?? ""}
          </span>
        )}
      </div>
    </div>
  );
}
