export type RagColor = "GREEN" | "AMBER" | "RED";

export interface RagThresholds {
  green: number;
  amber: number;
}

export const DEFAULT_RAG_THRESHOLDS: RagThresholds = {
  green: 75,
  amber: 50,
};

export function getRagColor(
  value: number,
  thresholds: RagThresholds = DEFAULT_RAG_THRESHOLDS,
): RagColor {
  if (value >= thresholds.green) return "GREEN";
  if (value >= thresholds.amber) return "AMBER";
  return "RED";
}

export function ragColorToTailwind(color: RagColor): string {
  switch (color) {
    case "GREEN":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    case "AMBER":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    case "RED":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
  }
}

export function statusColorForAchievement(
  value: number,
  thresholds: RagThresholds = DEFAULT_RAG_THRESHOLDS,
): string {
  return ragColorToTailwind(getRagColor(value, thresholds));
}
