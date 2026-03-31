import {
  KpiAggregationMethod,
  KpiApprovalLevel,
  KpiApprovalType,
  KpiDirection,
  KpiPeriodType,
  KpiSourceType,
  KpiValueStatus,
  KpiVariableDataType,
  PrismaClient,
  Role,
  Status,
} from "../web/src/generated/prisma-client/index.js";
import { webcrypto } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

// Ensure WebCrypto exists for better-auth password hashing
const g = globalThis as unknown as { crypto?: unknown };
if (!g.crypto) g.crypto = webcrypto as unknown;

type Delegate = {
  deleteMany: (args?: unknown) => Promise<unknown>;
  findFirst: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  createMany: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  upsert: (args: unknown) => Promise<unknown>;
};

const prismaOrgEntityType = (prisma as unknown as { orgEntityType?: Delegate }).orgEntityType;
const prismaEntity = (prisma as unknown as { entity?: Delegate }).entity;
const prismaEntityVariable = (prisma as unknown as { entityVariable?: Delegate }).entityVariable;
const prismaEntityValue = (prisma as unknown as { entityValue?: Delegate }).entityValue;
const prismaEntityVariableValue = (prisma as unknown as { entityVariableValue?: Delegate }).entityVariableValue;
const prismaUserEntityAssignment = (prisma as unknown as { userEntityAssignment?: Delegate }).userEntityAssignment;

type OrgEntityTypeCode = "pillar" | "objective" | "department" | "initiative" | "kpi";

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

// Load data from JSON file instead of hardcoded object
const strategicObjectivesSeed = JSON.parse(
  readFileSync(join(process.cwd(), "kpi_data.json"), "utf-8")
) as StrategicObjectiveMap;

function dateAtStartOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

async function assertEntitySystemReady() {
  if (!prismaOrgEntityType || !prismaEntity || !prismaEntityVariable || !prismaEntityValue || !prismaEntityVariableValue) {
    throw new Error("Prisma client is missing Entity system models. Run: npx prisma generate");
  }

  const tableChecks = (await prisma.$queryRaw`
    SELECT 'org_entity_types' AS name, to_regclass('public.org_entity_types') IS NOT NULL AS exists
    UNION ALL
    SELECT 'entities' AS name, to_regclass('public.entities') IS NOT NULL AS exists
    UNION ALL
    SELECT 'entity_variables' AS name, to_regclass('public.entity_variables') IS NOT NULL AS exists
    UNION ALL
    SELECT 'entity_values' AS name, to_regclass('public.entity_values') IS NOT NULL AS exists
    UNION ALL
    SELECT 'entity_variable_values' AS name, to_regclass('public.entity_variable_values') IS NOT NULL AS exists
  `) as Array<{ name: string; exists: boolean }>;

  const missing = tableChecks.filter((t) => !t.exists).map((t) => t.name);
  if (missing.length) {
    throw new Error(`Missing database tables for Entity system: ${missing.join(", ")}. Run: npx prisma migrate dev (or migrate reset) then npx prisma generate`);
  }
}

function dateAtEndOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function evaluateFormula(input: { formula: string; valuesByCode: Record<string, number> }) {
  const trimmed = input.formula.trim();
  if (!trimmed) return { ok: false as const, error: "emptyFormula" };

  const replaced = trimmed.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (token) => {
    if (Object.prototype.hasOwnProperty.call(input.valuesByCode, token)) {
      return String(input.valuesByCode[token] ?? 0);
    }
    return "0";
  });

  if (!/^[0-9+\-*/().\s]+$/.test(replaced)) {
    return { ok: false as const, error: "unsupportedFormulaCharacters" };
  }

  try {
    const result = Function(`"use strict"; return (${replaced});`)();
    const num = typeof result === "number" && Number.isFinite(result) ? result : NaN;
    if (!Number.isFinite(num)) {
      return { ok: false as const, error: "invalidFormulaResult" };
    }
    return { ok: true as const, value: num };
  } catch {
    return { ok: false as const, error: "failedToEvaluateFormula" };
  }
}

async function wipeDatabase() {
  await prismaEntityVariableValue?.deleteMany();
  await prismaEntityValue?.deleteMany();
  await prismaEntityVariable?.deleteMany();
  await prismaEntity?.deleteMany();

  await prisma.changeApproval.deleteMany();
  await prisma.changeRequest.deleteMany();

  await prisma.userPreference.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  await prismaOrgEntityType?.deleteMany();
  await prisma.organization.deleteMany();
}

async function wipeOrgEntities(orgId: string) {
  await prismaUserEntityAssignment?.deleteMany({ where: { entity: { orgId } } } as never);
  await prismaEntityVariableValue?.deleteMany({ where: { entityValue: { entity: { orgId } } } } as never);
  await prismaEntityValue?.deleteMany({ where: { entity: { orgId } } } as never);
  await prismaEntityVariable?.deleteMany({ where: { entity: { orgId } } } as never);
  await prismaEntity?.deleteMany({ where: { orgId } } as never);
  await prismaOrgEntityType?.deleteMany({ where: { orgId } } as never);
}

async function ensureOrg(input: {
  domain?: string | null;
  name: string;
  nameAr?: string | null;
  kpiApprovalLevel?: KpiApprovalLevel;
  logoUrl?: string | null;
  mission?: string | null;
  missionAr?: string | null;
  vision?: string | null;
  visionAr?: string | null;
  about?: string | null;
  aboutAr?: string | null;
  contacts?: unknown;
}) {
  const existing = (await prisma.organization.findFirst({
    where: {
      deletedAt: null,
      OR: [...(input.domain ? [{ domain: input.domain }] : []), { name: input.name }],
    },
    select: { id: true },
  })) as { id: string } | null;

  const updateData = {
    name: input.name,
    nameAr: typeof input.nameAr === "undefined" ? undefined : input.nameAr ?? null,
    domain: typeof input.domain === "undefined" ? undefined : input.domain,
    kpiApprovalLevel: input.kpiApprovalLevel ?? KpiApprovalLevel.MANAGER,
    logoUrl: typeof input.logoUrl === "undefined" ? undefined : input.logoUrl,
    mission: typeof input.mission === "undefined" ? undefined : input.mission,
    missionAr: typeof input.missionAr === "undefined" ? undefined : input.missionAr,
    vision: typeof input.vision === "undefined" ? undefined : input.vision,
    visionAr: typeof input.visionAr === "undefined" ? undefined : input.visionAr,
    about: typeof input.about === "undefined" ? undefined : input.about,
    aboutAr: typeof input.aboutAr === "undefined" ? undefined : input.aboutAr,
    contacts: typeof input.contacts === "undefined" ? undefined : (input.contacts as any),
  };

  if (existing) {
    return prisma.organization.update({ where: { id: existing.id }, data: updateData, select: { id: true } });
  }

  return prisma.organization.create({
    data: {
      name: input.name,
      nameAr: input.nameAr ?? null,
      domain: typeof input.domain === "undefined" ? null : input.domain,
      kpiApprovalLevel: input.kpiApprovalLevel ?? KpiApprovalLevel.MANAGER,
      logoUrl: input.logoUrl ?? null,
      mission: input.mission ?? null,
      missionAr: input.missionAr ?? null,
      vision: input.vision ?? null,
      visionAr: input.visionAr ?? null,
      about: input.about ?? null,
      aboutAr: input.aboutAr ?? null,
      contacts: (input.contacts as any) ?? null,
    },
    select: { id: true },
  });
}

async function ensureUser(input: {
  orgId: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  managerId?: string | null;
  title?: string | null;
}) {
  const email = String(input.email ?? "").trim().toLowerCase();

  const existingUser = await prisma.user.findFirst({
    where: { orgId: input.orgId, email, deletedAt: null },
    select: { id: true },
  });

  const passwordHash = await hashPassword(String(input.password ?? ""));

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: input.name,
        role: input.role,
        hashedPassword: passwordHash,
        managerId: typeof input.managerId === "undefined" ? undefined : input.managerId,
        title: typeof input.title === "undefined" ? undefined : input.title,
      },
    });

    const credentialAccount = await prisma.account.findFirst({
      where: { userId: existingUser.id, providerId: "credential" },
      select: { id: true },
    });

    if (credentialAccount) {
      await prisma.account.update({
        where: { id: credentialAccount.id },
        data: { password: passwordHash, accountId: existingUser.id },
      });
    } else {
      await prisma.account.create({
        data: {
          userId: existingUser.id,
          providerId: "credential",
          accountId: existingUser.id,
          password: passwordHash,
        },
      });
    }

    return { id: String(existingUser.id) };
  }

  const created = await prisma.user.create({
    data: {
      orgId: input.orgId,
      email,
      emailVerified: false,
      name: input.name,
      role: input.role,
      hashedPassword: passwordHash,
      managerId: typeof input.managerId === "undefined" ? null : input.managerId ?? null,
      title: typeof input.title === "undefined" ? null : input.title ?? null,
    },
    select: { id: true },
  });

  await prisma.account.create({
    data: {
      userId: created.id,
      providerId: "credential",
      accountId: created.id,
      password: passwordHash,
    },
  });

  return { id: String(created.id) };
}

async function ensureOrgEntityTypes(orgId: string) {
  if (!prismaOrgEntityType) throw new Error("Prisma client missing orgEntityType model. Run prisma generate.");

  await prismaOrgEntityType.deleteMany({ where: { orgId } });

  const rows: Array<{ code: OrgEntityTypeCode; name: string; nameAr: string; sortOrder: number }> = [
    { code: "pillar", name: "Pillars", nameAr: "الركائز", sortOrder: 0 },
    { code: "objective", name: "Objectives", nameAr: "الأهداف", sortOrder: 1 },
    { code: "department", name: "Departments", nameAr: "الإدارات", sortOrder: 2 },
    { code: "initiative", name: "Initiatives", nameAr: "المبادرات", sortOrder: 3 },
    { code: "kpi", name: "KPIs", nameAr: "مؤشرات الأداء", sortOrder: 4 },
  ];

  await prismaOrgEntityType.createMany({
    data: rows.map((r) => ({ orgId, ...r })),
    skipDuplicates: true,
  });

  const types = (await prismaOrgEntityType.findMany({ where: { orgId }, select: { id: true, code: true } })) as Array<{
    id: string;
    code: string;
  }>;
  return new Map(types.map((t) => [String(t.code), String(t.id)] as const));
}

async function ensureEntity(input: {
  orgId: string;
  orgEntityTypeId: string;
  key: string;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  ownerUserId?: string | null;
  status?: Status;
  sourceType?: KpiSourceType;
  periodType?: KpiPeriodType | null;
  unit?: string | null;
  unitAr?: string | null;
  direction?: KpiDirection;
  aggregation?: KpiAggregationMethod;
  baselineValue?: number | null;
  targetValue?: number | null;
  weight?: number | null;
  formula?: string | null;
}) {
  if (!prismaEntity) throw new Error("Prisma client missing entity model. Run prisma generate.");

  const existing = (await prismaEntity.findFirst({
    where: { orgId: input.orgId, key: input.key, deletedAt: null },
    select: { id: true },
  })) as { id: string } | null;

  const data = {
    orgId: input.orgId,
    key: input.key,
    orgEntityTypeId: input.orgEntityTypeId,
    title: input.title,
    titleAr: input.titleAr ?? null,
    description: input.description ?? null,
    descriptionAr: input.descriptionAr ?? null,
    ownerUserId: input.ownerUserId ?? null,
    status: input.status ?? Status.ACTIVE,
    sourceType: input.sourceType ?? KpiSourceType.MANUAL,
    periodType: typeof input.periodType === "undefined" ? null : input.periodType,
    unit: input.unit ?? null,
    unitAr: input.unitAr ?? null,
    direction: input.direction ?? KpiDirection.INCREASE_IS_GOOD,
    aggregation: input.aggregation ?? KpiAggregationMethod.LAST_VALUE,
    baselineValue: typeof input.baselineValue === "undefined" ? null : input.baselineValue,
    targetValue: typeof input.targetValue === "undefined" ? null : input.targetValue,
    weight: typeof input.weight === "undefined" ? null : input.weight,
    formula: typeof input.formula === "undefined" ? null : input.formula,
  };

  if (existing) {
    const updated = (await prismaEntity.update({ where: { id: existing.id }, data, select: { id: true } })) as { id: string };
    return { id: String(updated.id) };
  }

  const created = (await prismaEntity.create({ data, select: { id: true } })) as { id: string };
  return { id: String(created.id) };
}

async function ensureEntityVariables(
  entityId: string,
  variables: Array<{ code: string; displayName: string; nameAr?: string | null; dataType: KpiVariableDataType; isRequired?: boolean }>,
) {
  if (!prismaEntityVariable) throw new Error("Prisma client missing entityVariable model. Run prisma generate.");

  for (const v of variables) {
    await prismaEntityVariable.upsert({
      where: { entity_variable_unique: { entityId, code: v.code } },
      update: {
        displayName: v.displayName,
        nameAr: v.nameAr ?? undefined,
        dataType: v.dataType,
        isRequired: v.isRequired ?? false,
      },
      create: {
        entityId,
        code: v.code,
        displayName: v.displayName,
        nameAr: v.nameAr ?? null,
        dataType: v.dataType,
        isRequired: v.isRequired ?? false,
      },
      select: { id: true },
    });
  }

  const rows = (await prismaEntityVariable.findMany({ where: { entityId }, select: { id: true, code: true } })) as Array<{
    id: string;
    code: string;
  }>;
  return new Map(rows.map((r) => [String(r.code), String(r.id)] as const));
}

async function createEntityValueByVariableCodes(input: {
  entityId: string;
  status: KpiValueStatus;
  approvalType?: KpiApprovalType | null;
  note?: string | null;
  enteredBy?: string | null;
  submittedBy?: string | null;
  approvedBy?: string | null;
  formula: string | null;
  variableValues: Record<string, number>;
}) {
  if (!prismaEntityVariable || !prismaEntityValue || !prismaEntityVariableValue) {
    throw new Error("Prisma client missing entity value models. Run prisma generate.");
  }

  const vars = (await prismaEntityVariable.findMany({ where: { entityId: input.entityId }, select: { id: true, code: true } })) as Array<{
    id: string;
    code: string;
  }>;
  const idByCode = new Map(vars.map((v) => [String(v.code), String(v.id)] as const));

  const mapped = Object.entries(input.variableValues).map(([code, value]) => {
    const entityVariableId = idByCode.get(code);
    if (!entityVariableId) throw new Error(`Unknown entity variable code ${code}`);
    return { entityVariableId, value };
  });

  let calculatedValue: number | null = null;
  if (input.formula && input.formula.trim().length > 0) {
    const res = evaluateFormula({ formula: input.formula, valuesByCode: input.variableValues });
    calculatedValue = res.ok ? res.value : null;
  }

  const now = new Date();
  const submittedAt =
    input.status === KpiValueStatus.SUBMITTED || input.status === KpiValueStatus.APPROVED
      ? new Date(now.getTime() - 6 * 60 * 60 * 1000)
      : null;
  const approvedAt = input.status === KpiValueStatus.APPROVED ? new Date(now.getTime() - 2 * 60 * 60 * 1000) : null;

  const entityValue = (await prismaEntityValue.create({
    data: {
      entityId: input.entityId,
      calculatedValue,
      finalValue: calculatedValue,
      status: input.status,
      approvalType: input.approvalType ?? null,
      note: input.note ?? null,
      enteredBy: input.enteredBy ?? null,
      submittedBy: input.submittedBy ?? null,
      approvedBy: input.approvedBy ?? null,
      submittedAt,
      approvedAt,
    },
    select: { id: true },
  })) as { id: string };

  for (const vv of mapped) {
    await prismaEntityVariableValue.create({
      data: { entityValueId: entityValue.id, entityVariableId: vv.entityVariableId, value: vv.value },
      select: { id: true },
    });
  }
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

function dataTypeFromUnit(input: string | undefined): KpiVariableDataType {
  const u = String(input ?? "").toLowerCase();
  if (u.includes("percent") || u.includes("%") || u.includes("٪")) return KpiVariableDataType.PERCENTAGE;
  return KpiVariableDataType.NUMBER;
}

function weightToNumber(input: string | undefined) {
  const raw = String(input ?? "").trim();
  const cleaned = raw.replace(/%/g, "").replace(/٪/g, "").trim();
  const num = Number(cleaned);
  return typeof num === "number" && Number.isFinite(num) ? num : 0;
}

function buildWeightedAvgGetFormula(items: Array<{ key: string; weight: number }>) {
  const normalized = (items ?? [])
    .map((i) => ({ key: String(i.key ?? "").trim(), weight: typeof i.weight === "number" ? i.weight : 0 }))
    .filter((i) => i.key.length > 0 && Number.isFinite(i.weight) && i.weight > 0);
  if (normalized.length === 0) return "0";
  if (normalized.length === 1) return `get("${normalized[0].key}")`;
  const denom = normalized.reduce((sum, i) => sum + i.weight, 0);
  if (!Number.isFinite(denom) || denom <= 0) return "0";
  const numerator = normalized.map((i) => `get("${i.key}") * ${i.weight}`).join(" + ");
  return `((${numerator}) / ${denom})`;
}

function buildAvgGetFormula(keys: string[]) {
  const ks = (keys ?? []).map((k) => String(k ?? "").trim()).filter(Boolean);
  if (ks.length === 0) return "0";
  if (ks.length === 1) return `get("${ks[0]}")`;
  const sum = ks.map((k) => `get("${k}")`).join(" + ");
  return `(${sum}) / ${ks.length}`;
}

async function seed() {
  await assertEntitySystemReady();

  const org = await ensureOrg({
    domain: process.env.SEED_ORG_DOMAIN ?? "almousa.local",
    name: "Musa Bin Abdulaziz Al-Mousa & Sons Real Estate Holding Group",
    nameAr: "مجموعة موسى بن عبدالعزيز الموسى وأولاده العقارية القابضة",
    kpiApprovalLevel: KpiApprovalLevel.MANAGER,
    mission: "To invest in vital sectors with economic impact to create sustainable value.",
    missionAr: "نستثمر في القطاعات الحيوية ذات الأثر الاقتصادي لخلق قيمة مستدامة.",
    vision: "An ambitious investment group building sustainable growth.",
    visionAr: "مجموعة استثمارية طموحة تبني استدامة النمو.",
    about: "Seeded strategy data for the new Entity system.",
    aboutAr: "بيانات تجريبية لاستراتيجية مجموعة موسى الموسى (نظام الكيانات).",
    contacts: {
      email: "info@almousa.local",
      phone: "+966110000000",
      website: "https://almousaholding.com",
    },
  });

  await wipeOrgEntities(org.id);

  const password = process.env.SEED_DEFAULT_PASSWORD ?? "password123";

  const superAdminEmail = process.env.SEED_SUPERADMIN_EMAIL ?? "superadmin@almousa.local";
  const superAdminName = process.env.SEED_SUPERADMIN_NAME ?? "Super Admin";
  const superAdminPassword = process.env.SEED_SUPERADMIN_PASSWORD ?? password;

  const superAdmin = await ensureUser({
    orgId: org.id,
    email: superAdminEmail,
    password: superAdminPassword,
    name: superAdminName,
    role: Role.SUPER_ADMIN,
    title: "Super Admin",
  });

  const ceo = await ensureUser({
    orgId: org.id,
    email: "ceo@almousa.local",
    password,
    name: "الرئيس التنفيذي للمجموعة",
    role: Role.EXECUTIVE,
    title: "CEO",
  });

  const admin = await ensureUser({
    orgId: org.id,
    email: "admin@almousa.local",
    password,
    name: "مسؤول النظام",
    role: Role.ADMIN,
    managerId: ceo.id,
    title: "Admin",
  });

  const headStrategy = await ensureUser({
    orgId: org.id,
    email: "strategy@almousa.local",
    password,
    name: "مدير الاستراتيجية والتميز المؤسسي",
    role: Role.MANAGER,
    managerId: ceo.id,
    title: "Head of Strategy",
  });

  const headFinance = await ensureUser({
    orgId: org.id,
    email: "finance@almousa.local",
    password,
    name: "مدير القطاع المالي",
    role: Role.EXECUTIVE,
    managerId: ceo.id,
    title: "CFO",
  });

  const headIt = await ensureUser({
    orgId: org.id,
    email: "it@almousa.local",
    password,
    name: "مدير تقنية المعلومات والبيانات",
    role: Role.MANAGER,
    managerId: ceo.id,
    title: "IT Director",
  });

  const headHr = await ensureUser({
    orgId: org.id,
    email: "hr@almousa.local",
    password,
    name: "مدير الموارد البشرية والخدمات العامة",
    role: Role.MANAGER,
    managerId: ceo.id,
    title: "HR Director",
  });

  const headMarketing = await ensureUser({
    orgId: org.id,
    email: "marketing@almousa.local",
    password,
    name: "مدير التسويق والاتصال المؤسسي",
    role: Role.MANAGER,
    managerId: ceo.id,
    title: "Marketing Director",
  });

  const headAudit = await ensureUser({
    orgId: org.id,
    email: "audit@almousa.local",
    password,
    name: "مدير المراجعة الداخلية والمخاطر",
    role: Role.MANAGER,
    managerId: ceo.id,
    title: "Head of Audit",
  });

  const headInvestment = await ensureUser({
    orgId: org.id,
    email: "investment@almousa.local",
    password,
    name: "مدير الاستثمار",
    role: Role.MANAGER,
    managerId: ceo.id,
    title: "Head of Investment",
  });

  const headLegal = await ensureUser({
    orgId: org.id,
    email: "legal@almousa.local",
    password,
    name: "مدير الإدارة القانونية",
    role: Role.MANAGER,
    managerId: ceo.id,
    title: "Legal Director",
  });

  const entityTypeIdByCode = await ensureOrgEntityTypes(org.id);
  const getTypeId = (code: OrgEntityTypeCode) => {
    const id = entityTypeIdByCode.get(code);
    if (!id) throw new Error(`Missing org entity type ${code}`);
    return id;
  };

  const deptTypeId = getTypeId("department");
  const objectiveTypeId = getTypeId("objective");
  const initiativeTypeId = getTypeId("initiative");
  const kpiTypeId = getTypeId("kpi");
  const pillarTypeId = getTypeId("pillar");

  // Define Departments and their Heads
  const deptMap: Record<string, { code: string; title: string; titleAr: string; headId: string }> = {
    investment: {
      code: "dept_investment",
      title: "Investment Department",
      titleAr: "إدارة الاستثمار",
      headId: headInvestment.id,
    },
    finance: {
      code: "dept_finance",
      title: "Finance Department",
      titleAr: "الإدارة المالية",
      headId: headFinance.id,
    },
    hr: {
      code: "dept_hr",
      title: "HR & Support Services",
      titleAr: "إدارة الموارد البشرية والخدمات المساندة",
      headId: headHr.id,
    },
    marketing: {
      code: "dept_marketing",
      title: "Communications Department",
      titleAr: "إدارة التواصل المؤسسي",
      headId: headMarketing.id,
    },
    audit: {
      code: "dept_audit",
      title: "Internal Audit Department",
      titleAr: "إدارة المراجعة الداخلية",
      headId: headAudit.id,
    },
    legal: {
      code: "dept_legal",
      title: "Legal Department",
      titleAr: "الإدارة القانونية",
      headId: headLegal.id,
    },
    strategy: {
      code: "dept_strategy",
      title: "Strategy Department",
      titleAr: "إدارة الاستراتيجية",
      headId: headStrategy.id,
    },
  };

  // Ensure Departments Exist
  const deptIdByCode = new Map<string, string>();
  for (const [key, cfg] of Object.entries(deptMap)) {
    const dept = await ensureEntity({
      orgId: org.id,
      orgEntityTypeId: deptTypeId,
      key: cfg.code,
      title: cfg.title,
      titleAr: cfg.titleAr,
      ownerUserId: cfg.headId,
      status: Status.ACTIVE,
      sourceType: KpiSourceType.DERIVED,
      periodType: KpiPeriodType.YEARLY,
      unit: "score",
      unitAr: "score",
      formula: "0", // Will update later if needed
    });
    deptIdByCode.set(key, dept.id);
  }

  // Helper to determine Department from KPI Name or Goal ID
  function getDeptCode(goalId: number, kpiName: string): string {
    const n = kpiName.toLowerCase();
    if (n.includes("مراجعة داخلية")) return "audit";
    if (n.includes("قانونية")) return "legal";
    if (n.includes("خدمات مساندة")) return "hr";
    if (n.includes("حوكمة")) return "strategy"; // Assign Governance to Strategy for now
    if (n.includes("استراتيجية")) return "strategy";
    
    if (goalId >= 1 && goalId <= 3) return "investment";
    if (goalId === 4) return "finance";
    if (goalId === 6) return "hr";
    if (goalId === 7) return "marketing";
    
    return "strategy"; // Default
  }

  const deptKpiKeyByName = new Map<string, string>();
  const deptKpiKeysByDept = new Map<string, string[]>();

  // First Pass: Create Department KPIs
  let kpiCounter = 0;
  for (const obj of strategicObjectivesSeed.strategic_objectives_map) {
    for (const skpi of obj.strategic_kpis) {
      for (const dkpi of skpi.formula_avg_KPIs ?? []) {
        const name = String(dkpi.department_kpi_name ?? "").trim();
        if (!name) continue;
        if (deptKpiKeyByName.has(name)) continue;

        kpiCounter++;
        const key = `kpi_${kpiCounter.toString().padStart(4, "0")}`;
        deptKpiKeyByName.set(name, key);

        const deptCode = getDeptCode(obj.goal_id, name);
        const deptCfg = deptMap[deptCode];

        const periodType = periodTypeFromFrequency(dkpi.frequency);
        const variableDataType = dataTypeFromUnit(dkpi.unit);

        const deptKpi = await ensureEntity({
          orgId: org.id,
          orgEntityTypeId: kpiTypeId,
          key,
          title: `Dept KPI ${kpiCounter}`,
          titleAr: name,
          ownerUserId: deptCfg ? deptCfg.headId : headStrategy.id,
          status: Status.ACTIVE,
          sourceType: KpiSourceType.CALCULATED,
          periodType,
          unit: dkpi.unit ?? null,
          unitAr: dkpi.unit ?? null,
          direction: KpiDirection.INCREASE_IS_GOOD,
          aggregation: KpiAggregationMethod.LAST_VALUE,
          formula: "value",
        });

        await ensureEntityVariables(deptKpi.id, [
          {
            code: "value",
            displayName: "Value",
            nameAr: "القيمة",
            dataType: variableDataType,
            isRequired: true,
          },
        ]);

        await createEntityValueByVariableCodes({
          entityId: deptKpi.id,
          status: KpiValueStatus.APPROVED,
          approvalType: KpiApprovalType.MANUAL,
          note: "Seeded (approved).",
          enteredBy: superAdmin.id,
          submittedBy: superAdmin.id,
          approvedBy: ceo.id,
          formula: "value",
          variableValues: { value: 0 }, // Initial value 0
        });

        // Add this KPI key to the Department's list purely for formula building if we wanted to average then
        if (!deptKpiKeysByDept.has(deptCode)) {
          deptKpiKeysByDept.set(deptCode, []);
        }
        deptKpiKeysByDept.get(deptCode)?.push(key);
      }
    }
  }

  // Update Department Entity Formulas (Average of its KPIs)
  for (const [code, keys] of deptKpiKeysByDept) {
    const deptId = deptIdByCode.get(code);
    if (!deptId) continue;
    const formula = buildAvgGetFormula(keys);
    // We update the existing Department Entity with the formula
    await prismaEntity?.update({
      where: { id: deptId },
      data: { formula },
    });
  }

  // Second Pass: Create Strategic Objectives and KPIs
  for (const obj of strategicObjectivesSeed.strategic_objectives_map) {
    const objectiveKpiKeys: string[] = [];

    for (const okpi of obj.strategic_kpis) {
      const links = (okpi.formula_avg_KPIs ?? [])
        .map((l) => {
          const deptKey = deptKpiKeyByName.get(String(l.department_kpi_name ?? "").trim());
          return {
            deptKey,
            weight: weightToNumber(l.weight),
            unit: l.unit,
            frequency: l.frequency,
          };
        })
        .filter((x) => typeof x.deptKey === "string" && x.deptKey.length > 0);

      const periodType = periodTypeFromFrequency(links[0]?.frequency);
      const unit = links[0]?.unit ?? null;

      const formula =
        links.length === 0
          ? "0" // No linked dept KPIs -> 0
          : buildWeightedAvgGetFormula(links.map((l) => ({ key: l.deptKey as string, weight: l.weight })));

      const strategicKpiTitleEn = `Strategic KPI ${String(okpi.id)}`;

      await ensureEntity({
        orgId: org.id,
        orgEntityTypeId: kpiTypeId,
        key: okpi.id,
        title: strategicKpiTitleEn,
        titleAr: okpi.title,
        ownerUserId: headStrategy.id,
        status: Status.ACTIVE,
        sourceType: KpiSourceType.DERIVED,
        periodType,
        unit,
        unitAr: unit,
        direction: KpiDirection.INCREASE_IS_GOOD,
        aggregation: KpiAggregationMethod.LAST_VALUE,
        formula,
      });

      objectiveKpiKeys.push(okpi.id);
    }

    await ensureEntity({
      orgId: org.id,
      orgEntityTypeId: objectiveTypeId,
      key: String(obj.goal_id),
      title: `Strategic Objective ${String(obj.goal_id)}`,
      titleAr: obj.goal_title,
      ownerUserId: headStrategy.id,
      status: Status.ACTIVE,
      sourceType: KpiSourceType.DERIVED,
      periodType: KpiPeriodType.YEARLY,
      unit: "score",
      unitAr: "score",
      formula: buildAvgGetFormula(objectiveKpiKeys),
    });
  }

  console.log("Seed complete. You can login with:");
  console.log("- superadmin:", superAdminEmail);
  console.log("- admin:", "admin@almousa.local");
  console.log("- legal:", "legal@almousa.local");
  console.log("Password:", password);
}

async function main() {
  try {
    await seed();
  } finally {
    await prisma.$disconnect();
  }
}

main();
