import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getSmartModel } from "@/lib/ai/client";
import { requireOrgMember } from "@/lib/server-action-auth";
import { isAiFeatureEnabled, aiDisabledResponse } from "../_mock-stream";
import { prisma } from "@/lib/prisma";
import type { EChartsOption } from "echarts";

// Get database schema as string
const getSchema = () => `
DATABASE SCHEMA:

entities:
  - id: string (UUID)
  - key: string | null (unique code like "M001")
  - title: string (entity name)
  - titleAr: string | null (Arabic title)
  - status: "PLANNED" | "ACTIVE" | "AT_RISK" | "COMPLETED"
  - sourceType: "MANUAL" | "CALCULATED" | "DERIVED" | "SCORE"
  - periodType: "MONTHLY" | "QUARTERLY" | "YEARLY"
  - unit: string | null (measurement unit)
  - direction: "INCREASE_IS_GOOD" | "DECREASE_IS_GOOD"
  - baselineValue, targetValue, minValue, maxValue, weight: number | null
  - orgEntityTypeId: string (links to entityTypes)
  - createdAt: Date

entityValues:
  - id: string (UUID)
  - entityId: string (links to entities)
  - actualValue, calculatedValue, finalValue, achievementValue: number | null
  - achievementValue is percentage 0-100
  - status: "DRAFT" | "SUBMITTED" | "APPROVED" | "LOCKED"
  - note: string | null
  - createdAt: Date (when value was recorded)

entityTypes:
  - id: string (UUID)
  - code: string (e.g., "METRIC", "INITIATIVE", "PROJECT")
  - name: string

EXAMPLE QUERIES:
- Top entities: { table: "entityValues", entityTypeCode: "METRIC", orderBy: { field: "achievementValue", direction: "desc" }, limit: 10 }
- Status breakdown: { table: "entities", where: { status: "ACTIVE" }, limit: 50 }
- Trend: { table: "entityValues", entityTypeCode: "METRIC", orderBy: { field: "createdAt", direction: "asc" }, limit: 100 }

NOTE: Use "entityTypeCode" (e.g., "METRIC", "INITIATIVE") to filter by type, NOT relation paths like "entityTypes.code"`;;

// Execute query based on AI request
async function executeQuery(orgId: string, query: {
  table: "entities" | "entityValues" | "entityTypes";
  where?: Record<string, unknown>;
  entityTypeCode?: string;
  orderBy?: { field: string; direction: "asc" | "desc" };
  limit?: number;
}) {
  const take = Math.min(query.limit ?? 50, 100);

  // Handle entity type code filtering
  let entityTypeId: string | undefined;
  if (query.entityTypeCode) {
    const type = await prisma.orgEntityType.findFirst({
      where: { orgId, code: query.entityTypeCode },
      select: { id: true },
    });
    entityTypeId = type?.id;
  }

  if (query.table === "entities") {
    const where: Record<string, unknown> = { orgId, deletedAt: null };
    if (query.where?.status) where.status = query.where.status;
    if (entityTypeId) where.orgEntityTypeId = entityTypeId;

    return prisma.entity.findMany({
      where,
      take,
      orderBy: query.orderBy ? { [query.orderBy.field]: query.orderBy.direction } : { title: "asc" },
      select: { id: true, key: true, title: true, status: true, targetValue: true, unit: true },
    });
  }

  if (query.table === "entityValues") {
    const since = new Date();
    since.setMonth(since.getMonth() - 6);
    
    const where: Record<string, unknown> = {
      entity: { orgId, deletedAt: null },
      createdAt: { gte: since },
    };
    
    if (entityTypeId) {
      where.entity = { orgId, deletedAt: null, orgEntityTypeId: entityTypeId };
    }
    if (query.where?.status) where.status = query.where.status;
    if (query.where?.achievementValue) where.achievementValue = query.where.achievementValue;

    return prisma.entityValue.findMany({
      where,
      take,
      orderBy: query.orderBy ? { [query.orderBy.field]: query.orderBy.direction } : { createdAt: "desc" },
      select: {
        id: true, entityId: true, finalValue: true, achievementValue: true,
        createdAt: true, entity: { select: { title: true } },
      },
    });
  }

  if (query.table === "entityTypes") {
    return prisma.orgEntityType.findMany({
      where: { orgId },
      select: { id: true, code: true, name: true },
    });
  }

  return [];
}

export async function POST(req: NextRequest) {
  if (!(await isAiFeatureEnabled())) return aiDisabledResponse();

  const { prompt } = (await req.json()) as { prompt: string };
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  let orgId: string;
  try {
    const session = await requireOrgMember();
    orgId = session.user.orgId;
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const schema = getSchema();

  try {
    // Step 1: AI analyzes request with schema and plans query
    const { object: plan } = await generateObject({
      model: getSmartModel(),
      system: `You are a chart generator. Given the database schema and user request, plan your data query.

${schema}

Determine what data you need and construct a query.`,
      prompt,
      schema: z.object({
        analysis: z.string().describe("Brief analysis of what data is needed"),
        query: z.object({
          table: z.enum(["entities", "entityValues", "entityTypes"]),
          entityTypeCode: z.string().optional().describe("Filter by entity type code like METRIC, INITIATIVE, PROJECT"),
          where: z.record(z.string(), z.any()).optional().describe("Filter conditions (status, etc)"),
          orderBy: z.object({ field: z.string(), direction: z.enum(["asc", "desc"]) }).optional(),
          limit: z.number().default(50),
        }),
      }),
    });

    // Step 2: Execute the query
    const data = await executeQuery(orgId, plan.query);

    // Step 3: Generate chart with real data
    const { object: chart } = await generateObject({
      model: getSmartModel(),
      system: `Generate an ECharts configuration using the real data provided.

Colors: #60a5fa (blue), #34d399 (green), #a78bfa (purple), #fb7185 (red), #fbbf24 (yellow)

Create a complete, valid ECharts option object.`,
      prompt: `Chart request: ${prompt}

Data fetched (${data.length} rows):
${JSON.stringify(data.slice(0, 20), null, 2)}

Generate ECharts option using this REAL data.`,
      schema: z.object({
        title: z.string(),
        chartType: z.enum(["bar", "line", "pie", "radar", "scatter"]),
        description: z.string().optional(),
        option: z.record(z.string(), z.any()),
      }),
    });

    return NextResponse.json({
      title: chart.title,
      chartType: chart.chartType,
      description: chart.description ?? `Based on ${data.length} data points`,
      option: chart.option as EChartsOption,
    });
  } catch (e) {
    console.error("Chart error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
