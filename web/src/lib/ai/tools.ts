import { tool, zodSchema } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ── Helper: scope entities by role ──────────────────────────────────────────

async function scopedEntityWhere(orgId: string, userId: string, role: string) {
  const base: Record<string, unknown> = { orgId, deletedAt: null };
  if (role === "MANAGER") {
    const owned = await prisma.entity.findMany({
      where: { orgId, deletedAt: null, ownerUserId: userId },
      select: { id: true },
    });
    base.id = { in: owned.map((e) => e.id) };
  }
  return base;
}

// ── Tool factory (needs orgId/userId/role at request time) ──────────────────

export function createAgentTools(orgId: string, userId: string, role: string) {
  return {
    // ── 1. Organization Overview ───────────────────────────────────────────
    getOrgOverview: tool({
      description:
        "Get overall organization health: entity counts by RAG status, overall health score, pending approvals, stale entity count. Use this when user asks about organization health, overall performance, or dashboard summary.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const where = await scopedEntityWhere(orgId, userId, role);
        const entities = await prisma.entity.findMany({
          where,
          include: {
            orgEntityType: { select: { code: true, name: true, nameAr: true } },
            values: {
              where: { status: { in: ["APPROVED", "LOCKED"] } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { finalValue: true, achievementValue: true, createdAt: true },
            },
          },
        });

        let green = 0, amber = 0, red = 0, noData = 0;
        const staleEntities: string[] = [];
        const now = new Date();

        for (const e of entities) {
          const v = e.values[0];
          if (!v || v.achievementValue == null) { noData++; continue; }
          const ach = Number(v.achievementValue);
          if (ach >= 80) green++;
          else if (ach >= 60) amber++;
          else red++;
          const days = Math.floor((now.getTime() - v.createdAt.getTime()) / 86400000);
          if (days > 30) staleEntities.push(e.title);
        }

        const total = entities.length;
        const withData = total - noData;
        const overallHealth = withData > 0
          ? Math.round(entities.reduce((s, e) => s + Number(e.values[0]?.achievementValue ?? 0), 0) / withData)
          : 0;

        const pendingApprovals = await prisma.entityValue.count({
          where: { entity: { orgId, deletedAt: null }, status: "SUBMITTED" },
        });

        const org = await prisma.organization.findUnique({
          where: { id: orgId },
          select: { name: true, nameAr: true },
        });

        return {
          orgName: org?.name ?? "",
          orgNameAr: org?.nameAr ?? "",
          totalEntities: total,
          green,
          amber,
          red,
          noData,
          overallHealth,
          pendingApprovals,
          staleEntitiesCount: staleEntities.length,
          staleEntityNames: staleEntities.slice(0, 10),
        };
      },
    }),

    // ── 2. List Entities ──────────────────────────────────────────────────────
    getEntityList: tool({
      description:
        "List entities with optional filters. Returns title, achievement, status, target, unit for each. Use when user asks to list entities, filter by status/type, or find specific items.",
      inputSchema: zodSchema(z.object({
        statusFilter: z.enum(["all", "green", "amber", "red", "no_data"]).optional().describe("Filter by RAG status"),
        entityTypeCode: z.string().optional().describe("Filter by entity type code (e.g. 'METRIC', 'INITIATIVE')"),
        search: z.string().optional().describe("Search by title keyword"),
        limit: z.number().optional().describe("Max results (default 20)"),
      })),
      execute: async ({ statusFilter, entityTypeCode, search, limit }: { statusFilter?: string; entityTypeCode?: string; search?: string; limit?: number }) => {
        const where = await scopedEntityWhere(orgId, userId, role);
        if (entityTypeCode) {
          (where as Record<string, unknown>).orgEntityType = { code: { equals: entityTypeCode, mode: "insensitive" } };
        }
        if (search) {
          (where as Record<string, unknown>).title = { contains: search, mode: "insensitive" };
        }

        const entities = await prisma.entity.findMany({
          where,
          take: limit ?? 20,
          orderBy: { title: "asc" },
          include: {
            orgEntityType: { select: { code: true, name: true, nameAr: true } },
            values: {
              where: { status: { in: ["APPROVED", "LOCKED"] } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { finalValue: true, achievementValue: true, status: true, createdAt: true },
            },
          },
        });

        const results = entities.map((e) => {
          const v = e.values[0];
          const ach = v?.achievementValue != null ? Number(v.achievementValue) : null;
          const ragStatus = ach == null ? "no_data" : ach >= 80 ? "green" : ach >= 60 ? "amber" : "red";
          return {
            id: e.id,
            title: e.title,
            titleAr: e.titleAr,
            entityType: e.orgEntityType.code,
            entityTypeName: e.orgEntityType.name,
            status: e.status,
            ragStatus,
            achievement: ach != null ? Math.round(ach) : null,
            target: e.targetValue != null ? Number(e.targetValue) : null,
            value: v?.finalValue != null ? Number(v.finalValue) : null,
            unit: e.unit,
            direction: e.direction,
          };
        });

        if (statusFilter && statusFilter !== "all") {
          return results.filter((r) => r.ragStatus === statusFilter);
        }
        return results;
      },
    }),

    // ── 3. Entity Detail ─────────────────────────────────────────────────────
    getEntityDetail: tool({
      description:
        "Get deep detail on a specific entity: history, trend, target, formula, variables, owner. Use when user asks about a specific entity by name or ID.",
      inputSchema: zodSchema(z.object({
        entityTitle: z.string().optional().describe("Search by entity title (partial match)"),
        entityId: z.string().optional().describe("Exact entity ID"),
      })),
      execute: async ({ entityTitle, entityId }: { entityTitle?: string; entityId?: string }) => {
        const includeBlock = {
          orgEntityType: { select: { code: true, name: true } },
          ownerUser: { select: { name: true, email: true } },
          variables: { select: { code: true, displayName: true, dataType: true, isStatic: true, staticValue: true } },
          values: {
            orderBy: { createdAt: "desc" as const },
            take: 12,
            select: { finalValue: true, achievementValue: true, status: true, note: true, createdAt: true },
          },
        };

        const entity = entityId
          ? await prisma.entity.findUnique({ where: { id: entityId }, include: includeBlock })
          : entityTitle
            ? await prisma.entity.findFirst({ where: { orgId, deletedAt: null, title: { contains: entityTitle, mode: "insensitive" } }, include: includeBlock })
            : null;

        if (!entity) return { found: false, message: "Entity not found" };

        const values = entity.values.map((v) => ({
          date: v.createdAt.toISOString().slice(0, 10),
          value: v.finalValue != null ? Number(v.finalValue) : null,
          achievement: v.achievementValue != null ? Math.round(Number(v.achievementValue)) : null,
          status: v.status,
          note: v.note,
        }));

        const achValues = values.filter((v) => v.achievement != null).map((v) => v.achievement!);
        const trend = achValues.length >= 2
          ? achValues[0]! > achValues[achValues.length - 1]! ? "improving" : achValues[0]! < achValues[achValues.length - 1]! ? "declining" : "stable"
          : "insufficient_data";

        return {
          found: true,
          id: entity.id,
          title: entity.title,
          titleAr: entity.titleAr,
          description: entity.description,
          entityType: entity.orgEntityType.code,
          status: entity.status,
          target: entity.targetValue != null ? Number(entity.targetValue) : null,
          baseline: entity.baselineValue != null ? Number(entity.baselineValue) : null,
          unit: entity.unit,
          direction: entity.direction,
          formula: entity.formula,
          owner: entity.ownerUser?.name ?? null,
          ownerEmail: entity.ownerUser?.email ?? null,
          variables: entity.variables,
          trend,
          values,
        };
      },
    }),

    // ── 4. Stale Entities ─────────────────────────────────────────────────────
    getStaleEntities: tool({
      description:
        "Get entities that haven't been updated in 30+ days. Use when user asks about overdue, stale, or missing data items.",
      inputSchema: zodSchema(z.object({
        daysThreshold: z.number().optional().describe("Days without update to consider stale (default 30)"),
      })),
      execute: async ({ daysThreshold }: { daysThreshold?: number }) => {
        const threshold = daysThreshold ?? 30;
        const where = await scopedEntityWhere(orgId, userId, role);
        const entities = await prisma.entity.findMany({
          where,
          include: {
            orgEntityType: { select: { code: true } },
            ownerUser: { select: { name: true } },
            values: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true },
            },
          },
        });

        const now = new Date();
        const stale = entities
          .map((e) => {
            const lastDate = e.values[0]?.createdAt;
            const days = lastDate ? Math.floor((now.getTime() - lastDate.getTime()) / 86400000) : null;
            return {
              id: e.id,
              title: e.title,
              titleAr: e.titleAr,
              entityType: e.orgEntityType.code,
              owner: e.ownerUser?.name ?? null,
              daysSinceUpdate: days,
              hasNoValues: e.values.length === 0,
            };
          })
          .filter((e) => e.hasNoValues || (e.daysSinceUpdate != null && e.daysSinceUpdate > threshold))
          .sort((a, b) => (b.daysSinceUpdate ?? 999) - (a.daysSinceUpdate ?? 999));

        return { threshold, staleCount: stale.length, entities: stale.slice(0, 20) };
      },
    }),

    // ── 5. Pending Approvals ──────────────────────────────────────────────
    getPendingApprovals: tool({
      description:
        "Get pending value submissions awaiting approval. Shows who submitted what and the value details. Use when user asks about approvals, submissions, or review queue.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const pendingValues = await prisma.entityValue.findMany({
          where: { entity: { orgId, deletedAt: null }, status: "SUBMITTED" },
          take: 20,
          orderBy: { submittedAt: "desc" },
          include: {
            entity: {
              select: { title: true, titleAr: true, targetValue: true, unit: true, orgEntityType: { select: { code: true } } },
            },
            submittedByUser: { select: { name: true } },
          },
        });

        return {
          totalPending: pendingValues.length,
          items: pendingValues.map((v) => ({
            id: v.id,
            entityId: v.entityId,
            entityTitle: v.entity.title,
            entityTitleAr: v.entity.titleAr,
            entityType: v.entity.orgEntityType.code,
            submittedBy: v.submittedByUser?.name ?? "Unknown",
            value: v.finalValue != null ? Number(v.finalValue) : v.actualValue != null ? Number(v.actualValue) : null,
            target: v.entity.targetValue != null ? Number(v.entity.targetValue) : null,
            unit: v.entity.unit,
            achievement: v.achievementValue != null ? Math.round(Number(v.achievementValue)) : null,
            note: v.note,
            submittedAt: v.submittedAt?.toISOString().slice(0, 10) ?? null,
          })),
        };
      },
    }),

    // ── 6. Entity Hierarchy ───────────────────────────────────────────────
    getEntityHierarchy: tool({
      description:
        "Get the organization's entity type hierarchy with counts. Shows pillars, objectives, metrics, initiatives etc. Use when user asks about org structure, entity types, or hierarchy.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const entityTypes = await prisma.orgEntityType.findMany({
          where: { orgId },
          orderBy: { sortOrder: "asc" },
          include: {
            _count: { select: { entities: { where: { deletedAt: null } } } },
          },
        });

        return entityTypes.map((et) => ({
          code: et.code,
          name: et.name,
          nameAr: et.nameAr,
          count: et._count.entities,
          sortOrder: et.sortOrder,
        }));
      },
    }),

    // ── 7. Navigate to Page ───────────────────────────────────────────────
    navigateToPage: tool({
      description:
        "Navigate user to a specific page in the application. Use when user asks to go to a page, view an entity, open approvals, etc. Returns a navigation instruction the frontend will handle.",
      inputSchema: zodSchema(z.object({
        page: z.enum([
          "overview",
          "dashboards",
          "reports",
          "approvals",
          "organization",
          "users",
          "entity_detail",
          "entity_list",
          "entity_new",
          "profile",
        ]).describe("Target page type"),
        entityTypeCode: z.string().optional().describe("Entity type code for entity pages (e.g. 'METRIC')"),
        entityId: z.string().optional().describe("Specific entity ID for detail page"),
      })),
      execute: async ({ page, entityTypeCode, entityId }: { page: string; entityTypeCode?: string; entityId?: string }) => {
        let path = "";
        switch (page) {
          case "overview": path = "/overview"; break;
          case "dashboards": path = "/dashboards"; break;
          case "reports": path = "/reports"; break;
          case "approvals": path = "/approvals"; break;
          case "organization": path = "/organization"; break;
          case "users": path = "/users"; break;
          case "profile": path = "/profile"; break;
          case "entity_list": path = `/entities/${entityTypeCode ?? "METRIC"}`; break;
          case "entity_detail": path = `/entities/${entityTypeCode ?? "METRIC"}/${entityId ?? ""}`; break;
          case "entity_new": path = `/entities/${entityTypeCode ?? "METRIC"}/new`; break;
        }
        return { navigate: true, path };
      },
    }),

    // ── 8. Get Users ──────────────────────────────────────────────────────
    getOrgUsers: tool({
      description:
        "List organization users with their roles and entity ownership counts. Use when user asks about team members, who owns what, or user management.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const users = await prisma.user.findMany({
          where: { orgId, deletedAt: null },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            title: true,
            _count: { select: { ownedEntities: { where: { deletedAt: null } } } },
          },
          orderBy: { name: "asc" },
        });

        return users.map((u) => ({
          name: u.name,
          email: u.email,
          role: u.role,
          jobTitle: u.title,
          ownedEntitiesCount: u._count.ownedEntities,
        }));
      },
    }),

    // ── 9. Get Entity Types ───────────────────────────────────────────────
    getEntityTypes: tool({
      description:
        "Get available entity types for the organization (e.g., Metric, Initiative, Project). Use to understand what types of entities exist.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const types = await prisma.orgEntityType.findMany({
          where: { orgId },
          orderBy: { sortOrder: "asc" },
          select: { code: true, name: true, nameAr: true, sortOrder: true },
        });
        return types;
      },
    }),

    // ── 10. Compare Periods ───────────────────────────────────────────────
    comparePeriods: tool({
      description:
        "Compare entity performance between two time periods. Returns changes in achievement for each entity. Use when user asks to compare Q1 vs Q2, month over month, etc.",
      inputSchema: zodSchema(z.object({
        periodAMonthsAgo: z.number().describe("How many months ago period A starts (e.g. 6 for 6 months ago)"),
        periodBMonthsAgo: z.number().describe("How many months ago period B starts (e.g. 3 for 3 months ago)"),
      })),
      execute: async ({ periodAMonthsAgo, periodBMonthsAgo }: { periodAMonthsAgo: number; periodBMonthsAgo: number }) => {
        const now = new Date();
        const dateA = new Date(now);
        dateA.setMonth(dateA.getMonth() - periodAMonthsAgo);
        const dateB = new Date(now);
        dateB.setMonth(dateB.getMonth() - periodBMonthsAgo);

        const where = await scopedEntityWhere(orgId, userId, role);
        const entities = await prisma.entity.findMany({
          where,
          include: {
            values: {
              where: { status: { in: ["APPROVED", "LOCKED"] } },
              orderBy: { createdAt: "desc" },
              select: { achievementValue: true, createdAt: true },
            },
          },
        });

        let improved = 0, declined = 0, unchanged = 0;
        const highlights: Array<{ name: string; changepp: number; direction: string }> = [];

        for (const e of entities) {
          const periodAVals = e.values.filter((v) => v.createdAt >= dateA && v.createdAt < dateB);
          const periodBVals = e.values.filter((v) => v.createdAt >= dateB);

          const avgA = periodAVals.length > 0
            ? periodAVals.reduce((s, v) => s + Number(v.achievementValue ?? 0), 0) / periodAVals.length
            : null;
          const avgB = periodBVals.length > 0
            ? periodBVals.reduce((s, v) => s + Number(v.achievementValue ?? 0), 0) / periodBVals.length
            : null;

          if (avgA != null && avgB != null) {
            const change = Math.round(avgB - avgA);
            if (change > 2) { improved++; highlights.push({ name: e.title, changepp: change, direction: "up" }); }
            else if (change < -2) { declined++; highlights.push({ name: e.title, changepp: change, direction: "down" }); }
            else { unchanged++; }
          }
        }

        highlights.sort((a, b) => Math.abs(b.changepp) - Math.abs(a.changepp));
        return { improved, declined, unchanged, highlights: highlights.slice(0, 8) };
      },
    }),

    // ── 11. Balanced Scorecard Analysis ────────────────────────────────────
    getBalancedScorecard: tool({
      description:
        "Analyze performance across Balanced Scorecard (BSC) perspectives: Financial, Customer, Internal Processes, Learning & Growth. Groups entities by strategic perspective and calculates weighted health scores. Use when user asks about strategic perspectives or BSC analysis.",
      inputSchema: zodSchema(z.object({
        includeMetrics: z.boolean().optional().describe("Include detailed metrics per perspective (default: true)"),
      })),
      execute: async ({ includeMetrics = true }: { includeMetrics?: boolean }) => {
        const where = await scopedEntityWhere(orgId, userId, role);
        const entities = await prisma.entity.findMany({
          where,
          include: {
            orgEntityType: { select: { code: true, name: true, nameAr: true } },
            parent: { select: { title: true, titleAr: true } },
            values: {
              where: { status: { in: ["APPROVED", "LOCKED"] } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { finalValue: true, achievementValue: true, createdAt: true },
            },
          },
        });

        // Define BSC perspective patterns (entity codes/parents that indicate perspective)
        const perspectivePatterns = {
          financial: { codes: ["REVENUE", "PROFIT", "COST", "BUDGET", "ROI", "FINANCIAL"], weight: 0.25 },
          customer: { codes: ["CUSTOMER", "SATISFACTION", "NPS", "RETENTION", "ACQUISITION", "SERVICE"], weight: 0.25 },
          internal: { codes: ["PROCESS", "EFFICIENCY", "QUALITY", "DELIVERY", "OPERATIONS", "PRODUCTION"], weight: 0.25 },
          learning: { codes: ["TRAINING", "SKILL", "INNOVATION", "RD", "DEVELOPMENT", "EMPLOYEE", "SATISFACTION_E"], weight: 0.25 },
        };

        const perspectives: Record<string, { entities: typeof entities; health: number; count: number }> = {
          financial: { entities: [], health: 0, count: 0 },
          customer: { entities: [], health: 0, count: 0 },
          internal: { entities: [], health: 0, count: 0 },
          learning: { entities: [], health: 0, count: 0 },
          unclassified: { entities: [], health: 0, count: 0 },
        };

        // Categorize entities
        for (const e of entities) {
          const code = e.orgEntityType.code.toUpperCase();
          const title = (e.title || "").toUpperCase();
          const parentTitle = (e.parent?.title || "").toUpperCase();
          
          let assigned = false;
          for (const [perspective, config] of Object.entries(perspectivePatterns)) {
            if (config.codes.some(c => code.includes(c) || title.includes(c) || parentTitle.includes(c))) {
              perspectives[perspective].entities.push(e);
              assigned = true;
              break;
            }
          }
          if (!assigned) perspectives.unclassified.entities.push(e);
        }

        // Calculate health per perspective
        for (const [key, data] of Object.entries(perspectives)) {
          if (data.entities.length === 0) continue;
          
          const withData = data.entities.filter(e => e.values[0]?.achievementValue != null);
          const health = withData.length > 0
            ? Math.round(withData.reduce((s, e) => s + Number(e.values[0]?.achievementValue ?? 0), 0) / withData.length)
            : 0;
          
          perspectives[key].health = health;
          perspectives[key].count = data.entities.length;
        }

        // Calculate overall BSC score
        const weightedHealth = 
          perspectives.financial.health * perspectivePatterns.financial.weight +
          perspectives.customer.health * perspectivePatterns.customer.weight +
          perspectives.internal.health * perspectivePatterns.internal.weight +
          perspectives.learning.health * perspectivePatterns.learning.weight;

        return {
          overallBscScore: Math.round(weightedHealth),
          perspectives: {
            financial: { 
              health: perspectives.financial.health, 
              count: perspectives.financial.count,
              metrics: includeMetrics ? perspectives.financial.entities.slice(0, 5).map(e => ({
                title: e.title,
                titleAr: e.titleAr,
                achievement: e.values[0]?.achievementValue != null ? Math.round(Number(e.values[0].achievementValue)) : null,
              })) : undefined,
            },
            customer: { 
              health: perspectives.customer.health, 
              count: perspectives.customer.count,
              metrics: includeMetrics ? perspectives.customer.entities.slice(0, 5).map(e => ({
                title: e.title,
                titleAr: e.titleAr,
                achievement: e.values[0]?.achievementValue != null ? Math.round(Number(e.values[0].achievementValue)) : null,
              })) : undefined,
            },
            internal: { 
              health: perspectives.internal.health, 
              count: perspectives.internal.count,
              metrics: includeMetrics ? perspectives.internal.entities.slice(0, 5).map(e => ({
                title: e.title,
                titleAr: e.titleAr,
                achievement: e.values[0]?.achievementValue != null ? Math.round(Number(e.values[0].achievementValue)) : null,
              })) : undefined,
            },
            learning: { 
              health: perspectives.learning.health, 
              count: perspectives.learning.count,
              metrics: includeMetrics ? perspectives.learning.entities.slice(0, 5).map(e => ({
                title: e.title,
                titleAr: e.titleAr,
                achievement: e.values[0]?.achievementValue != null ? Math.round(Number(e.values[0].achievementValue)) : null,
              })) : undefined,
            },
          },
          unclassified: perspectives.unclassified.count,
        };
      },
    }),

    // ── 12. Composite Health Score ─────────────────────────────────────────
    getCompositeHealthScore: tool({
      description:
        "Calculate composite organizational health using weighted formula: achievement (70%) + data freshness (20%) + compliance (10%). Based on theory framework for comprehensive health assessment. Use for executive health reports.",
      inputSchema: zodSchema(z.object({
        includeDetails: z.boolean().optional().describe("Include entity-level breakdown (default: false)"),
      })),
      execute: async ({ includeDetails = false }: { includeDetails?: boolean }) => {
        const where = await scopedEntityWhere(orgId, userId, role);
        const entities = await prisma.entity.findMany({
          where,
          include: {
            orgEntityType: { select: { code: true, name: true, nameAr: true } },
            values: {
              where: { status: { in: ["APPROVED", "LOCKED"] } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { finalValue: true, achievementValue: true, status: true, createdAt: true },
            },
          },
        });

        const now = new Date();
        const weights = { achievement: 0.7, freshness: 0.2, compliance: 0.1 };

        const entityScores = entities.map((e) => {
          const v = e.values[0];
          
          // Achievement score (0-100)
          const achievementScore = v?.achievementValue != null 
            ? Math.min(Number(v.achievementValue), 100) 
            : 0;
          
          // Freshness score (0-100 based on days since update)
          let freshnessScore = 0;
          if (v?.createdAt) {
            const days = Math.floor((now.getTime() - v.createdAt.getTime()) / 86400000);
            if (days <= 30) freshnessScore = 100;
            else if (days <= 60) freshnessScore = 75;
            else if (days <= 90) freshnessScore = 50;
            else freshnessScore = 25;
          }
          
          // Compliance score (0-100)
          let complianceScore = 0;
          if (v?.status === "LOCKED") complianceScore = 100;
          else if (v?.status === "APPROVED") complianceScore = 80;
          else if (v?.status === "SUBMITTED") complianceScore = 50;
          else complianceScore = 0; // No data or draft
          
          // Weighted composite
          const composite = 
            achievementScore * weights.achievement +
            freshnessScore * weights.freshness +
            complianceScore * weights.compliance;
          
          return {
            id: e.id,
            title: e.title,
            titleAr: e.titleAr,
            achievementScore,
            freshnessScore,
            complianceScore,
            compositeScore: Math.round(composite),
            lastUpdate: v?.createdAt?.toISOString().slice(0, 10) ?? null,
          };
        });

        // Calculate organization averages
        const avgAchievement = Math.round(
          entityScores.reduce((s, e) => s + e.achievementScore, 0) / Math.max(entityScores.length, 1)
        );
        const avgFreshness = Math.round(
          entityScores.reduce((s, e) => s + e.freshnessScore, 0) / Math.max(entityScores.length, 1)
        );
        const avgCompliance = Math.round(
          entityScores.reduce((s, e) => s + e.complianceScore, 0) / Math.max(entityScores.length, 1)
        );
        const avgComposite = Math.round(
          entityScores.reduce((s, e) => s + e.compositeScore, 0) / Math.max(entityScores.length, 1)
        );

        return {
          weights,
          organizationScore: {
            composite: avgComposite,
            achievement: avgAchievement,
            freshness: avgFreshness,
            compliance: avgCompliance,
          },
          entityCount: entities.length,
          byCategory: {
            healthy: entityScores.filter(e => e.compositeScore >= 80).length,
            atRisk: entityScores.filter(e => e.compositeScore >= 60 && e.compositeScore < 80).length,
            critical: entityScores.filter(e => e.compositeScore < 60).length,
          },
          entities: includeDetails ? entityScores.sort((a, b) => a.compositeScore - b.compositeScore).slice(0, 10) : undefined,
        };
      },
    }),

    // ── 13. Performance Forecast ─────────────────────────────────────────────
    getPerformanceForecast: tool({
      description:
        "Forecast future performance based on historical trend analysis. Calculates trend direction and projects achievement for next 3 months. Use when user asks about predictions or future outlook.",
      inputSchema: zodSchema(z.object({
        entityTitle: z.string().optional().describe("Specific entity to forecast"),
        monthsAhead: z.number().optional().describe("Months to forecast (default: 3, max: 6)"),
      })),
      execute: async ({ entityTitle, monthsAhead = 3 }: { entityTitle?: string; monthsAhead?: number }) => {
        const where = await scopedEntityWhere(orgId, userId, role);
        
        // If specific entity requested
        if (entityTitle) {
          const entity = await prisma.entity.findFirst({
            where: { ...where, title: { contains: entityTitle, mode: "insensitive" } },
            include: {
              values: {
                where: { status: { in: ["APPROVED", "LOCKED"] } },
                orderBy: { createdAt: "desc" },
                take: 6,
                select: { achievementValue: true, createdAt: true },
              },
            },
          });
          
          if (!entity) return { found: false, message: "Entity not found" };
          
          const values = entity.values
            .filter(v => v.achievementValue != null)
            .map(v => ({ value: Number(v.achievementValue), date: v.createdAt }))
            .reverse(); // Oldest first
          
          if (values.length < 2) {
            return { 
              found: true, 
              entityTitle: entity.title,
              forecast: null,
              reason: "Insufficient data (need at least 2 data points)"
            };
          }
          
          // Simple linear regression
          const n = values.length;
          const sumX = values.reduce((s, _, i) => s + i, 0);
          const sumY = values.reduce((s, v) => s + v.value, 0);
          const sumXY = values.reduce((s, v, i) => s + i * v.value, 0);
          const sumXX = values.reduce((s, _, i) => s + i * i, 0);
          
          const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
          const intercept = (sumY - slope * sumX) / n;
          
          // Forecast next months
          const forecast = [];
          for (let i = 1; i <= Math.min(monthsAhead, 6); i++) {
            const projected = intercept + slope * (n - 1 + i);
            forecast.push({
              monthOffset: i,
              projectedAchievement: Math.max(0, Math.min(100, Math.round(projected))),
            });
          }
          
          return {
            found: true,
            entityTitle: entity.title,
            entityTitleAr: entity.titleAr,
            historicalPoints: values.length,
            trendDirection: slope > 1 ? "improving" : slope < -1 ? "declining" : "stable",
            trendSlope: Math.round(slope * 10) / 10,
            currentAchievement: values[values.length - 1]?.value ?? null,
            forecast,
          };
        }
        
        // Organization-wide forecast
        const entities = await prisma.entity.findMany({
          where,
          include: {
            values: {
              where: { status: { in: ["APPROVED", "LOCKED"] } },
              orderBy: { createdAt: "desc" },
              take: 3,
              select: { achievementValue: true },
            },
          },
        });
        
        const recentAchievements = entities
          .map(e => e.values[0]?.achievementValue != null ? Number(e.values[0].achievementValue) : null)
          .filter((v): v is number => v != null);
        
        const currentAvg = recentAchievements.length > 0
          ? recentAchievements.reduce((s, v) => s + v, 0) / recentAchievements.length
          : 0;
        
        // Simple trend based on % of entities with data
        const dataCoverage = entities.length > 0 ? recentAchievements.length / entities.length : 0;
        const projectedImprovement = Math.round((1 - dataCoverage) * 10); // Assume 10% improvement possible
        
        return {
          found: true,
          scope: "organization",
          entityCount: entities.length,
          dataCoverage: Math.round(dataCoverage * 100),
          currentAverage: Math.round(currentAvg),
          forecastedAverage: Math.round(currentAvg + projectedImprovement),
          confidence: dataCoverage > 0.8 ? "high" : dataCoverage > 0.5 ? "medium" : "low",
          monthsAhead: Math.min(monthsAhead, 6),
        };
      },
    }),
  };
}
