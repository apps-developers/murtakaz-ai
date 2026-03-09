"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgMember } from "@/lib/server-action-auth";
import { KpiValueStatus, Status } from "@/generated/prisma-client";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function computeAchievement(input: {
  achievementValue?: number | null;
  finalValue?: number | null;
  calculatedValue?: number | null;
  actualValue?: number | null;
  targetValue?: number | null;
  direction?: string | null;
}) {
  if (typeof input.achievementValue === "number" && Number.isFinite(input.achievementValue)) {
    return clamp(Number(input.achievementValue), 0, 100);
  }

  const raw =
    typeof input.finalValue === "number"
      ? input.finalValue
      : typeof input.calculatedValue === "number"
        ? input.calculatedValue
        : typeof input.actualValue === "number"
          ? input.actualValue
          : null;

  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (typeof input.targetValue !== "number" || !Number.isFinite(input.targetValue) || input.targetValue === 0) return null;

  if (input.direction === "DECREASE_IS_GOOD") {
    return clamp((input.targetValue / raw) * 100, 0, 100);
  }
  return clamp((raw / input.targetValue) * 100, 0, 100);
}

function daysSince(now: Date, past: Date) {
  return Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
}

function startOfQuarterUtc(d: Date) {
  const q = Math.floor(d.getUTCMonth() / 3);
  return new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1));
}

function addMonthsUtc(d: Date, months: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
}

function quartersBack(count: number) {
  const now = new Date();
  const end = startOfQuarterUtc(now);
  const ranges: Array<{ start: Date; end: Date; label: string }> = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const start = addMonthsUtc(end, -i * 3);
    const next = addMonthsUtc(start, 3);
    const quarter = Math.floor(start.getUTCMonth() / 3) + 1;
    const year = start.getUTCFullYear();
    ranges.push({ start, end: next, label: `Q${quarter} ${year}` });
  }

  return ranges;
}

function monthsBack(count: number) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const ranges: Array<{ start: Date; end: Date; key: string }> = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const start = addMonthsUtc(end, -i);
    const next = addMonthsUtc(start, 1);
    ranges.push({ start, end: next, key: start.toISOString() });
  }

  return ranges;
}

async function countEntitiesByTypeCode(orgId: string, code: string) {
  return prisma.entity.count({
    where: {
      orgId,
      deletedAt: null,
      orgEntityType: { code: { equals: code, mode: "insensitive" } },
    },
  });
}

async function getTopEntityTypes(orgId: string, take = 6) {
  const grouped = await prisma.entity.groupBy({
    by: ["orgEntityTypeId"],
    where: { orgId, deletedAt: null },
    _count: { orgEntityTypeId: true },
    orderBy: { _count: { orgEntityTypeId: "desc" } },
    take,
  });

  const ids = grouped.map((g) => String(g.orgEntityTypeId));
  const types = await prisma.orgEntityType.findMany({
    where: { id: { in: ids }, orgId },
    select: { id: true, name: true, nameAr: true, code: true },
  });
  const byId = new Map(types.map((t) => [String(t.id), t]));

  return grouped
    .map((g) => {
      const t = byId.get(String(g.orgEntityTypeId));
      return {
        id: String(g.orgEntityTypeId),
        code: t ? String(t.code) : String(g.orgEntityTypeId),
        name: t ? String(t.name) : String(g.orgEntityTypeId),
        nameAr: t?.nameAr ? String(t.nameAr) : null,
        count: Number(g._count?.orgEntityTypeId ?? 0),
      };
    })
    .filter((r) => r.count > 0);
}

async function getKpisWithLatestValue(orgId: string, take = 500) {
  return prisma.entity.findMany({
    where: {
      orgId,
      deletedAt: null,
      orgEntityType: { code: { equals: "KPI", mode: "insensitive" } },
    },
    take,
    orderBy: [{ title: "asc" }],
    select: {
      id: true,
      title: true,
      titleAr: true,
      unit: true,
      unitAr: true,
      targetValue: true,
      direction: true,
      ownerUser: { select: { id: true, name: true } },
      values: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: {
          createdAt: true,
          status: true,
          finalValue: true,
          calculatedValue: true,
          actualValue: true,
          achievementValue: true,
          submittedAt: true,
        },
      },
    },
  });
}

export async function getOverviewInsights() {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;

  const [org, strategies, objectives, totalKpis, users, pendingApprovals, topTypes] = await Promise.all([
    prisma.organization.findFirst({ where: { id: orgId, deletedAt: null }, select: { id: true, name: true, nameAr: true } }),
    countEntitiesByTypeCode(orgId, "STRATEGY"),
    countEntitiesByTypeCode(orgId, "OBJECTIVE"),
    countEntitiesByTypeCode(orgId, "KPI"),
    prisma.user.count({ where: { orgId, deletedAt: null } }),
    prisma.entityValue.count({ where: { status: KpiValueStatus.SUBMITTED, entity: { orgId, deletedAt: null } } }),
    getTopEntityTypes(orgId, 6),
  ]);

  const kpis = await getKpisWithLatestValue(orgId, 1000);
  const now = new Date();

  let sum = 0;
  let count = 0;
  const freshness = { excellent: 0, good: 0, fair: 0, needsAttention: 0, noData: 0 };

  const staleKpis: Array<{ id: string; title: string; titleAr: string | null; daysSinceLastUpdate: number | null }> = [];

  for (const k of kpis) {
    const v = k.values?.[0] ?? null;
    const ach = computeAchievement({
      achievementValue: v?.achievementValue,
      finalValue: v?.finalValue,
      calculatedValue: v?.calculatedValue,
      actualValue: v?.actualValue,
      targetValue: k.targetValue,
      direction: k.direction,
    });

    if (typeof ach === "number") {
      sum += ach;
      count += 1;
    }

    if (!v?.createdAt) {
      freshness.noData += 1;
      staleKpis.push({ id: String(k.id), title: String(k.title), titleAr: k.titleAr ? String(k.titleAr) : null, daysSinceLastUpdate: null });
      continue;
    }

    const days = daysSince(now, new Date(v.createdAt));
    staleKpis.push({ id: String(k.id), title: String(k.title), titleAr: k.titleAr ? String(k.titleAr) : null, daysSinceLastUpdate: days });

    if (days <= 30) freshness.excellent += 1;
    else if (days <= 60) freshness.good += 1;
    else if (days <= 90) freshness.fair += 1;
    else freshness.needsAttention += 1;
  }

  const overallHealth = count > 0 ? Math.round(sum / count) : 0;

  const recent = await prisma.entityValue.findMany({
    where: {
      entity: { orgId, deletedAt: null, orgEntityType: { code: { equals: "KPI", mode: "insensitive" } } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 8,
    select: {
      id: true,
      status: true,
      createdAt: true,
      entity: { select: { id: true, title: true, titleAr: true } },
    },
  });

  const topOwnersGrouped = await prisma.entity.groupBy({
    by: ["ownerUserId"],
    where: { orgId, deletedAt: null, ownerUserId: { not: null } },
    _count: { ownerUserId: true },
    orderBy: { _count: { ownerUserId: "desc" } },
    take: 6,
  });

  const ownerIds = topOwnersGrouped.map((r) => String(r.ownerUserId)).filter(Boolean);
  const ownersList = await prisma.user.findMany({
    where: { id: { in: ownerIds }, orgId, deletedAt: null },
    select: { id: true, name: true },
  });
  const ownerNameById = new Map(ownersList.map((u) => [String(u.id), String(u.name)]));

  const topOwners = topOwnersGrouped
    .filter((r) => r.ownerUserId)
    .map((r) => ({
      userId: String(r.ownerUserId),
      name: ownerNameById.get(String(r.ownerUserId)) ?? "—",
      count: Number(r._count?.ownerUserId ?? 0),
    }));

  const quarters = quartersBack(4);
  const quarterValues = await Promise.all(
    quarters.map(async (q) => {
      const agg = await prisma.entityValue.aggregate({
        where: {
          createdAt: { gte: q.start, lt: q.end },
          achievementValue: { not: null },
          entity: { orgId, deletedAt: null, orgEntityType: { code: { equals: "KPI", mode: "insensitive" } } },
        },
        _avg: { achievementValue: true },
      });
      const avg = typeof agg._avg.achievementValue === "number" ? Number(agg._avg.achievementValue) : 0;
      return Math.round(clamp(avg, 0, 100));
    }),
  );

  const attention = staleKpis
    .filter((k) => k.daysSinceLastUpdate === null || k.daysSinceLastUpdate > 60)
    .sort((a, b) => (b.daysSinceLastUpdate ?? 999999) - (a.daysSinceLastUpdate ?? 999999))
    .slice(0, 6);

  return {
    org: org
      ? {
          id: String(org.id),
          name: String(org.name),
          nameAr: org.nameAr ? String(org.nameAr) : null,
        }
      : null,
    user: {
      id: String(session.user.id),
      name: String(session.user.name ?? ""),
      role: String((session.user as { role?: string }).role ?? ""),
    },
    summary: {
      totalStrategies: strategies,
      totalObjectives: objectives,
      totalKpis,
      overallHealth,
      pendingApprovals,
      users,
    },
    topTypes,
    freshness,
    quarterlyProgress: { categories: quarters.map((q) => q.label), values: quarterValues },
    recentActivities: recent.map((r: any) => ({
      id: String(r.id),
      status: String(r.status),
      createdAt: r.createdAt.toISOString(),
      entityId: String(r.entity.id),
      title: String(r.entity.title),
      titleAr: r.entity.titleAr ? String(r.entity.titleAr) : null,
    })),
    attentionKpis: attention,
    topOwners,
  };
}

export async function getDashboardInsights() {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;

  const [totalKpis, activeProjects, users, topTypes] = await Promise.all([
    countEntitiesByTypeCode(orgId, "KPI"),
    prisma.entity.count({
      where: {
        orgId,
        deletedAt: null,
        status: Status.ACTIVE,
        orgEntityType: { code: { equals: "PROJECT", mode: "insensitive" } },
      },
    }),
    prisma.user.count({ where: { orgId, deletedAt: null } }),
    getTopEntityTypes(orgId, 6),
  ]);

  const kpis = await getKpisWithLatestValue(orgId, 1000);
  const now = new Date();

  let sum = 0;
  let count = 0;
  let withValue = 0;

  const topKpis = kpis
    .map((k) => {
      const v = k.values?.[0] ?? null;
      if (v) withValue += 1;
      const achievement = computeAchievement({
        achievementValue: v?.achievementValue,
        finalValue: v?.finalValue,
        calculatedValue: v?.calculatedValue,
        actualValue: v?.actualValue,
        targetValue: k.targetValue,
        direction: k.direction,
      });
      if (typeof achievement === "number") {
        sum += achievement;
        count += 1;
      }
      return {
        id: String(k.id),
        title: String(k.title),
        titleAr: k.titleAr ? String(k.titleAr) : null,
        unit: k.unit ? String(k.unit) : null,
        unitAr: k.unitAr ? String(k.unitAr) : null,
        targetValue: typeof k.targetValue === "number" ? Number(k.targetValue) : null,
        value: typeof achievement === "number" ? Math.round(achievement) : null,
        updatedAt: v?.createdAt ? v.createdAt.toISOString() : null,
      };
    })
    .filter((k) => typeof k.value === "number")
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
    .slice(0, 5);

  const overallHealth = count > 0 ? Math.round(sum / count) : 0;
  const completionRate = totalKpis > 0 ? Math.round((withValue / totalKpis) * 100) : 0;

  const monthRanges = monthsBack(6);
  const monthlyActivityValues = await Promise.all(
    monthRanges.map(async (m) => {
      const c = await prisma.entityValue.count({
        where: {
          createdAt: { gte: m.start, lt: m.end },
          entity: { orgId, deletedAt: null, orgEntityType: { code: { equals: "KPI", mode: "insensitive" } } },
        },
      });
      return c;
    }),
  );

  const statusGrouped = await prisma.entity.groupBy({
    by: ["status"],
    where: { orgId, deletedAt: null },
    _count: { status: true },
  });

  const updatesLast30Days = await prisma.entityValue.count({
    where: {
      createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      entity: { orgId, deletedAt: null, orgEntityType: { code: { equals: "KPI", mode: "insensitive" } } },
    },
  });

  const approvedLast30Days = await prisma.entityValue.count({
    where: {
      status: KpiValueStatus.APPROVED,
      approvedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      entity: { orgId, deletedAt: null },
    },
  });

  return {
    metrics: {
      totalKpis,
      completionRate,
      activeProjects,
      users,
      overallHealth,
      updatesLast30Days,
      approvedLast30Days,
    },
    monthlyActivity: { categories: monthRanges.map((m) => m.key), values: monthlyActivityValues },
    topTypes,
    statusCounts: statusGrouped.map((s) => ({ status: String(s.status), count: Number(s._count?.status ?? 0) })),
    topKpis,
  };
}

export async function getExecutiveDashboardInsights() {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;

  const now = new Date();
  const day2 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const day5 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const day10 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  const [initiativesAtRisk, pillarsCount, approvals0to2, approvals3to5, approvals6to10, approvals10plus] = await Promise.all([
    prisma.entity.findMany({
      where: {
        orgId,
        deletedAt: null,
        status: Status.AT_RISK,
        orgEntityType: { code: { equals: "INITIATIVE", mode: "insensitive" } },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 10,
      select: {
        id: true,
        title: true,
        titleAr: true,
        ownerUser: { select: { id: true, name: true } },
      },
    }),
    countEntitiesByTypeCode(orgId, "PILLAR"),
    prisma.entityValue.count({
      where: {
        status: KpiValueStatus.SUBMITTED,
        submittedAt: { gte: day2 },
        entity: { orgId, deletedAt: null },
      },
    }),
    prisma.entityValue.count({
      where: {
        status: KpiValueStatus.SUBMITTED,
        submittedAt: { gte: day5, lt: day2 },
        entity: { orgId, deletedAt: null },
      },
    }),
    prisma.entityValue.count({
      where: {
        status: KpiValueStatus.SUBMITTED,
        submittedAt: { gte: day10, lt: day5 },
        entity: { orgId, deletedAt: null },
      },
    }),
    prisma.entityValue.count({
      where: {
        status: KpiValueStatus.SUBMITTED,
        submittedAt: { lt: day10 },
        entity: { orgId, deletedAt: null },
      },
    }),
  ]);

  const kpis = await getKpisWithLatestValue(orgId, 1000);

  const pipelineMap = new Map<string, number>();
  for (const k of kpis) {
    const status = k.values?.[0]?.status ? String(k.values[0].status) : "NO_DATA";
    pipelineMap.set(status, (pipelineMap.get(status) ?? 0) + 1);
  }
  const kpiPipeline = Array.from(pipelineMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  const trendRanges = monthsBack(12);
  const confidenceTrend = await Promise.all(
    trendRanges.map(async (m) => {
      const agg = await prisma.entityValue.aggregate({
        where: {
          createdAt: { gte: m.start, lt: m.end },
          achievementValue: { not: null },
          entity: { orgId, deletedAt: null, orgEntityType: { code: { equals: "KPI", mode: "insensitive" } } },
        },
        _avg: { achievementValue: true },
      });
      const avg = typeof agg._avg.achievementValue === "number" ? Number(agg._avg.achievementValue) : 0;
      return Math.round(clamp(avg, 0, 100));
    }),
  );

  const freshness = { excellent: 0, good: 0, fair: 0, needsAttention: 0, noData: 0 };
  for (const k of kpis) {
    const v = k.values?.[0] ?? null;
    if (!v?.createdAt) {
      freshness.noData += 1;
      continue;
    }
    const days = daysSince(now, new Date(v.createdAt));
    if (days <= 30) freshness.excellent += 1;
    else if (days <= 60) freshness.good += 1;
    else if (days <= 90) freshness.fair += 1;
    else freshness.needsAttention += 1;
  }

  const topKpis = kpis
    .map((k) => {
      const v = k.values?.[0] ?? null;
      const achievement = computeAchievement({
        achievementValue: v?.achievementValue,
        finalValue: v?.finalValue,
        calculatedValue: v?.calculatedValue,
        actualValue: v?.actualValue,
        targetValue: k.targetValue,
        direction: k.direction,
      });
      return {
        id: String(k.id),
        title: String(k.title),
        titleAr: k.titleAr ? String(k.titleAr) : null,
        unit: k.unit ? String(k.unit) : null,
        unitAr: k.unitAr ? String(k.unitAr) : null,
        current: typeof achievement === "number" ? Math.round(achievement) : null,
        target: 100,
      };
    })
    .filter((k) => typeof k.current === "number")
    .sort((a, b) => (b.current ?? -1) - (a.current ?? -1))
    .slice(0, 5);

  return {
    confidenceTrend,
    pillarsActive: pillarsCount,
    atRiskInitiatives: initiativesAtRisk.map((i: any) => ({
      id: String(i.id),
      title: String(i.title),
      titleAr: i.titleAr ? String(i.titleAr) : null,
      owner: i.ownerUser?.name ? String(i.ownerUser.name) : "—",
    })),
    freshness,
    kpiPipeline,
    approvalsAging: {
      categories: ["0–2d", "3–5d", "6–10d", "10d+"],
      values: [approvals0to2, approvals3to5, approvals6to10, approvals10plus],
    },
    topKpis,
  };
}
