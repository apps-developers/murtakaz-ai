"use client";

import { useTheme } from "@/providers/theme-provider";

type MiniSparklineProps = {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
};

export function MiniSparkline({ points, width = 64, height = 24, color, className }: MiniSparklineProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const pad = 2;
  const usableW = width - pad * 2;
  const usableH = height - pad * 2;

  const coords = points.map((v, i) => ({
    x: pad + (i / (points.length - 1)) * usableW,
    y: pad + usableH - ((v - min) / range) * usableH,
  }));

  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  const trend = points[points.length - 1] - points[0];
  const strokeColor = color ?? (trend >= 0
    ? (isDark ? "#34d399" : "#10b981")
    : (isDark ? "#fb7185" : "#ef4444"));

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={coords[coords.length - 1].x}
        cy={coords[coords.length - 1].y}
        r={2}
        fill={strokeColor}
      />
    </svg>
  );
}
