import {
  PrismaClient,
  KpiAggregationMethod,
  KpiDirection,
  KpiPeriodType,
  KpiSourceType,
  Role,
  Status,
} from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { webcrypto } from "node:crypto";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const g = globalThis as unknown as { crypto?: unknown };
if (!g.crypto) g.crypto = webcrypto as unknown;

type StrategicObjectiveMap = {
  strategic_objectives_map: Array<{
    goal_id: number;
    goal_title: string;
    strategic_kpis: Array<{
      id: string;
      title: string;
      formula_avg_KPIs: Array<{
        department_kpi_name: string;
        weight: string;
        unit?: string;
        frequency?: string;
        page_source?: number;
      }>;
    }>;
  }>;
};

type Snapshot = {
  timestamp: string;
  version: string;
  data: {
    organization: any;
    orgEntityTypes: any[];
    users: any[];
    entities: Array<any & { variables?: Array<any & { values?: any[] }>; values?: any[] }>;
  };
};

function readJson<T>(filePath: string): T {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(abs, "utf8")) as T;
}

function resolvePath(filePath: string) {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function fileExists(filePath: string) {
  return fs.existsSync(resolvePath(filePath));
}

function stripDates<T extends Record<string, any>>(obj: T) {
  const copy: Record<string, any> = { ...obj };
  delete copy.createdAt;
  delete copy.updatedAt;
  delete copy.deletedAt;
  delete copy.password;
  delete copy.periodStart;
  delete copy.periodEnd;
  delete copy.period_start;
  delete copy.period_end;
  return copy;
}

async function wipeOrg(orgId: string) {
  await prisma.entityVariableValue.deleteMany({ where: { entityValue: { entity: { orgId } } } });
  await prisma.entityValue.deleteMany({ where: { entity: { orgId } } });
  await prisma.entityVariable.deleteMany({ where: { entity: { orgId } } });
  await prisma.userEntityAssignment.deleteMany({ where: { entity: { orgId } } });
  await prisma.entity.deleteMany({ where: { orgId } });

  await prisma.changeApproval.deleteMany({ where: { changeRequest: { orgId } } });
  await prisma.changeRequest.deleteMany({ where: { orgId } });

  await prisma.userPreference.deleteMany({ where: { user: { orgId } } });
  await prisma.session.deleteMany({ where: { user: { orgId } } });
  await prisma.account.deleteMany({ where: { user: { orgId } } });

  await prisma.user.deleteMany({ where: { orgId } });
  await prisma.orgEntityType.deleteMany({ where: { orgId } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
}

async function restoreBaseSnapshotLite(input: { snapshotFile: string; domainOverride?: string }) {
  const snapshot = readJson<Snapshot>(input.snapshotFile);
  const domain = input.domainOverride ?? snapshot.data.organization?.domain ?? "almousa.local";

  const existing = await prisma.organization.findFirst({ where: { domain, deletedAt: null }, select: { id: true } });
  if (existing) {
    await wipeOrg(existing.id);
  }

  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
  const passwordHash = await hashPassword(defaultPassword);

  const orgInput = stripDates(snapshot.data.organization);
  orgInput.domain = domain;
  await prisma.organization.create({ data: orgInput as any });

  for (const t of snapshot.data.orgEntityTypes ?? []) {
    const typeInput = stripDates(t);
    await prisma.orgEntityType.create({ data: typeInput as any });
  }

  for (const u of snapshot.data.users ?? []) {
    const userInput = stripDates(u);
    userInput.hashedPassword = passwordHash;
    await prisma.user.create({ data: userInput as any });

    await prisma.account.create({
      data: {
        userId: userInput.id,
        providerId: "credential",
        accountId: userInput.id,
        password: passwordHash,
      },
    });
  }

  return { orgId: String(snapshot.data.organization.id), domain };
}

function periodTypeFromFrequency(input: string | undefined): KpiPeriodType {
  const f = String(input ?? "").trim().toLowerCase();
  const fa = String(input ?? "").trim();
  if (f === "monthly") return KpiPeriodType.MONTHLY;
  if (f === "quarterly") return KpiPeriodType.QUARTERLY;
  if (f === "yearly" || f === "annual") return KpiPeriodType.YEARLY;
  if (fa.includes("شهري")) return KpiPeriodType.MONTHLY;
  if (fa.includes("ربع")) return KpiPeriodType.QUARTERLY;
  if (fa.includes("سنوي") || fa.includes("سنويا") || fa.includes("سنوية")) return KpiPeriodType.YEARLY;
  return KpiPeriodType.YEARLY;
}

function buildAvgGetFormula(keys: string[]) {
  const ks = (keys ?? []).map((k) => String(k ?? "").trim()).filter(Boolean);
  if (ks.length === 0) return "0";
  if (ks.length === 1) return `get(\"${ks[0]}\")`;
  const sum = ks.map((k) => `get(\"${k}\")`).join(" + ");
  return `(${sum}) / ${ks.length}`;
}

async function findUserIdByEmail(orgId: string, email: string) {
  const row = await prisma.user.findFirst({ where: { orgId, email: email.toLowerCase(), deletedAt: null }, select: { id: true } });
  return row?.id ?? null;
}

async function ensureEntityByKey(input: {
  orgId: string;
  key: string;
  orgEntityTypeId: string;
  title: string;
  titleAr?: string | null;
  ownerUserId?: string | null;
  status?: Status;
  sourceType?: KpiSourceType;
  periodType?: KpiPeriodType | null;
  unit?: string | null;
  unitAr?: string | null;
  direction?: KpiDirection;
  aggregation?: KpiAggregationMethod;
  formula?: string | null;
}) {
  const existing = await prisma.entity.findFirst({ where: { orgId: input.orgId, key: input.key, deletedAt: null }, select: { id: true } });

  const data = {
    orgId: input.orgId,
    key: input.key,
    orgEntityTypeId: input.orgEntityTypeId,
    title: input.title,
    titleAr: typeof input.titleAr === "undefined" ? null : input.titleAr,
    ownerUserId: input.ownerUserId ?? null,
    status: input.status ?? Status.ACTIVE,
    sourceType: input.sourceType ?? KpiSourceType.DERIVED,
    periodType: typeof input.periodType === "undefined" ? null : input.periodType,
    unit: typeof input.unit === "undefined" ? null : input.unit,
    unitAr: typeof input.unitAr === "undefined" ? null : input.unitAr,
    direction: input.direction ?? KpiDirection.INCREASE_IS_GOOD,
    aggregation: input.aggregation ?? KpiAggregationMethod.LAST_VALUE,
    formula: typeof input.formula === "undefined" ? null : input.formula,
  };

  if (existing) {
    const updated = await prisma.entity.update({ where: { id: existing.id }, data, select: { id: true } });
    return { id: updated.id };
  }

  const created = await prisma.entity.create({ data, select: { id: true } });
  return { id: created.id };
}

async function ensureSuperAdminExists(input: { orgId: string }) {
  const email = (process.env.SEED_SUPERADMIN_EMAIL ?? "superadmin@almousa.local").toLowerCase();
  const existing = await prisma.user.findFirst({ where: { orgId: input.orgId, email, deletedAt: null }, select: { id: true } });
  if (existing) return;

  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
  const passwordHash = await hashPassword(defaultPassword);

  const created = await prisma.user.create({
    data: {
      orgId: input.orgId,
      email,
      emailVerified: false,
      name: process.env.SEED_SUPERADMIN_NAME ?? "Super Admin",
      role: Role.SUPER_ADMIN,
      managerId: null,
      title: "Super Admin",
      hashedPassword: passwordHash,
    },
    select: { id: true },
  });

  await prisma.account.create({
    data: { userId: created.id, providerId: "credential", accountId: created.id, password: passwordHash },
  });
}

async function seedStrategicOnly(input: { orgId: string }) {
  const kpiDataFile = process.env.KPI_DATA_FILE ?? "kpi_data.json";

  const types = await prisma.orgEntityType.findMany({ where: { orgId: input.orgId }, select: { id: true, code: true } });
  const typeIdByCode = new Map(types.map((t) => [String(t.code), String(t.id)] as const));
  const objectiveTypeId = typeIdByCode.get("objective");
  const kpiTypeId = typeIdByCode.get("kpi");

  if (!objectiveTypeId || !kpiTypeId) {
    throw new Error("Missing required org entity types in base snapshot (objective/kpi)");
  }

  const strategyOwnerId =
    (await findUserIdByEmail(input.orgId, "strategy@almousa.local")) ??
    (await findUserIdByEmail(input.orgId, "admin@almousa.local")) ??
    (await findUserIdByEmail(input.orgId, "superadmin@almousa.local"));

  if (!strategyOwnerId) {
    throw new Error("Cannot resolve owner user (strategy/admin/superadmin)");
  }

  if (fileExists(kpiDataFile)) {
    const kpiData = readJson<StrategicObjectiveMap>(kpiDataFile);

    for (const obj of kpiData.strategic_objectives_map) {
      const objectiveKpiKeys: string[] = [];

      for (const okpi of obj.strategic_kpis) {
        const first = okpi.formula_avg_KPIs?.[0];
        const periodType = periodTypeFromFrequency(first?.frequency);
        const unit = first?.unit ?? null;

        await ensureEntityByKey({
          orgId: input.orgId,
          orgEntityTypeId: kpiTypeId,
          key: okpi.id,
          title: `Strategic KPI ${String(okpi.id)}`,
          titleAr: okpi.title,
          ownerUserId: strategyOwnerId,
          status: Status.ACTIVE,
          sourceType: KpiSourceType.DERIVED,
          periodType,
          unit,
          unitAr: unit,
          direction: KpiDirection.INCREASE_IS_GOOD,
          aggregation: KpiAggregationMethod.LAST_VALUE,
          formula: "0",
        });

        objectiveKpiKeys.push(okpi.id);
      }

      await ensureEntityByKey({
        orgId: input.orgId,
        orgEntityTypeId: objectiveTypeId,
        key: String(obj.goal_id),
        title: `Strategic Objective ${String(obj.goal_id)}`,
        titleAr: obj.goal_title,
        ownerUserId: strategyOwnerId,
        status: Status.ACTIVE,
        sourceType: KpiSourceType.DERIVED,
        periodType: KpiPeriodType.YEARLY,
        unit: "score",
        unitAr: "score",
        direction: KpiDirection.INCREASE_IS_GOOD,
        aggregation: KpiAggregationMethod.LAST_VALUE,
        formula: buildAvgGetFormula(objectiveKpiKeys),
      });
    }

    return;
  }

  const goalsFile = process.env.GOALS_FILE ?? "web/src/content/seed/goals.json";
  const kpisFile = process.env.KPIS_FILE ?? "web/src/content/seed/kpis.json";

  if (!fileExists(goalsFile) || !fileExists(kpisFile)) {
    throw new Error(
      `Missing KPI seed files. Looked for legacy: ${resolvePath(kpiDataFile)} and fallback: ${resolvePath(goalsFile)} / ${resolvePath(kpisFile)}`
    );
  }

  const goals = readJson<
    Array<{ id: string; title: string; titleAr: string; status?: string | null }>
  >(goalsFile);

  const kpis = readJson<
    Array<{ id: string; goalId: string; name: string; nameAr: string; unit?: string; frequency?: string }>
  >(kpisFile);

  for (const goal of goals) {
    const goalKpis = kpis.filter((k) => String(k.goalId) === String(goal.id));
    const objectiveKpiKeys = goalKpis.map((k) => k.id);

    for (const kpi of goalKpis) {
      const periodType = periodTypeFromFrequency(kpi.frequency);
      const unit = kpi.unit ?? null;

      await ensureEntityByKey({
        orgId: input.orgId,
        orgEntityTypeId: kpiTypeId,
        key: kpi.id,
        title: kpi.name,
        titleAr: kpi.nameAr,
        ownerUserId: strategyOwnerId,
        status: Status.ACTIVE,
        sourceType: KpiSourceType.DERIVED,
        periodType,
        unit,
        unitAr: unit,
        direction: KpiDirection.INCREASE_IS_GOOD,
        aggregation: KpiAggregationMethod.LAST_VALUE,
        formula: "0",
      });
    }

    await ensureEntityByKey({
      orgId: input.orgId,
      orgEntityTypeId: objectiveTypeId,
      key: goal.id,
      title: goal.title,
      titleAr: goal.titleAr,
      ownerUserId: strategyOwnerId,
      status: Status.ACTIVE,
      sourceType: KpiSourceType.DERIVED,
      periodType: KpiPeriodType.YEARLY,
      unit: "score",
      unitAr: "score",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      formula: buildAvgGetFormula(objectiveKpiKeys),
    });
  }
}

async function main() {
  const baseSnapshotFile =
    process.env.BASE_SNAPSHOT_FILE ?? "data/backups/seed_snapshot_almousa_local_2026-01-19T23-06-39.json";
  const domainOverride = process.env.SEED_ORG_DOMAIN;

  const snapshot = readJson<Snapshot>(baseSnapshotFile);
  const orgId = String(snapshot.data.organization.id);

  await restoreBaseSnapshotLite({ snapshotFile: baseSnapshotFile, domainOverride });
  await ensureSuperAdminExists({ orgId });
  await seedStrategicOnly({ orgId });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
