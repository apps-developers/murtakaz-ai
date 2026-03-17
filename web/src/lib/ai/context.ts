import { prisma } from "@/lib/prisma";

/**
 * Build a concise KPI context string for AI prompts.
 * Includes: entity title, type, formula, variables, recent values, and formula dependencies.
 */
export async function getEntityContextForAi(entityId: string) {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: {
      orgEntityType: { select: { name: true, nameAr: true, code: true } },
      variables: {
        select: {
          code: true,
          displayName: true,
          nameAr: true,
          dataType: true,
          isStatic: true,
          staticValue: true,
        },
      },
      values: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          actualValue: true,
          calculatedValue: true,
          finalValue: true,
          achievementValue: true,
          status: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });

  if (!entity) return null;

  const lines: string[] = [];

  // Basic info
  lines.push(`Entity: ${entity.title}${entity.titleAr ? ` (${entity.titleAr})` : ""}`);
  lines.push(`Type: ${entity.orgEntityType.name} (${entity.orgEntityType.code})`);
  if (entity.key) lines.push(`Key: ${entity.key}`);
  if (entity.description) lines.push(`Description: ${entity.description}`);
  if (entity.unit) lines.push(`Unit: ${entity.unit}`);
  if (entity.targetValue != null) lines.push(`Target: ${entity.targetValue}`);
  if (entity.baselineValue != null) lines.push(`Baseline: ${entity.baselineValue}`);
  if (entity.direction) lines.push(`Direction: ${entity.direction}`);
  if (entity.status) lines.push(`Status: ${entity.status}`);
  if (entity.formula) lines.push(`Formula: ${entity.formula}`);

  // Formula dependencies (entities referenced in the formula via get("KEY"))
  if (entity.formula) {
    const keys = extractGetKeys(entity.formula);
    if (keys.length > 0) {
      const deps = await prisma.entity.findMany({
        where: {
          orgId: entity.orgId,
          deletedAt: null,
          key: { in: keys, mode: "insensitive" },
        },
        select: { key: true, title: true, orgEntityType: { select: { code: true, name: true } } },
      });
      if (deps.length > 0) {
        lines.push(`\nFormula dependencies:`);
        for (const d of deps) {
          lines.push(`  - [${d.orgEntityType.code}] ${d.key}: ${d.title}`);
        }
      }
    }
  }

  // Variables
  if (entity.variables.length > 0) {
    lines.push(`\nVariables:`);
    for (const v of entity.variables) {
      const staticNote = v.isStatic ? ` (static=${v.staticValue})` : "";
      lines.push(`  - ${v.code}: ${v.displayName} [${v.dataType}]${staticNote}`);
    }
  }

  // Recent values
  if (entity.values.length > 0) {
    lines.push(`\nRecent values (newest first):`);
    for (const v of entity.values) {
      const val = v.finalValue ?? v.calculatedValue ?? v.actualValue ?? "N/A";
      const ach = v.achievementValue != null ? ` (${Math.round(Number(v.achievementValue))}% achievement)` : "";
      lines.push(`  - ${v.createdAt.toISOString().slice(0, 10)}: ${val}${ach} [${v.status}]`);
    }
  }

  return lines.join("\n");
}

function extractGetKeys(formula: string): string[] {
  const keys: string[] = [];
  const re = /get\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of formula.matchAll(re)) {
    const key = String(match[1] ?? "").toUpperCase().trim();
    if (key) keys.push(key);
  }
  return Array.from(new Set(keys));
}

/**
 * Get a lightweight summary of org KPIs for AI context.
 */
export async function getOrgKpiSummaryForAi(orgId: string, take = 15) {
  const kpis = await prisma.entity.findMany({
    where: {
      orgId,
      deletedAt: null,
      orgEntityType: { code: { equals: "KPI", mode: "insensitive" } },
    },
    take,
    orderBy: { title: "asc" },
    include: {
      values: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { finalValue: true, calculatedValue: true, actualValue: true, achievementValue: true },
      },
    },
  });

  const lines = kpis.map((k) => {
    const v = k.values[0];
    const val = v ? (v.finalValue ?? v.calculatedValue ?? v.actualValue ?? "N/A") : "N/A";
    const ach = v?.achievementValue != null ? `${Math.round(Number(v.achievementValue))}%` : "N/A";
    return `- ${k.title}: value=${val}, target=${k.targetValue ?? "N/A"}, achievement=${ach}`;
  });

  return `Organization KPI snapshot (${kpis.length} KPIs):\n${lines.join("\n")}`;
}
