"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgMember } from "@/lib/server-action-auth";
import { ApprovalStatus, KpiValueStatus, Status } from "@/generated/prisma-client";
import { clamp } from "@/lib/utils";

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
    countEntitiesByTypeCode(orgId, "initiative"),
    countEntitiesByTypeCode(orgId, "objective"),
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

function getPreviousPeriodRange(periodType: string, now: Date): { start: Date; end: Date } | null {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  if (periodType === "MONTHLY") {
    const end = new Date(Date.UTC(y, m, 1));
    const start = new Date(Date.UTC(y, m - 1, 1));
    return { start, end };
  }
  if (periodType === "QUARTERLY") {
    const currentQ = Math.floor(m / 3);
    const end = new Date(Date.UTC(y, currentQ * 3, 1));
    const start = new Date(Date.UTC(y, currentQ * 3 - 3, 1));
    return { start, end };
  }
  if (periodType === "YEARLY") {
    const end = new Date(Date.UTC(y, 0, 1));
    const start = new Date(Date.UTC(y - 1, 0, 1));
    return { start, end };
  }
  return null;
}

export async function getOverdueKpis() {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;
  const userId = session.user.id;
  const role = (session.user as { role?: string }).role;
  const isAdmin = role === "ADMIN";
  const now = new Date();

  const kpis = await prisma.entity.findMany({
    where: {
      orgId,
      deletedAt: null,
      orgEntityType: { code: { equals: "KPI", mode: "insensitive" } },
      periodType: { not: null },
      ...(!isAdmin
        ? {
            OR: [
              { ownerUserId: userId },
              { assignments: { some: { userId } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      titleAr: true,
      periodType: true,
      ownerUser: { select: { id: true, name: true } },
      values: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: { createdAt: true, status: true },
      },
    },
  });

  const overdueList: Array<{
    id: string;
    title: string;
    titleAr: string | null;
    periodType: string;
    periodLabel: string;
    ownerName: string | null;
    daysPastDeadline: number;
  }> = [];

  for (const kpi of kpis) {
    const pt = kpi.periodType;
    if (!pt) continue;

    const range = getPreviousPeriodRange(pt, now);
    if (!range) continue;

    const latestValue = kpi.values?.[0] ?? null;
    const hasValueInPeriod =
      latestValue?.createdAt && new Date(latestValue.createdAt) >= range.start;

    if (hasValueInPeriod) continue;

    const daysPast = Math.floor(
      (now.getTime() - range.end.getTime()) / (1000 * 60 * 60 * 24),
    );

    const periodLabel =
      pt === "MONTHLY"
        ? `${range.start.getUTCFullYear()}-${String(range.start.getUTCMonth() + 1).padStart(2, "0")}`
        : pt === "QUARTERLY"
          ? `Q${Math.floor(range.start.getUTCMonth() / 3) + 1} ${range.start.getUTCFullYear()}`
          : `${range.start.getUTCFullYear()}`;

    overdueList.push({
      id: String(kpi.id),
      title: String(kpi.title),
      titleAr: kpi.titleAr ? String(kpi.titleAr) : null,
      periodType: String(pt),
      periodLabel,
      ownerName: kpi.ownerUser?.name ? String(kpi.ownerUser.name) : null,
      daysPastDeadline: daysPast,
    });
  }

  overdueList.sort((a, b) => b.daysPastDeadline - a.daysPastDeadline);

  return {
    isAdmin,
    overdueKpis: overdueList.slice(0, 10),
    totalOverdue: overdueList.length,
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
        orgEntityType: { code: { equals: "initiative", mode: "insensitive" } },
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
        target: typeof k.targetValue === "number" ? Number(k.targetValue) : null,
      };
    })
    .filter((k) => typeof k.current === "number")
    .sort((a, b) => (b.current ?? -1) - (a.current ?? -1))
    .slice(0, 5);

  return {
    confidenceTrend,
    pillarsActive: pillarsCount,
    atRiskInitiatives: initiativesAtRisk.map((i) => ({
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

export async function getKpiPerformanceInsights() {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;

  const kpis = await getKpisWithLatestValue(orgId, 500);
  const now = new Date();

  const rows = kpis.map((k) => {
    const v = k.values?.[0] ?? null;
    const achievement = computeAchievement({
      achievementValue: v?.achievementValue,
      finalValue: v?.finalValue,
      calculatedValue: v?.calculatedValue,
      actualValue: v?.actualValue,
      targetValue: k.targetValue,
      direction: k.direction,
    });
    const days = v?.createdAt ? Math.floor((now.getTime() - new Date(v.createdAt).getTime()) / 86400000) : null;
    return {
      id: String(k.id),
      title: String(k.title),
      titleAr: k.titleAr ? String(k.titleAr) : null,
      unit: k.unit ? String(k.unit) : null,
      unitAr: k.unitAr ? String(k.unitAr) : null,
      current: typeof achievement === "number" ? Math.round(achievement) : null,
      target: typeof k.targetValue === "number" ? Number(k.targetValue) : null,
      variance:
        typeof achievement === "number" && typeof k.targetValue === "number" && k.targetValue > 0
          ? Math.round(achievement - 100)
          : null,
      freshnessDays: days,
      owner: k.ownerUser?.name ? String(k.ownerUser.name) : null,
      status: v?.status ? String(v.status) : "NO_DATA",
    };
  });

  const withVariance = rows.filter((r) => r.variance !== null);
  const varianceTop = withVariance
    .sort((a, b) => (a.variance ?? 0) - (b.variance ?? 0))
    .slice(0, 8);

  const freshnessSorted = rows
    .filter((r) => r.freshnessDays !== null)
    .sort((a, b) => (b.freshnessDays ?? 0) - (a.freshnessDays ?? 0))
    .slice(0, 5);

  return { rows, varianceTop, freshnessSorted };
}

export async function getInitiativeHealthInsights() {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;

  const initiatives = await prisma.entity.findMany({
    where: {
      orgId,
      deletedAt: null,
      orgEntityType: { code: { equals: "initiative", mode: "insensitive" } },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      titleAr: true,
      status: true,
      ownerUser: { select: { id: true, name: true } },
    },
  });

  const kpis = await getKpisWithLatestValue(orgId, 500);
  const initiativeKpiCounts = kpis.length;

  const atRisk = initiatives.filter((i) => i.status === Status.AT_RISK);
  const onTrack = initiatives.filter((i) => i.status === Status.ACTIVE);
  const planned = initiatives.filter((i) => i.status === Status.PLANNED);
  const completed = initiatives.filter((i) => i.status === Status.COMPLETED);

  return {
    summary: {
      total: initiatives.length,
      atRisk: atRisk.length,
      onTrack: onTrack.length,
      planned: planned.length,
      completed: completed.length,
      kpis: initiativeKpiCounts,
    },
    atRiskList: atRisk.map((i) => ({
      id: String(i.id),
      title: String(i.title),
      titleAr: i.titleAr ? String(i.titleAr) : null,
      owner: i.ownerUser?.name ? String(i.ownerUser.name) : "—",
      status: String(i.status),
    })),
    allInitiatives: initiatives.map((i) => ({
      id: String(i.id),
      title: String(i.title),
      titleAr: i.titleAr ? String(i.titleAr) : null,
      owner: i.ownerUser?.name ? String(i.ownerUser.name) : "—",
      status: String(i.status),
    })),
  };
}

export async function getProjectExecutionInsights() {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;

  const projects = await prisma.entity.findMany({
    where: {
      orgId,
      deletedAt: null,
      orgEntityType: { code: { equals: "project", mode: "insensitive" } },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      titleAr: true,
      status: true,
      ownerUser: { select: { id: true, name: true } },
      values: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: { achievementValue: true, finalValue: true, actualValue: true },
      },
    },
  });

  const rows = projects.map((p) => ({
    id: String(p.id),
    title: String(p.title),
    titleAr: p.titleAr ? String(p.titleAr) : null,
    owner: p.ownerUser?.name ? String(p.ownerUser.name) : "—",
    status: String(p.status),
  }));

  const statusCounts = {
    PLANNED: projects.filter((p) => p.status === Status.PLANNED).length,
    ACTIVE: projects.filter((p) => p.status === Status.ACTIVE).length,
    AT_RISK: projects.filter((p) => p.status === Status.AT_RISK).length,
    COMPLETED: projects.filter((p) => p.status === Status.COMPLETED).length,
  };

  return { rows, statusCounts };
}

export async function getManagerDashboardInsights() {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;
  const userId = session.user.id;

  const [ownedEntities, pendingApprovals, assignedEntities] = await Promise.all([
    prisma.entity.findMany({
      where: { orgId, deletedAt: null, ownerUserId: userId },
      orderBy: [{ updatedAt: "desc" }],
      take: 20,
      select: {
        id: true,
        title: true,
        titleAr: true,
        status: true,
        orgEntityType: { select: { name: true, nameAr: true, code: true } },
        values: {
          orderBy: [{ createdAt: "desc" }],
          take: 1,
          select: { achievementValue: true, status: true },
        },
      },
    }),
    prisma.entityValue.count({
      where: {
        status: KpiValueStatus.SUBMITTED,
        entity: { orgId, deletedAt: null, ownerUserId: userId },
      },
    }),
    prisma.userEntityAssignment.findMany({
      where: { userId, entity: { orgId, deletedAt: null } },
      take: 20,
      select: {
        entity: {
          select: {
            id: true,
            title: true,
            titleAr: true,
            status: true,
            orgEntityType: { select: { name: true, nameAr: true, code: true } },
          },
        },
      },
    }),
  ]);

  const atRisk = ownedEntities.filter((e) => e.status === Status.AT_RISK);

  return {
    pendingApprovals,
    atRiskCount: atRisk.length,
    ownedEntities: ownedEntities.map((e) => ({
      id: String(e.id),
      title: String(e.title),
      titleAr: e.titleAr ? String(e.titleAr) : null,
      status: String(e.status),
      typeCode: e.orgEntityType?.code ? String(e.orgEntityType.code) : "entity",
      typeName: e.orgEntityType?.name ? String(e.orgEntityType.name) : "",
      typeNameAr: e.orgEntityType?.nameAr ? String(e.orgEntityType.nameAr) : null,
      achievement:
        typeof e.values?.[0]?.achievementValue === "number"
          ? Math.round(clamp(Number(e.values[0].achievementValue), 0, 100))
          : null,
      valueStatus: e.values?.[0]?.status ? String(e.values[0].status) : null,
    })),
    assignedEntities: assignedEntities.map((a) => ({
      id: String(a.entity.id),
      title: String(a.entity.title),
      titleAr: a.entity.titleAr ? String(a.entity.titleAr) : null,
      status: String(a.entity.status),
      typeCode: a.entity.orgEntityType?.code ? String(a.entity.orgEntityType.code) : "entity",
      typeName: a.entity.orgEntityType?.name ? String(a.entity.orgEntityType.name) : "",
    })),
  };
}

export async function getRiskEscalationInsights() {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;

  const risks = await prisma.entity.findMany({
    where: {
      orgId,
      deletedAt: null,
      orgEntityType: { code: { equals: "risk", mode: "insensitive" } },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      titleAr: true,
      status: true,
      ownerUser: { select: { id: true, name: true } },
      values: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: { achievementValue: true, status: true },
      },
    },
  });

  const statusCounts = {
    PLANNED: risks.filter((r) => r.status === Status.PLANNED).length,
    ACTIVE: risks.filter((r) => r.status === Status.ACTIVE).length,
    AT_RISK: risks.filter((r) => r.status === Status.AT_RISK).length,
    COMPLETED: risks.filter((r) => r.status === Status.COMPLETED).length,
  };

  const escalated = risks.filter((r) => r.status === Status.AT_RISK);

  return {
    summary: {
      total: risks.length,
      escalated: escalated.length,
      ...statusCounts,
    },
    severityDonut: [
      { name: "AT_RISK", value: statusCounts.AT_RISK, color: "#fb7185" },
      { name: "ACTIVE", value: statusCounts.ACTIVE, color: "#f59e0b" },
      { name: "PLANNED", value: statusCounts.PLANNED, color: "#60a5fa" },
      { name: "COMPLETED", value: statusCounts.COMPLETED, color: "#34d399" },
    ].filter((x) => x.value > 0),
    escalatedList: escalated.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      titleAr: r.titleAr ? String(r.titleAr) : null,
      owner: r.ownerUser?.name ? String(r.ownerUser.name) : "—",
      status: String(r.status),
    })),
    allRisks: risks.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      titleAr: r.titleAr ? String(r.titleAr) : null,
      owner: r.ownerUser?.name ? String(r.ownerUser.name) : "—",
      status: String(r.status),
    })),
  };
}

export async function getGovernanceInsights() {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;

  const now = new Date();
  const day2 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const day5 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const day10 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  const [pending, approved, rejected, aging0to2, aging3to5, aging6to10, aging10plus] =
    await Promise.all([
      prisma.changeRequest.findMany({
        where: { orgId, deletedAt: null, status: ApprovalStatus.PENDING },
        orderBy: [{ createdAt: "asc" }],
        take: 20,
        select: {
          id: true,
          entityType: true,
          entityId: true,
          status: true,
          createdAt: true,
          requester: { select: { id: true, name: true } },
        },
      }),
      prisma.changeRequest.count({ where: { orgId, deletedAt: null, status: ApprovalStatus.APPROVED } }),
      prisma.changeRequest.count({ where: { orgId, deletedAt: null, status: ApprovalStatus.REJECTED } }),
      prisma.changeRequest.count({ where: { orgId, deletedAt: null, status: ApprovalStatus.PENDING, createdAt: { gte: day2 } } }),
      prisma.changeRequest.count({ where: { orgId, deletedAt: null, status: ApprovalStatus.PENDING, createdAt: { gte: day5, lt: day2 } } }),
      prisma.changeRequest.count({ where: { orgId, deletedAt: null, status: ApprovalStatus.PENDING, createdAt: { gte: day10, lt: day5 } } }),
      prisma.changeRequest.count({ where: { orgId, deletedAt: null, status: ApprovalStatus.PENDING, createdAt: { lt: day10 } } }),
    ]);

  return {
    summary: {
      pending: pending.length,
      approved,
      rejected,
    },
    approvalsAging: {
      categories: ["0–2d", "3–5d", "6–10d", "10d+"],
      values: [aging0to2, aging3to5, aging6to10, aging10plus],
    },
    pendingList: pending.map((cr) => ({
      id: String(cr.id),
      entityType: String(cr.entityType),
      entityId: String(cr.entityId),
      status: String(cr.status),
      requestedBy: cr.requester?.name ? String(cr.requester.name) : "—",
      createdAt: cr.createdAt.toISOString(),
      ageDays: Math.floor((now.getTime() - cr.createdAt.getTime()) / 86400000),
    })),
  };
}

export async function getPillarDashboardInsights() {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;

  const pillars = await prisma.entity.findMany({
    where: {
      orgId,
      deletedAt: null,
      orgEntityType: { code: { equals: "pillar", mode: "insensitive" } },
    },
    orderBy: [{ title: "asc" }],
    select: {
      id: true,
      title: true,
      titleAr: true,
      status: true,
      values: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: { achievementValue: true, status: true },
      },
    },
  });

  const totalPillars = pillars.length;
  const achievements = pillars
    .map((p) => p.values?.[0]?.achievementValue)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const avgAchievement = achievements.length > 0
    ? achievements.reduce((a, b) => a + b, 0) / achievements.length
    : null;

  const entityTypes = await prisma.orgEntityType.findMany({
    where: { orgId, code: { in: ["initiative", "kpi"], mode: "insensitive" } },
    select: { id: true, code: true },
  });

  const initiativeTypeId = entityTypes.find((et) => et.code.toLowerCase() === "initiative")?.id;
  const kpiTypeId = entityTypes.find((et) => et.code.toLowerCase() === "kpi")?.id;

  const initiativeCount = initiativeTypeId
    ? await prisma.entity.count({ where: { orgId, deletedAt: null, orgEntityTypeId: initiativeTypeId } })
    : 0;

  const kpiCount = kpiTypeId
    ? await prisma.entity.count({ where: { orgId, deletedAt: null, orgEntityTypeId: kpiTypeId } })
    : 0;

  const pillarHealth = pillars.map((p) => ({
    name: String(p.title),
    nameAr: p.titleAr ? String(p.titleAr) : null,
    count: 1,
    avgAchievement: p.values?.[0]?.achievementValue ?? 0,
  }));

  return {
    summary: {
      totalPillars,
      avgAchievement,
      totalInitiatives: initiativeCount,
      totalKpis: kpiCount,
    },
    pillars: pillars.map((p) => ({
      id: String(p.id),
      name: String(p.title),
      nameAr: p.titleAr ? String(p.titleAr) : null,
      status: String(p.status),
      initiativeCount: 0,
      kpiCount: 0,
      avgAchievement: p.values?.[0]?.achievementValue ?? null,
    })),
    pillarHealth,
    kpiByPillar: pillarHealth,
  };
}

export async function getEntityContextForAiReport(orgId: string, take = 20) {
  const entities = await getKpisWithLatestValue(orgId, take);
  return entities
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
        title: String(k.title),
        unit: k.unit ? String(k.unit) : null,
        target: typeof k.targetValue === "number" ? Number(k.targetValue) : null,
        achievement: typeof achievement === "number" ? Math.round(achievement) : null,
        status: v?.status ? String(v.status) : "NO_DATA",
        direction: k.direction ? String(k.direction) : null,
      };
    })
    .filter((k) => k.achievement !== null)
    .sort((a, b) => (a.achievement ?? 0) - (b.achievement ?? 0));
}
