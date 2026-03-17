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
        "Get overall organization health: KPI counts by RAG status, overall health score, pending approvals, stale KPIs count. Use this when user asks about organization health, overall performance, or dashboard summary.",
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
        const staleKpis: string[] = [];
        const now = new Date();

        for (const e of entities) {
          const v = e.values[0];
          if (!v || v.achievementValue == null) { noData++; continue; }
          const ach = Number(v.achievementValue);
          if (ach >= 80) green++;
          else if (ach >= 60) amber++;
          else red++;
          const days = Math.floor((now.getTime() - v.createdAt.getTime()) / 86400000);
          if (days > 30) staleKpis.push(e.title);
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
          staleKpisCount: staleKpis.length,
          staleKpiNames: staleKpis.slice(0, 10),
        };
      },
    }),

    // ── 2. List KPIs ──────────────────────────────────────────────────────
    getKpiList: tool({
      description:
        "List KPIs with optional filters. Returns title, achievement, status, target, unit for each. Use when user asks to list KPIs, filter by status/type, or find specific KPIs.",
      inputSchema: zodSchema(z.object({
        statusFilter: z.enum(["all", "green", "amber", "red", "no_data"]).optional().describe("Filter by RAG status"),
        entityTypeCode: z.string().optional().describe("Filter by entity type code (e.g. 'KPI', 'INITIATIVE')"),
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

    // ── 3. KPI Detail ─────────────────────────────────────────────────────
    getKpiDetail: tool({
      description:
        "Get deep detail on a specific KPI: history, trend, target, formula, variables, owner. Use when user asks about a specific KPI by name or ID.",
      inputSchema: zodSchema(z.object({
        kpiTitle: z.string().optional().describe("Search by KPI title (partial match)"),
        kpiId: z.string().optional().describe("Exact KPI entity ID"),
      })),
      execute: async ({ kpiTitle, kpiId }: { kpiTitle?: string; kpiId?: string }) => {
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

        const entity = kpiId
          ? await prisma.entity.findUnique({ where: { id: kpiId }, include: includeBlock })
          : kpiTitle
            ? await prisma.entity.findFirst({ where: { orgId, deletedAt: null, title: { contains: kpiTitle, mode: "insensitive" } }, include: includeBlock })
            : null;

        if (!entity) return { found: false, message: "KPI not found" };

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

    // ── 4. Stale KPIs ─────────────────────────────────────────────────────
    getStaleKpis: tool({
      description:
        "Get KPIs that haven't been updated in 30+ days. Use when user asks about overdue, stale, or missing data KPIs.",
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

        return { threshold, staleCount: stale.length, kpis: stale.slice(0, 20) };
      },
    }),

    // ── 5. Pending Approvals ──────────────────────────────────────────────
    getPendingApprovals: tool({
      description:
        "Get pending KPI value submissions awaiting approval. Shows who submitted what and the value details. Use when user asks about approvals, submissions, or review queue.",
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
            kpiTitle: v.entity.title,
            kpiTitleAr: v.entity.titleAr,
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
        "Get the organization's entity type hierarchy with counts. Shows pillars, objectives, KPIs, initiatives etc. Use when user asks about org structure, entity types, or hierarchy.",
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
        "Navigate user to a specific page in the application. Use when user asks to go to a page, view a KPI, open approvals, etc. Returns a navigation instruction the frontend will handle.",
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
        entityTypeCode: z.string().optional().describe("Entity type code for entity pages (e.g. 'KPI')"),
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
          case "entity_list": path = `/entities/${entityTypeCode ?? "KPI"}`; break;
          case "entity_detail": path = `/entities/${entityTypeCode ?? "KPI"}/${entityId ?? ""}`; break;
          case "entity_new": path = `/entities/${entityTypeCode ?? "KPI"}/new`; break;
        }
        return { navigate: true, path };
      },
    }),

    // ── 8. Get Users ──────────────────────────────────────────────────────
    getOrgUsers: tool({
      description:
        "List organization users with their roles and KPI ownership counts. Use when user asks about team members, who owns what, or user management.",
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
        "Get available entity types for the organization (e.g., KPI, Initiative, Project). Use to understand what types of entities exist.",
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
        "Compare KPI performance between two time periods. Returns changes in achievement for each KPI. Use when user asks to compare Q1 vs Q2, month over month, etc.",
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
  };
}
