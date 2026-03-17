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

/**
 * Get comprehensive organization context for chart generation.
 * Includes: entity types, KPIs with historical data, trends, and org structure.
 */
export async function getOrgChartContextForAi(orgId: string) {
  const context: string[] = [];

  // 1. Organization structure - Entity Types
  const entityTypes = await prisma.orgEntityType.findMany({
    where: { orgId },
    select: { code: true, name: true, nameAr: true, _count: { select: { entities: true } } },
    orderBy: { name: "asc" },
  });

  context.push(`=== ENTITY TYPES ===`);
  for (const et of entityTypes) {
    const count = et._count.entities;
    const nameAr = et.nameAr ? ` (${et.nameAr})` : "";
    context.push(`- ${et.code}: ${et.name}${nameAr} (${count} items)`);
  }

  // 2. KPIs with 6-month trend data
  const kpis = await prisma.entity.findMany({
    where: {
      orgId,
      deletedAt: null,
      orgEntityType: { code: { equals: "KPI", mode: "insensitive" } },
    },
    take: 20,
    orderBy: { title: "asc" },
    include: {
      orgEntityType: { select: { name: true } },
      values: {
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          finalValue: true,
          calculatedValue: true,
          actualValue: true,
          achievementValue: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  context.push(`\n=== KPIs WITH 6-MONTH HISTORY ===`);
  for (const kpi of kpis) {
    const values = kpi.values
      .map((v) => {
        const val = v.finalValue ?? v.calculatedValue ?? v.actualValue ?? null;
        return val != null ? Number(val) : null;
      })
      .filter((v): v is number => v !== null);

    const latest = values[0];
    const oldest = values[values.length - 1];
    let trend = "stable";
    if (latest != null && oldest != null) {
      const change = ((latest - oldest) / Math.abs(oldest || 1)) * 100;
      if (change > 5) trend = "improving";
      else if (change < -5) trend = "declining";
    }

    const latestAch = kpi.values[0]?.achievementValue;
    const achStr = latestAch != null ? `, achievement=${Math.round(Number(latestAch))}%` : "";
    const trendStr = values.length > 1 ? `, trend=${trend}` : "";

    context.push(
      `- ${kpi.title}: target=${kpi.targetValue ?? "N/A"}${achStr}${trendStr}, unit=${kpi.unit ?? "N/A"}, history=[${values.slice(0, 3).join(", ")}]`
    );
  }

  // 3. Status distribution
  const statusCounts = await prisma.entity.groupBy({
    by: ["status"],
    where: { orgId, deletedAt: null },
    _count: { status: true },
  });

  context.push(`\n=== STATUS DISTRIBUTION ===`);
  for (const sc of statusCounts) {
    context.push(`- ${sc.status}: ${sc._count.status} entities`);
  }

  // 4. Recent period performance summary
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentValues = await prisma.entityValue.findMany({
    where: {
      entity: { orgId, deletedAt: null },
      createdAt: { gte: sixMonthsAgo },
    },
    select: {
      status: true,
      achievementValue: true,
    },
  });

  const approvedCount = recentValues.filter((v) => v.status === "APPROVED").length;
  const submittedCount = recentValues.filter((v) => v.status === "SUBMITTED").length;
  const avgAchievement =
    recentValues
      .filter((v) => v.achievementValue != null)
      .reduce((sum, v) => sum + Number(v.achievementValue), 0) /
    (recentValues.filter((v) => v.achievementValue != null).length || 1);

  context.push(`\n=== RECENT 6-MONTH SUMMARY ===`);
  context.push(`- Approved values: ${approvedCount}`);
  context.push(`- Pending approval: ${submittedCount}`);
  context.push(`- Average achievement: ${Math.round(avgAchievement)}%`);

  return context.join("\n");
}

/**
 * Get real data samples and counts for AI chart generation context.
 * This helps AI understand what data actually exists in the database.
 */
export async function getOrgDataContextForAiCharts(orgId: string): Promise<string> {
  const lines: string[] = [];
  
  // Entity counts by type
  const entityTypeCounts = await prisma.entity.groupBy({
    by: ["orgEntityTypeId"],
    where: { orgId, deletedAt: null },
    _count: { id: true },
  });
  
  const entityTypes = await prisma.orgEntityType.findMany({
    where: { orgId },
    select: { id: true, code: true, name: true },
  });
  
  lines.push("=== ORGANIZATION DATA OVERVIEW ===");
  lines.push("");
  lines.push("Entity Counts by Type:");
  for (const etc of entityTypeCounts) {
    const type = entityTypes.find(t => t.id === etc.orgEntityTypeId);
    lines.push(`  - ${type?.code ?? "Unknown"}: ${etc._count.id} ${type?.name ?? ""}`);
  }
  
  // Status distribution
  const statusCounts = await prisma.entity.groupBy({
    by: ["status"],
    where: { orgId, deletedAt: null },
    _count: { status: true },
  });
  
  lines.push("");
  lines.push("Entity Status Distribution:");
  for (const sc of statusCounts) {
    lines.push(`  - ${sc.status}: ${sc._count.status}`);
  }
  
  // Sample entities with values
  const sampleEntities = await prisma.entity.findMany({
    where: { orgId, deletedAt: null },
    take: 5,
    include: {
      orgEntityType: { select: { code: true } },
      values: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { finalValue: true, achievementValue: true, status: true },
      },
    },
  });
  
  lines.push("");
  lines.push("Sample Entities (first 5):");
  for (const e of sampleEntities) {
    const val = e.values[0];
    const ach = val?.achievementValue != null ? ` (achievement: ${Math.round(val.achievementValue)}%)` : "";
    lines.push(`  - [${e.orgEntityType.code}] ${e.title}: status=${e.status}, target=${e.targetValue ?? "N/A"}${ach}`);
  }
  
  // Value statistics (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const valueStats = await prisma.entityValue.aggregate({
    where: {
      entity: { orgId, deletedAt: null },
      createdAt: { gte: sixMonthsAgo },
    },
    _count: { id: true },
    _avg: { achievementValue: true },
    _max: { achievementValue: true },
    _min: { achievementValue: true },
  });
  
  lines.push("");
  lines.push("Value Statistics (Last 6 Months):");
  lines.push(`  - Total values entered: ${valueStats._count.id}`);
  lines.push(`  - Average achievement: ${valueStats._avg.achievementValue ? Math.round(valueStats._avg.achievementValue) : "N/A"}%`);
  lines.push(`  - Best achievement: ${valueStats._max.achievementValue ?? "N/A"}%`);
  lines.push(`  - Lowest achievement: ${valueStats._min.achievementValue ?? "N/A"}%`);
  
  // User count
  const userCount = await prisma.user.count({
    where: { orgId, deletedAt: null },
  });
  
  lines.push("");
  lines.push(`Organization Users: ${userCount}`);
  
  // Available entity type codes for querying
  lines.push("");
  lines.push("Available Entity Type Codes for Queries:");
  for (const et of entityTypes) {
    lines.push(`  - "${et.code}" = ${et.name}`);
  }
  
  return lines.join("\n");
}

/**
 * Get complete database schema for AI chart generation.
 * Provides table structures, relationships, and field descriptions.
 */
export function getDatabaseSchemaForAi(): string {
  return `
=== DATABASE SCHEMA FOR CHART QUERIES ===

Available Tables:
1. entities - Main KPI/entity records
2. entityTypes - Types of entities (KPI, Initiative, Project, etc.)
3. entityValues - Time-series values for entities
4. users - Organization users
5. variables - Variables used in entity formulas
6. variableValues - Variable values for each entity value

TABLE: entities
Fields:
  - id: string (UUID)
  - key: string | null (unique code like "KPI001")
  - title: string (entity name)
  - titleAr: string | null (Arabic title)
  - description: string | null
  - status: "PLANNED" | "ACTIVE" | "AT_RISK" | "COMPLETED"
  - sourceType: "MANUAL" | "CALCULATED" | "DERIVED" | "SCORE"
  - periodType: "MONTHLY" | "QUARTERLY" | "YEARLY" | null
  - unit: string | null (measurement unit)
  - direction: "INCREASE_IS_GOOD" | "DECREASE_IS_GOOD"
  - baselineValue: number | null
  - targetValue: number | null
  - minValue: number | null
  - maxValue: number | null
  - weight: number | null
  - orgEntityTypeId: string (foreign key to entityTypes)
  - ownerUserId: string | null (foreign key to users)
  - createdAt: Date
  - updatedAt: Date

TABLE: entityTypes
Fields:
  - id: string (UUID)
  - code: string (e.g., "KPI", "INITIATIVE", "PROJECT")
  - name: string
  - nameAr: string | null
  - sortOrder: number

TABLE: entityValues
Fields:
  - id: string (UUID)
  - entityId: string (foreign key to entities)
  - actualValue: number | null
  - calculatedValue: number | null
  - finalValue: number | null (preferred value to use)
  - achievementValue: number | null (percentage 0-100)
  - status: "DRAFT" | "SUBMITTED" | "APPROVED" | "LOCKED"
  - note: string | null
  - createdAt: Date (timestamp of value)
  - updatedAt: Date
  - submittedAt: Date | null
  - approvedAt: Date | null

TABLE: users
Fields:
  - id: string (UUID)
  - name: string
  - email: string
  - role: "SUPER_ADMIN" | "ADMIN" | "EXECUTIVE" | "MANAGER"
  - title: string | null (job title)
  - managerId: string | null (foreign key to users)

TABLE: variables
Fields:
  - id: string (UUID)
  - entityId: string (foreign key to entities)
  - code: string (variable name)
  - displayName: string
  - nameAr: string | null
  - dataType: "NUMBER" | "PERCENTAGE"
  - isRequired: boolean
  - isStatic: boolean
  - staticValue: number | null

TABLE: variableValues
Fields:
  - id: string (UUID)
  - entityValueId: string (foreign key to entityValues)
  - entityVariableId: string (foreign key to variables)
  - value: number

QUERY SPECIFICATION FORMAT:
{
  "table": "entities" | "entityTypes" | "entityValues" | "users" | "variables" | "variableValues",
  "select": ["field1", "COUNT(*)", "SUM(field)", "AVG(field)", "MAX(field)", "MIN(field)"],
  "where": "status = ACTIVE AND targetValue IS NOT NULL",
  "groupBy": "status",
  "orderBy": "COUNT(*) DESC",
  "limit": 10
}

COMMON QUERY PATTERNS:

1. Top KPIs by Achievement:
{
  "table": "entityValues",
  "select": ["entityId", "AVG(achievementValue)"],
  "groupBy": "entityId",
  "orderBy": "AVG(achievementValue) DESC",
  "limit": 5
}

2. Status Distribution:
{
  "table": "entities",
  "select": ["status", "COUNT(*)"],
  "groupBy": "status"
}

3. Entity Type Breakdown:
{
  "table": "entityTypes",
  "select": ["code", "COUNT(*)"],
  "groupBy": "code"
}

NOTES:
- Use "finalValue" from entityValues as the primary value field
- "achievementValue" is already a percentage (0-100)
- Join operations are handled automatically through the provided helper functions
- For time-series data, use entityValues.createdAt for sorting
- Entity status and value status are different fields
`;
}

