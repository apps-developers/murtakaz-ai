import {
  PrismaClient,
  KpiAggregationMethod,
  KpiDirection,
  KpiIndicatorType,
  KpiPeriodType,
  KpiSourceType,
  KpiApprovalLevel,
  KpiApprovalType,
  KpiValueStatus,
  NotificationType,
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

type PillarData = {
  pillar_objective_mapping: Array<{
    pillar_id: number;
    pillar_name_ar: string;
    pillar_name_en: string;
    associated_strategic_goals: string[];
  }>;
};

type ObjectiveData = {
  strategic_goals: Array<{
    goal_id: string;
    title_ar: string;
    title_en: string;
    goal_weight_overall: string;
    formula: string;
    formula_description: string;
    indicators: Array<{
      code: string;
      kpi_code: string;
      name_ar: string;
      name_en: string;
      weight: string;
      formula: string;
      formula_description: string;
    }>;
  }>;
};

type InitiativeData = {
  initiatives_mapping: Array<{
    initiative_id: string;
    initiative_code: string;
    initiative_name_ar: string;
    initiative_name_en: string;
    linked_strategic_goals: string[];
    formula: string;
    formula_description: string;
    kpis: Array<{
      type: "operational" | "linked";
      kpi_code: string;
      value?: string;
      id?: string;
    }>;
  }>;
};

type DepartmentData = {
  sector_info: {
    name_ar: string;
    name_en: string;
  };
  formula: string;
  formula_description: string;
  indicators: Array<{
    kpi_code: string;
    measurement_indicator: string;
    measurement_indicator_en: string;
    classification?: string;
    classification_en?: string;
    weight: string;
    frequency: string;
    unit: string;
    unit_en: string;
  }>;
};

function readJson<T>(filePath: string): T {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(abs, "utf8")) as T;
}

function periodTypeFromFrequency(input: string | undefined): KpiPeriodType {
  const f = String(input ?? "").trim().toLowerCase();
  const fa = String(input ?? "").trim();
  if (f === "monthly") return KpiPeriodType.MONTHLY;
  if (f === "quarterly") return KpiPeriodType.QUARTERLY;
  if (f === "yearly" || f === "annual") return KpiPeriodType.YEARLY;
  if (fa.includes("شهري")) return KpiPeriodType.MONTHLY;
  if (fa.includes("ربع")) return KpiPeriodType.QUARTERLY;
  // "نصف سنوي / سنوي", "نصف سنوي/سنوي", "سنوي", "سنوية", etc.
  if (fa.includes("سنوي") || fa.includes("سنويا") || fa.includes("سنوية") || fa.includes("نصف")) return KpiPeriodType.YEARLY;
  return KpiPeriodType.YEARLY;
}

// Infer direction: KPIs where a lower value is better (errors, risks, delays, violations, non-compliance...)
const DECREASE_IS_GOOD_KEYWORDS = [
  "unapproved", "delayed", "high-risk", "non-compliance", "unimplemented",
  "missed", "violation", "error", "average response time", "غير المعتمدة",
  "المتأخرة", "المخاطر عالية", "عدم الالتزام", "المخالفات", "وقت الاستجابة",
  "غير المنفذة", "الفائتة",
];

function inferDirection(name_en: string, name_ar: string): KpiDirection {
  const combined = (name_en + " " + name_ar).toLowerCase();
  for (const kw of DECREASE_IS_GOOD_KEYWORDS) {
    if (combined.includes(kw.toLowerCase())) return KpiDirection.DECREASE_IS_GOOD;
  }
  return KpiDirection.INCREASE_IS_GOOD;
}

// Infer indicator type:
// - Strategic dept KPIs and objective KPIs → LAGGING (measure outcomes)
// - Operational dept KPIs and initiative KPIs → LEADING (drive/predict)
function inferIndicatorType(classification_en?: string, entityClass?: "objective" | "initiative" | "department_strategic" | "department_operational"): KpiIndicatorType {
  if (entityClass === "initiative") return KpiIndicatorType.LEADING;
  if (entityClass === "objective") return KpiIndicatorType.LAGGING;
  if (classification_en?.toLowerCase() === "strategic") return KpiIndicatorType.LAGGING;
  if (classification_en?.toLowerCase() === "operational") return KpiIndicatorType.LEADING;
  return KpiIndicatorType.LAGGING;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  return d;
}

function weightToNumber(input: string | undefined | number): number {
  if (typeof input === "number") return input;
  const raw = String(input ?? "").trim();
  const cleaned = raw.replace(/%/g, "").replace(/٪/g, "").trim();
  const num = Number(cleaned);
  return typeof num === "number" && Number.isFinite(num) ? num / 100 : 0;
}

function convertFormulaToGetSyntax(formula: string): string {
  if (!formula || typeof formula !== "string") return formula;
  
  // Pattern to match potential entity keys (alphanumeric + underscores)
  // Should NOT match numbers, operators, or parentheses
  const keyPattern = /\b([a-z_][a-z0-9_]*)\b/gi;
  
  // Reserved words that should NOT be wrapped in get()
  const reserved = new Set(["return", "const", "let", "var", "function", "get", "vars"]);
  
  return formula.replace(keyPattern, (match) => {
    const lower = match.toLowerCase();
    // Don't wrap if it's a reserved word or already a number
    if (reserved.has(lower) || /^\d+$/.test(match)) {
      return match;
    }
    // If it looks like an entity key (contains underscore or ends with kpi), wrap it
    if (match.includes("_") || lower.includes("kpi") || lower.includes("dept") || lower.includes("objective") || lower.includes("initiative") || lower.includes("pillar")) {
      return `get("${match}")`;
    }
    return match;
  });
}

async function wipeOrgEntities(orgId: string) {
  console.log("  🗑️  Wiping existing org entities...");
  await prisma.$executeRaw`DELETE FROM entity_attachments WHERE entity_id IN (SELECT id FROM entities WHERE org_id = ${orgId})`;
  await prisma.$executeRaw`DELETE FROM entity_variable_values WHERE entity_value_id IN (SELECT id FROM entity_values WHERE entity_id IN (SELECT id FROM entities WHERE org_id = ${orgId}))`;
  await prisma.$executeRaw`DELETE FROM entity_values WHERE entity_id IN (SELECT id FROM entities WHERE org_id = ${orgId})`;
  await prisma.$executeRaw`DELETE FROM entity_variables WHERE entity_id IN (SELECT id FROM entities WHERE org_id = ${orgId})`;
  await prisma.$executeRaw`DELETE FROM user_entity_assignments WHERE entity_id IN (SELECT id FROM entities WHERE org_id = ${orgId})`;
  await prisma.entity.deleteMany({ where: { orgId } });
  await prisma.orgEntityType.deleteMany({ where: { orgId } });
  console.log("  ✅ Org entities wiped.");
}

async function ensureOrg(input: {
  domain: string;
  name: string;
  nameAr?: string | null;
  kpiApprovalLevel?: KpiApprovalLevel;
  mission?: string | null;
  missionAr?: string | null;
  vision?: string | null;
  visionAr?: string | null;
  about?: string | null;
  aboutAr?: string | null;
}) {
  const existing = await prisma.organization.findFirst({
    where: { domain: input.domain, deletedAt: null },
    select: { id: true },
  });

  const data = {
    name: input.name,
    nameAr: input.nameAr ?? null,
    domain: input.domain,
    kpiApprovalLevel: input.kpiApprovalLevel ?? KpiApprovalLevel.MANAGER,
    mission: input.mission ?? null,
    missionAr: input.missionAr ?? null,
    vision: input.vision ?? null,
    visionAr: input.visionAr ?? null,
    about: input.about ?? null,
    aboutAr: input.aboutAr ?? null,
  };

  if (existing) {
    return prisma.organization.update({ where: { id: existing.id }, data, select: { id: true } });
  }

  return prisma.organization.create({ data, select: { id: true } });
}

async function ensureUser(input: {
  orgId: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  title?: string | null;
}) {
  const email = String(input.email ?? "").trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { orgId: input.orgId, email, deletedAt: null },
    select: { id: true },
  });

  const passwordHash = await hashPassword(String(input.password ?? ""));

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name: input.name, role: input.role, hashedPassword: passwordHash, title: input.title },
    });

    const credentialAccount = await prisma.account.findFirst({
      where: { userId: existing.id, providerId: "credential" },
      select: { id: true },
    });

    if (credentialAccount) {
      await prisma.account.update({
        where: { id: credentialAccount.id },
        data: { password: passwordHash, accountId: existing.id },
      });
    } else {
      await prisma.account.create({
        data: { userId: existing.id, providerId: "credential", accountId: existing.id, password: passwordHash },
      });
    }

    return { id: existing.id };
  }

  const created = await prisma.user.create({
    data: {
      orgId: input.orgId,
      email,
      emailVerified: false,
      name: input.name,
      role: input.role,
      hashedPassword: passwordHash,
      title: input.title ?? null,
    },
    select: { id: true },
  });

  await prisma.account.create({
    data: { userId: created.id, providerId: "credential", accountId: created.id, password: passwordHash },
  });

  return { id: created.id };
}

async function ensureOrgEntityTypes(orgId: string) {
  await prisma.orgEntityType.deleteMany({ where: { orgId } });

  const rows = [
    { code: "pillar", name: "Pillars", nameAr: "الركائز", sortOrder: 0 },
    { code: "objective", name: "Objectives", nameAr: "الأهداف", sortOrder: 1 },
    { code: "department", name: "Departments", nameAr: "الإدارات", sortOrder: 2 },
    { code: "initiative", name: "Initiatives", nameAr: "المبادرات", sortOrder: 3 },
    { code: "kpi", name: "KPIs", nameAr: "مؤشرات الأداء", sortOrder: 4 },
  ];

  await prisma.orgEntityType.createMany({ data: rows.map((r) => ({ orgId, ...r })) });

  const types = await prisma.orgEntityType.findMany({ where: { orgId }, select: { id: true, code: true } });
  return new Map(types.map((t) => [String(t.code), String(t.id)]));
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
  indicatorType?: KpiIndicatorType | null;
  aggregation?: KpiAggregationMethod;
  targetValue?: number | null;
  weight?: number | null;
  formula?: string | null;
}) {
  const existing = await prisma.entity.findFirst({
    where: { orgId: input.orgId, key: input.key, deletedAt: null },
    select: { id: true },
  });

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
    periodType: input.periodType ?? null,
    unit: input.unit ?? null,
    unitAr: input.unitAr ?? null,
    direction: input.direction ?? KpiDirection.INCREASE_IS_GOOD,
    indicatorType: input.indicatorType ?? null,
    aggregation: input.aggregation ?? KpiAggregationMethod.LAST_VALUE,
    targetValue: input.targetValue ?? null,
    weight: input.weight ?? null,
    formula: input.formula ?? null,
  };

  if (existing) {
    return prisma.entity.update({ where: { id: existing.id }, data, select: { id: true } });
  }

  return prisma.entity.create({ data, select: { id: true } });
}

async function seed() {
  console.log("🌱 Starting Mosa Raw Data Seed...");

  const password = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
  const domain = process.env.SEED_ORG_DOMAIN ?? "almosa.com.sa";

  const org = await ensureOrg({
    domain,
    name: "Musa Bin Abdulaziz Al-Mousa & Sons Real Estate Holding Group",
    nameAr: "مجموعة موسى بن عبدالعزيز الموسى وأولاده العقارية القابضة",
    kpiApprovalLevel: KpiApprovalLevel.MANAGER,
    mission: "To invest in vital sectors with economic impact to create sustainable value.",
    missionAr: "نستثمر في القطاعات الحيوية ذات الأثر الاقتصادي لخلق قيمة مستدامة.",
    vision: "An ambitious investment group building sustainable growth.",
    visionAr: "مجموعة استثمارية طموحة تبني استدامة النمو.",
    about: "AlMousa Group - Seeded from mosa-raw-data.",
    aboutAr: "مجموعة الموسى - بيانات من mosa-raw-data.",
  });

  console.log(`✅ Organization: ${org.id}`);

  await wipeOrgEntities(org.id);

  console.log("👥 Creating org admins...");
  await ensureUser({
    orgId: org.id,
    email: "o.alharbi@almosa.com.sa",
    password,
    name: "Omar Al-Harbi",
    role: Role.ADMIN,
    title: "Org Admin",
  });

  await ensureUser({
    orgId: org.id,
    email: "m.alamri@almosa.com.sa",
    password,
    name: "Mohammed Al-Amri",
    role: Role.ADMIN,
    title: "Org Admin",
  });

  console.log("✅ Org admins created.");

  console.log("🏗️  Creating entity types...");
  const entityTypeIdByCode = await ensureOrgEntityTypes(org.id);
  const getTypeId = (code: string) => {
    const id = entityTypeIdByCode.get(code);
    if (!id) throw new Error(`Missing org entity type ${code}`);
    return id;
  };

  const pillarTypeId = getTypeId("pillar");
  const objectiveTypeId = getTypeId("objective");
  const departmentTypeId = getTypeId("department");
  const initiativeTypeId = getTypeId("initiative");
  const kpiTypeId = getTypeId("kpi");

  console.log("✅ Entity types created.");

  console.log("📊 Seeding entities from mosa-raw-data...");

  const dataDir = path.join(process.cwd(), "data/mosa-raw-data");

  // 1. Read objectives first to get goal weights for pillar formulas
  const objectivesData = readJson<ObjectiveData>(path.join(dataDir, "objectives.json"));
  const goalWeightMap = new Map<string, number>();
  for (const goal of objectivesData.strategic_goals) {
    goalWeightMap.set(goal.goal_id, weightToNumber(goal.goal_weight_overall));
  }

  // 2. Seed Pillars with formulas that aggregate their associated strategic goals
  console.log("  🏛️  Seeding pillars...");
  const pillarsData = readJson<PillarData>(path.join(dataDir, "pillars.json"));
  const pillarIdMap = new Map<number, string>();

  for (const pillar of pillarsData.pillar_objective_mapping) {
    // Build weighted average formula for associated goals
    const goalFormulaParts: string[] = [];
    let totalWeight = 0;
    
    for (const goalId of pillar.associated_strategic_goals) {
      const weight = goalWeightMap.get(goalId) ?? 0;
      if (weight > 0) {
        goalFormulaParts.push(`get("objective_${goalId}") * ${weight}`);
        totalWeight += weight;
      }
    }

    const formula = goalFormulaParts.length > 0 && totalWeight > 0
      ? `(${goalFormulaParts.join(" + ")}) / ${totalWeight}`
      : "0";

    const entity = await ensureEntity({
      orgId: org.id,
      orgEntityTypeId: pillarTypeId,
      key: `pillar_${pillar.pillar_id}`,
      title: pillar.pillar_name_en,
      titleAr: pillar.pillar_name_ar,
      status: Status.ACTIVE,
      sourceType: KpiSourceType.DERIVED,
      formula,
      targetValue: 85,
    });
    pillarIdMap.set(pillar.pillar_id, entity.id);
  }
  console.log(`  ✅ Seeded ${pillarIdMap.size} pillars.`);

  // 2. Seed Departments and Department KPIs
  console.log("  🏢 Seeding departments...");
  const deptFiles = [
    "strategy-department.json",
    "investment-department.json",
    "finance-department.json",
    "support-services-department.json",
    "internal-audit-department.json",
    "governance-department.json",
    "communication-department.json",
    "legal-department.json",
  ];

  const deptKeyMap = new Map<string, string>();
  let totalDeptKpis = 0;

  for (const filename of deptFiles) {
    const deptData = readJson<DepartmentData>(path.join(dataDir, "deprtments", filename));
    const deptPrefix = filename.replace("-department.json", "").replace(/-/g, "_");
    const deptKey = `dept_${deptPrefix}`;

    const deptEntity = await ensureEntity({
      orgId: org.id,
      orgEntityTypeId: departmentTypeId,
      key: deptKey,
      title: deptData.sector_info.name_en,
      titleAr: deptData.sector_info.name_ar,
      description: deptData.formula_description,
      status: Status.ACTIVE,
      sourceType: KpiSourceType.DERIVED,
      formula: convertFormulaToGetSyntax(deptData.formula),
      targetValue: 90,
    });
    deptKeyMap.set(deptPrefix, deptEntity.id);

    // Seed Department KPIs
    for (const kpi of deptData.indicators) {
      const periodType = periodTypeFromFrequency(kpi.frequency);
      const unit = String(kpi.unit_en ?? "").toLowerCase();
      const isPercentage = unit.includes("%") || unit.includes("percent");
      const direction = inferDirection(kpi.measurement_indicator_en, kpi.measurement_indicator);
      const isDecreaseGood = direction === KpiDirection.DECREASE_IS_GOOD;
      // For decrease-is-good KPIs, target should be low (e.g. 0 violations), else % → 90, count → 100
      const targetValue = isDecreaseGood ? 0 : (isPercentage ? 90 : 100);
      const indicatorType = inferIndicatorType(
        kpi.classification_en,
        kpi.classification_en?.toLowerCase() === "strategic" ? "department_strategic" : "department_operational"
      );

      await ensureEntity({
        orgId: org.id,
        orgEntityTypeId: kpiTypeId,
        key: kpi.kpi_code,
        title: kpi.measurement_indicator_en,
        titleAr: kpi.measurement_indicator,
        status: Status.ACTIVE,
        sourceType: KpiSourceType.MANUAL,
        periodType,
        unit: kpi.unit_en,
        unitAr: kpi.unit,
        direction,
        indicatorType,
        weight: weightToNumber(kpi.weight),
        targetValue,
      });
      totalDeptKpis++;
    }
  }
  console.log(`  ✅ Seeded ${deptKeyMap.size} departments and ${totalDeptKpis} department KPIs.`);

  // 3. Seed Strategic Objectives and Objective KPIs (objectivesData already loaded above)
  console.log("  🎯 Seeding objectives...");
  let totalObjectiveKpis = 0;

  for (const goal of objectivesData.strategic_goals) {
    // Seed Objective KPIs first
    for (const indicator of goal.indicators) {
      const direction = inferDirection(indicator.name_en, indicator.name_ar);
      await ensureEntity({
        orgId: org.id,
        orgEntityTypeId: kpiTypeId,
        key: indicator.kpi_code,
        title: indicator.name_en,
        titleAr: indicator.name_ar,
        description: indicator.formula_description,
        status: Status.ACTIVE,
        sourceType: KpiSourceType.DERIVED,
        periodType: KpiPeriodType.YEARLY,
        direction,
        indicatorType: KpiIndicatorType.LAGGING,
        weight: weightToNumber(indicator.weight),
        formula: convertFormulaToGetSyntax(indicator.formula),
        targetValue: 85,
      });
      totalObjectiveKpis++;
    }

    // Seed Objective/Goal
    await ensureEntity({
      orgId: org.id,
      orgEntityTypeId: objectiveTypeId,
      key: `objective_${goal.goal_id}`,
      title: goal.title_en,
      titleAr: goal.title_ar,
      description: goal.formula_description,
      status: Status.ACTIVE,
      sourceType: KpiSourceType.DERIVED,
      weight: weightToNumber(goal.goal_weight_overall),
      formula: convertFormulaToGetSyntax(goal.formula),
      targetValue: 85,
    });
  }
  console.log(`  ✅ Seeded ${objectivesData.strategic_goals.length} objectives and ${totalObjectiveKpis} objective KPIs.`);

  // 4. Seed Initiatives and Initiative KPIs
  console.log("  🚀 Seeding initiatives...");
  const initiativesData = readJson<InitiativeData>(path.join(dataDir, "initiatives.json"));
  let totalInitiativeKpis = 0;

  for (const initiative of initiativesData.initiatives_mapping) {
    // Seed operational initiative KPIs
    for (const kpi of initiative.kpis) {
      if (kpi.type === "operational" && kpi.value) {
        const direction = inferDirection(kpi.value, kpi.value);
        await ensureEntity({
          orgId: org.id,
          orgEntityTypeId: kpiTypeId,
          key: kpi.kpi_code,
          title: kpi.value,
          titleAr: kpi.value,
          status: Status.ACTIVE,
          sourceType: KpiSourceType.MANUAL,
          periodType: KpiPeriodType.QUARTERLY,
          direction,
          indicatorType: KpiIndicatorType.LEADING,
          targetValue: 80,
        });
        totalInitiativeKpis++;
      }
    }

    // Seed Initiative
    await ensureEntity({
      orgId: org.id,
      orgEntityTypeId: initiativeTypeId,
      key: initiative.initiative_code,
      title: initiative.initiative_name_en,
      titleAr: initiative.initiative_name_ar,
      description: initiative.formula_description,
      status: Status.ACTIVE,
      sourceType: KpiSourceType.DERIVED,
      formula: convertFormulaToGetSyntax(initiative.formula),
      targetValue: 80,
    });
  }
  console.log(`  ✅ Seeded ${initiativesData.initiatives_mapping.length} initiatives and ${totalInitiativeKpis} initiative KPIs.`);

  // Fetch admin id early — needed for derived value approval and later for assignments
  const adminUser = await prisma.user.findFirst({ where: { orgId: org.id, role: Role.ADMIN }, select: { id: true } });
  const adminId = adminUser!.id;

  // ── 5. Department Manager Users ──────────────────────────────────────────────
  console.log("👥 Creating department managers...");

  const uStrategy  = await ensureUser({ orgId: org.id, email: "strategy@almosa.com.sa",      password, name: "Khalid Al-Ghamdi",   role: Role.MANAGER, title: "Head of Strategy" });
  const uInvest    = await ensureUser({ orgId: org.id, email: "investment@almosa.com.sa",     password, name: "Faisal Al-Muqrin",   role: Role.MANAGER, title: "Head of Investment" });
  const uFinance   = await ensureUser({ orgId: org.id, email: "finance@almosa.com.sa",        password, name: "Rania Al-Zahrani",   role: Role.MANAGER, title: "CFO" });
  const uSupport   = await ensureUser({ orgId: org.id, email: "support@almosa.com.sa",        password, name: "Nasser Al-Harthy",   role: Role.MANAGER, title: "Head of Support Services" });
  const uAudit     = await ensureUser({ orgId: org.id, email: "audit@almosa.com.sa",          password, name: "Tariq Al-Shamri",    role: Role.MANAGER, title: "Head of Internal Audit" });
  const uGov       = await ensureUser({ orgId: org.id, email: "governance@almosa.com.sa",     password, name: "Lina Al-Dosari",     role: Role.MANAGER, title: "Head of Governance & Risk" });
  const uComm      = await ensureUser({ orgId: org.id, email: "communication@almosa.com.sa",  password, name: "Sara Al-Otaibi",     role: Role.MANAGER, title: "Head of Communication" });
  const uLegal     = await ensureUser({ orgId: org.id, email: "legal@almosa.com.sa",          password, name: "Omar Al-Rashidi",    role: Role.MANAGER, title: "General Counsel" });
  const uCeo       = await ensureUser({ orgId: org.id, email: "ceo@almosa.com.sa",            password, name: "Musa Al-Mousa",      role: Role.EXECUTIVE, title: "Group CEO" });

  console.log("✅ Department managers created (9 users).");

  // ── 6. User–Entity Assignments ───────────────────────────────────────────────
  console.log("🔗 Assigning users to KPIs...");

  type AssignDef = { userEmail: string; userId: string; kpiCodes: string[] };

  const deptAssignments: AssignDef[] = [
    { userEmail: uStrategy.id,  userId: uStrategy.id,  kpiCodes: ["strategy_dept_kpi_1","strategy_dept_kpi_2","strategy_dept_kpi_3","strategy_dept_kpi_4","strategy_dept_kpi_5","strategy_dept_kpi_6"] },
    { userEmail: uInvest.id,    userId: uInvest.id,    kpiCodes: ["investment_dept_kpi_1","investment_dept_kpi_2","investment_dept_kpi_3","investment_dept_kpi_4","investment_dept_kpi_5","investment_dept_kpi_6","investment_dept_kpi_7","investment_dept_kpi_8","investment_dept_kpi_9","investment_dept_kpi_10"] },
    { userEmail: uFinance.id,   userId: uFinance.id,   kpiCodes: ["finance_dept_kpi_1","finance_dept_kpi_2","finance_dept_kpi_3","finance_dept_kpi_4","finance_dept_kpi_5","finance_dept_kpi_6","finance_dept_kpi_7","finance_dept_kpi_8","finance_dept_kpi_9"] },
    { userEmail: uSupport.id,   userId: uSupport.id,   kpiCodes: ["support_services_dept_kpi_1","support_services_dept_kpi_2","support_services_dept_kpi_3","support_services_dept_kpi_4","support_services_dept_kpi_5","support_services_dept_kpi_6","support_services_dept_kpi_7","support_services_dept_kpi_8"] },
    { userEmail: uAudit.id,     userId: uAudit.id,     kpiCodes: ["internal_audit_dept_kpi_1","internal_audit_dept_kpi_2","internal_audit_dept_kpi_3","internal_audit_dept_kpi_4","internal_audit_dept_kpi_5","internal_audit_dept_kpi_6","internal_audit_dept_kpi_7","internal_audit_dept_kpi_8"] },
    { userEmail: uGov.id,       userId: uGov.id,       kpiCodes: ["governance_dept_kpi_1","governance_dept_kpi_2","governance_dept_kpi_3","governance_dept_kpi_4","governance_dept_kpi_5","governance_dept_kpi_6","governance_dept_kpi_7","governance_dept_kpi_8"] },
    { userEmail: uComm.id,      userId: uComm.id,      kpiCodes: ["communication_dept_kpi_1","communication_dept_kpi_2","communication_dept_kpi_3","communication_dept_kpi_4","communication_dept_kpi_5","communication_dept_kpi_6","communication_dept_kpi_7","communication_dept_kpi_8","communication_dept_kpi_9"] },
    { userEmail: uLegal.id,     userId: uLegal.id,     kpiCodes: ["legal_dept_kpi_1","legal_dept_kpi_2","legal_dept_kpi_3","legal_dept_kpi_4","legal_dept_kpi_5","legal_dept_kpi_6","legal_dept_kpi_7","legal_dept_kpi_8"] },
  ];

  let assignCount = 0;
  for (const dept of deptAssignments) {
    for (const code of dept.kpiCodes) {
      const entity = await prisma.entity.findFirst({ where: { orgId: org.id, key: code }, select: { id: true } });
      if (!entity) continue;
      const existing = await prisma.userEntityAssignment.findFirst({ where: { userId: dept.userId, entityId: entity.id } });
      if (!existing) {
        await prisma.userEntityAssignment.create({ data: { userId: dept.userId, entityId: entity.id, assignedBy: adminId } });
        assignCount++;
      }
    }
  }
  console.log(`✅ Created ${assignCount} user-entity assignments.`);

  // ── 7. KPI Values ─────────────────────────────────────────────────────────────
  console.log("📈 Seeding KPI values...");

  // Helper: create a series of EntityValues for a given KPI key
  // periods: array of [monthsBack, value, note, status]
  type ValueSeed = { key: string; submittedBy: string; periods: Array<[number, number, string, KpiValueStatus]> };

  async function seedValues(def: ValueSeed) {
    const entity = await prisma.entity.findFirst({ where: { orgId: org.id, key: def.key }, select: { id: true } });
    if (!entity) return 0;
    let count = 0;
    for (const [mo, val, note, status] of def.periods) {
      const createdAt = mo === 0 ? daysAgo(2) : monthsAgo(mo);
      const isApproved = status === KpiValueStatus.APPROVED;
      await prisma.entityValue.create({
        data: {
          entityId: entity.id,
          actualValue: val,
          finalValue: isApproved ? val : null,
          status,
          approvalType: KpiApprovalType.MANUAL,
          note,
          enteredBy: def.submittedBy,
          submittedBy: status !== KpiValueStatus.DRAFT ? def.submittedBy : null,
          approvedBy: isApproved ? adminId : null,
          submittedAt: status !== KpiValueStatus.DRAFT ? createdAt : null,
          approvedAt: isApproved ? new Date(createdAt.getTime() + 86400000 * 2) : null,
          createdAt,
        },
      });
      count++;
    }
    return count;
  }

  const valueDefs: ValueSeed[] = [
    // ── Strategy ──────────────────────────────────────────────────────────────
    { key: "strategy_dept_kpi_1", submittedBy: uStrategy.id, periods: [
      [12, 68, "Q1 2024 — Baseline: 68% of strategic goals on track.", KpiValueStatus.APPROVED],
      [9,  74, "Q2 2024 — Improvement after mid-year strategy review.", KpiValueStatus.APPROVED],
      [6,  80, "Q3 2024 — All critical goals progressing well.", KpiValueStatus.APPROVED],
      [3,  85, "Q4 2024 — Strong year-end performance.", KpiValueStatus.APPROVED],
      [0,  88, "Q1 2025 — On track. Awaiting approval.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "strategy_dept_kpi_2", submittedBy: uStrategy.id, periods: [
      [12, 55, "Q1 2024 — Several initiatives delayed.", KpiValueStatus.APPROVED],
      [9,  62, "Q2 2024 — Recovery plan activated.", KpiValueStatus.APPROVED],
      [6,  70, "Q3 2024 — Improved delivery rhythm.", KpiValueStatus.APPROVED],
      [3,  78, "Q4 2024 — 78% delivered on time.", KpiValueStatus.APPROVED],
      [0,  82, "Q1 2025 — Submitted for review.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "strategy_dept_kpi_3", submittedBy: uStrategy.id, periods: [
      [12, 72, "H1 2024 — Quality standards partially implemented.", KpiValueStatus.APPROVED],
      [6,  83, "H2 2024 — ISO alignment completed.", KpiValueStatus.APPROVED],
      [0,  87, "H1 2025 — Draft pending submission.", KpiValueStatus.DRAFT],
    ]},
    { key: "strategy_dept_kpi_4", submittedBy: uStrategy.id, periods: [
      [12, 12, "Q1 2024 — Non-compliance rate at 12% (lower is better).", KpiValueStatus.APPROVED],
      [9,   9, "Q2 2024 — Improving: down to 9%.", KpiValueStatus.APPROVED],
      [6,   6, "Q3 2024 — Further reduction achieved.", KpiValueStatus.APPROVED],
      [3,   4, "Q4 2024 — Near target (0%).", KpiValueStatus.APPROVED],
      [0,   3, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "strategy_dept_kpi_5", submittedBy: uStrategy.id, periods: [
      [12, 60, "FY 2023 — 60% of excellence initiatives completed.", KpiValueStatus.APPROVED],
      [0,  75, "FY 2024 — 75% complete, improvement noted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "strategy_dept_kpi_6", submittedBy: uStrategy.id, periods: [
      [12, 5, "Jan 2024 — 5 unimplemented initiatives (lower is better).", KpiValueStatus.APPROVED],
      [9,  4, "Feb 2024 — Reduced to 4.", KpiValueStatus.APPROVED],
      [6,  3, "Mar 2024 — Reduced to 3.", KpiValueStatus.APPROVED],
      [3,  2, "Apr 2024 — Almost clear.", KpiValueStatus.APPROVED],
      [0,  1, "May 2024 — 1 remaining. Submitted.", KpiValueStatus.SUBMITTED],
    ]},

    // ── Investment ────────────────────────────────────────────────────────────
    { key: "investment_dept_kpi_1", submittedBy: uInvest.id, periods: [
      [12, 2, "Q1 2024 — 2 new sectors entered.", KpiValueStatus.APPROVED],
      [9,  4, "Q2 2024 — Healthcare and Logistics added.", KpiValueStatus.APPROVED],
      [6,  5, "Q3 2024 — Technology sector entered.", KpiValueStatus.APPROVED],
      [3,  6, "Q4 2024 — Education sector entered.", KpiValueStatus.APPROVED],
      [0,  7, "Q1 2025 — Target reached! Submitted for approval.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "investment_dept_kpi_2", submittedBy: uInvest.id, periods: [
      [12, 8,  "Q1 2024 — 8% growth in new investments.", KpiValueStatus.APPROVED],
      [9,  11, "Q2 2024 — Accelerating growth.", KpiValueStatus.APPROVED],
      [6,  13, "Q3 2024 — New deals driving growth.", KpiValueStatus.APPROVED],
      [3,  15, "Q4 2024 — Exceeding target.", KpiValueStatus.APPROVED],
      [0,  14, "Q1 2025 — Slightly below prior quarter. Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "investment_dept_kpi_3", submittedBy: uInvest.id, periods: [
      [12, 30, "Q1 2024 — 30% unutilized opportunities (lower is better).", KpiValueStatus.APPROVED],
      [9,  25, "Q2 2024 — Improving pipeline utilization.", KpiValueStatus.APPROVED],
      [6,  18, "Q3 2024 — Strong deal conversion.", KpiValueStatus.APPROVED],
      [0,  14, "Q1 2025 — Further reduction. Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "investment_dept_kpi_4", submittedBy: uInvest.id, periods: [
      [12, 6,  "Q1 2024 — 6% sustainable revenue growth.", KpiValueStatus.APPROVED],
      [9,  9,  "Q2 2024 — Growing contribution from new sectors.", KpiValueStatus.APPROVED],
      [6,  12, "Q3 2024 — On track.", KpiValueStatus.APPROVED],
      [3,  14, "Q4 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,  15, "Q1 2025 — Target met. Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "investment_dept_kpi_5", submittedBy: uInvest.id, periods: [
      [12, 72, "Q1 2024 — 72% of target investment return achieved.", KpiValueStatus.APPROVED],
      [9,  80, "Q2 2024 — Improving portfolio performance.", KpiValueStatus.APPROVED],
      [6,  87, "Q3 2024 — Strong returns from healthcare and logistics.", KpiValueStatus.APPROVED],
      [3,  92, "Q4 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,  95, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "investment_dept_kpi_6", submittedBy: uInvest.id, periods: [
      [12, 28, "Q1 2024 — 28% gap to investment return target.", KpiValueStatus.APPROVED],
      [9,  20, "Q2 2024 — Gap narrowing.", KpiValueStatus.APPROVED],
      [6,  13, "Q3 2024 — Good progress.", KpiValueStatus.APPROVED],
      [3,   8, "Q4 2024 — Almost closed.", KpiValueStatus.APPROVED],
      [0,   5, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "investment_dept_kpi_7", submittedBy: uInvest.id, periods: [
      [12, 850,  "H1 2024 — Portfolio value SAR 850M.", KpiValueStatus.APPROVED],
      [6,  980,  "H2 2024 — Growth of 15%.", KpiValueStatus.APPROVED],
      [0,  1050, "H1 2025 — SAR 1.05B. Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "investment_dept_kpi_8", submittedBy: uInvest.id, periods: [
      [12, 75, "FY 2023 — 75% project success rate.", KpiValueStatus.APPROVED],
      [6,  82, "FY 2024 — Improved deal selection process.", KpiValueStatus.APPROVED],
      [0,  88, "FY 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "investment_dept_kpi_9", submittedBy: uInvest.id, periods: [
      [12, 25, "Q1 2024 — 25% unsuccessful projects (lower is better).", KpiValueStatus.APPROVED],
      [9,  20, "Q2 2024 — Improving.", KpiValueStatus.APPROVED],
      [6,  15, "Q3 2024 — Better due diligence.", KpiValueStatus.APPROVED],
      [3,  12, "Q4 2024 — Good improvement.", KpiValueStatus.APPROVED],
      [0,  10, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "investment_dept_kpi_10", submittedBy: uInvest.id, periods: [
      [12, 85, "Q1 2024 — Average 85 days to close deals (lower is better).", KpiValueStatus.APPROVED],
      [9,  78, "Q2 2024 — Process improvements applied.", KpiValueStatus.APPROVED],
      [6,  70, "Q3 2024 — Digital tools reducing cycle time.", KpiValueStatus.APPROVED],
      [3,  62, "Q4 2024 — Near target of 60 days.", KpiValueStatus.APPROVED],
      [0,  58, "Q1 2025 — Target beaten! Submitted.", KpiValueStatus.SUBMITTED],
    ]},

    // ── Finance ───────────────────────────────────────────────────────────────
    { key: "finance_dept_kpi_1", submittedBy: uFinance.id, periods: [
      [12, 8,  "Q1 2024 — Budget variance 8% (lower is better).", KpiValueStatus.APPROVED],
      [9,  6,  "Q2 2024 — Better cost discipline.", KpiValueStatus.APPROVED],
      [6,  4,  "Q3 2024 — Variance reduced after budget revision.", KpiValueStatus.APPROVED],
      [3,  3,  "Q4 2024 — Well within acceptable range.", KpiValueStatus.APPROVED],
      [0,  2,  "Q1 2025 — Best result yet. Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "finance_dept_kpi_2", submittedBy: uFinance.id, periods: [
      [12, 82, "Q1 2024 — 82% budget compliance.", KpiValueStatus.APPROVED],
      [9,  87, "Q2 2024 — Improved tracking processes.", KpiValueStatus.APPROVED],
      [6,  91, "Q3 2024 — Strong compliance.", KpiValueStatus.APPROVED],
      [3,  95, "Q4 2024 — Near full compliance.", KpiValueStatus.APPROVED],
      [0,  97, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "finance_dept_kpi_3", submittedBy: uFinance.id, periods: [
      [12, 2.8, "H1 2024 — Z-score 2.8 (healthy range > 2.6).", KpiValueStatus.APPROVED],
      [6,  3.1, "H2 2024 — Improved financial health.", KpiValueStatus.APPROVED],
      [0,  3.3, "H1 2025 — Strong score. Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "finance_dept_kpi_4", submittedBy: uFinance.id, periods: [
      [12, 1.4, "Q1 2024 — Liquidity ratio 1.4 (target > 1.5).", KpiValueStatus.APPROVED],
      [9,  1.6, "Q2 2024 — Improved cash position.", KpiValueStatus.APPROVED],
      [6,  1.8, "Q3 2024 — Strong liquidity.", KpiValueStatus.APPROVED],
      [3,  2.0, "Q4 2024 — Excellent.", KpiValueStatus.APPROVED],
      [0,  2.1, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "finance_dept_kpi_5", submittedBy: uFinance.id, periods: [
      [12, 65, "Q1 2024 — 65% of efficiency recommendations actioned.", KpiValueStatus.APPROVED],
      [9,  72, "Q2 2024 — More recommendations implemented.", KpiValueStatus.APPROVED],
      [6,  80, "Q3 2024 — Good progress.", KpiValueStatus.APPROVED],
      [3,  88, "Q4 2024 — Strong implementation rate.", KpiValueStatus.APPROVED],
      [0,  91, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "finance_dept_kpi_6", submittedBy: uFinance.id, periods: [
      [12, 55, "H1 2024 — 55% of policies improved.", KpiValueStatus.APPROVED],
      [6,  70, "H2 2024 — Major policy overhaul completed.", KpiValueStatus.APPROVED],
      [0,  78, "H1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "finance_dept_kpi_7", submittedBy: uFinance.id, periods: [
      [12, 4.2, "Q1 2024 — ROA 4.2%.", KpiValueStatus.APPROVED],
      [9,  5.1, "Q2 2024 — New investments contributing.", KpiValueStatus.APPROVED],
      [6,  5.8, "Q3 2024 — Strong asset performance.", KpiValueStatus.APPROVED],
      [3,  6.3, "Q4 2024 — Record ROA.", KpiValueStatus.APPROVED],
      [0,  6.5, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "finance_dept_kpi_8", submittedBy: uFinance.id, periods: [
      [12, 7,  "FY 2023 — 7% asset value growth.", KpiValueStatus.APPROVED],
      [6,  11, "FY 2024 — New acquisitions driving growth.", KpiValueStatus.APPROVED],
      [0,  13, "FY 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "finance_dept_kpi_9", submittedBy: uFinance.id, periods: [
      [12, 22, "Q1 2024 — 22% unutilized assets (lower is better).", KpiValueStatus.APPROVED],
      [9,  18, "Q2 2024 — Asset monetization program started.", KpiValueStatus.APPROVED],
      [6,  14, "Q3 2024 — Good progress.", KpiValueStatus.APPROVED],
      [3,  10, "Q4 2024 — Significant improvement.", KpiValueStatus.APPROVED],
      [0,   8, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},

    // ── Support Services ──────────────────────────────────────────────────────
    { key: "support_services_dept_kpi_1", submittedBy: uSupport.id, periods: [
      [12, 74, "Q1 2024 — Internal satisfaction 74%.", KpiValueStatus.APPROVED],
      [9,  78, "Q2 2024 — Service desk improvements.", KpiValueStatus.APPROVED],
      [6,  83, "Q3 2024 — New ticketing system deployed.", KpiValueStatus.APPROVED],
      [3,  87, "Q4 2024 — High satisfaction.", KpiValueStatus.APPROVED],
      [0,  89, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "support_services_dept_kpi_2", submittedBy: uSupport.id, periods: [
      [12, 35, "Q1 2024 — Average 35% responded on time.", KpiValueStatus.APPROVED],
      [9,  50, "Q2 2024 — Improved with automation.", KpiValueStatus.APPROVED],
      [6,  65, "Q3 2024 — SLA compliance improving.", KpiValueStatus.APPROVED],
      [3,  78, "Q4 2024 — Strong improvement.", KpiValueStatus.APPROVED],
      [0,  82, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "support_services_dept_kpi_3", submittedBy: uSupport.id, periods: [
      [12, 18, "Jan 2024 — 18% delay rate (lower is better).", KpiValueStatus.APPROVED],
      [9,  14, "Feb 2024 — Improved workflow.", KpiValueStatus.APPROVED],
      [6,  10, "Mar 2024 — Delays significantly reduced.", KpiValueStatus.APPROVED],
      [3,   7, "Apr 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,   5, "May 2024 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "support_services_dept_kpi_4", submittedBy: uSupport.id, periods: [
      [12, 15, "Jan 2024 — 15 days avg to approve policies.", KpiValueStatus.APPROVED],
      [9,  12, "Feb 2024 — Process streamlined.", KpiValueStatus.APPROVED],
      [6,   9, "Mar 2024 — Faster approvals.", KpiValueStatus.APPROVED],
      [3,   7, "Apr 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,   6, "May 2024 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "support_services_dept_kpi_5", submittedBy: uSupport.id, periods: [
      [12, 70, "Jan 2024 — 70% compliance with procedures.", KpiValueStatus.APPROVED],
      [9,  78, "Feb 2024 — Awareness campaigns helped.", KpiValueStatus.APPROVED],
      [6,  85, "Mar 2024 — Good.", KpiValueStatus.APPROVED],
      [3,  90, "Apr 2024 — Near full compliance.", KpiValueStatus.APPROVED],
      [0,  92, "May 2024 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "support_services_dept_kpi_6", submittedBy: uSupport.id, periods: [
      [12, 97.5, "Q1 2024 — 97.5% systems availability.", KpiValueStatus.APPROVED],
      [9,  98.2, "Q2 2024 — Improved redundancy.", KpiValueStatus.APPROVED],
      [6,  99.1, "Q3 2024 — Excellent uptime.", KpiValueStatus.APPROVED],
      [3,  99.5, "Q4 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,  99.7, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "support_services_dept_kpi_7", submittedBy: uSupport.id, periods: [
      [12, 9,  "Q1 2024 — 9% operating budget variance (lower is better).", KpiValueStatus.APPROVED],
      [9,  7,  "Q2 2024 — Better budget control.", KpiValueStatus.APPROVED],
      [6,  5,  "Q3 2024 — Improved.", KpiValueStatus.APPROVED],
      [3,  3,  "Q4 2024 — Well controlled.", KpiValueStatus.APPROVED],
      [0,  2,  "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "support_services_dept_kpi_8", submittedBy: uSupport.id, periods: [
      [12, 50, "FY 2023 — 50% improvement initiatives implemented.", KpiValueStatus.APPROVED],
      [6,  68, "FY 2024 — More initiatives completed.", KpiValueStatus.APPROVED],
      [0,  75, "FY 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},

    // ── Internal Audit ────────────────────────────────────────────────────────
    { key: "internal_audit_dept_kpi_1", submittedBy: uAudit.id, periods: [
      [12, 70, "Q1 2024 — 70% of audit plans completed.", KpiValueStatus.APPROVED],
      [9,  78, "Q2 2024 — Additional audit resources allocated.", KpiValueStatus.APPROVED],
      [6,  85, "Q3 2024 — On track.", KpiValueStatus.APPROVED],
      [3,  92, "Q4 2024 — Strong completion rate.", KpiValueStatus.APPROVED],
      [0,  95, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "internal_audit_dept_kpi_2", submittedBy: uAudit.id, periods: [
      [12, 45, "Q1 2024 — Avg 45 hrs/assignment.", KpiValueStatus.APPROVED],
      [9,  42, "Q2 2024 — Process improvements reducing time.", KpiValueStatus.APPROVED],
      [6,  38, "Q3 2024 — Digital audit tools deployed.", KpiValueStatus.APPROVED],
      [3,  35, "Q4 2024 — More efficient.", KpiValueStatus.APPROVED],
      [0,  32, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "internal_audit_dept_kpi_3", submittedBy: uAudit.id, periods: [
      [12, 20, "Q1 2024 — 20% audits overdue (lower is better).", KpiValueStatus.APPROVED],
      [9,  15, "Q2 2024 — Better scheduling.", KpiValueStatus.APPROVED],
      [6,  10, "Q3 2024 — Significant reduction.", KpiValueStatus.APPROVED],
      [3,   6, "Q4 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,   4, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "internal_audit_dept_kpi_4", submittedBy: uAudit.id, periods: [
      [12, 80, "Q1 2024 — 80% of reports approved.", KpiValueStatus.APPROVED],
      [9,  85, "Q2 2024 — Quality of reports improved.", KpiValueStatus.APPROVED],
      [6,  90, "Q3 2024 — Strong approval rate.", KpiValueStatus.APPROVED],
      [3,  93, "Q4 2024 — Near full approval.", KpiValueStatus.APPROVED],
      [0,  95, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "internal_audit_dept_kpi_5", submittedBy: uAudit.id, periods: [
      [12, 70, "Q1 2024 — 70% of recommendations issued.", KpiValueStatus.APPROVED],
      [9,  75, "Q2 2024 — More thorough reviews.", KpiValueStatus.APPROVED],
      [6,  82, "Q3 2024 — Improved.", KpiValueStatus.APPROVED],
      [3,  88, "Q4 2024 — Strong output.", KpiValueStatus.APPROVED],
      [0,  90, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "internal_audit_dept_kpi_6", submittedBy: uAudit.id, periods: [
      [12, 65, "Q1 2024 — 65% of recommendations implemented on time.", KpiValueStatus.APPROVED],
      [9,  72, "Q2 2024 — Follow-up process strengthened.", KpiValueStatus.APPROVED],
      [6,  80, "Q3 2024 — Good progress.", KpiValueStatus.APPROVED],
      [3,  87, "Q4 2024 — Strong compliance.", KpiValueStatus.APPROVED],
      [0,  90, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "internal_audit_dept_kpi_7", submittedBy: uAudit.id, periods: [
      [12, 8,  "H1 2024 — 8 procedures improved.", KpiValueStatus.APPROVED],
      [6,  14, "H2 2024 — Significant improvements made.", KpiValueStatus.APPROVED],
      [0,  18, "H1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "internal_audit_dept_kpi_8", submittedBy: uAudit.id, periods: [
      [12, 22, "Q1 2024 — Avg 22 days to resolve observations (lower is better).", KpiValueStatus.APPROVED],
      [9,  18, "Q2 2024 — Faster resolution tracking.", KpiValueStatus.APPROVED],
      [6,  14, "Q3 2024 — Digital workflow helping.", KpiValueStatus.APPROVED],
      [3,  11, "Q4 2024 — Good improvement.", KpiValueStatus.APPROVED],
      [0,   9, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},

    // ── Governance ────────────────────────────────────────────────────────────
    { key: "governance_dept_kpi_1", submittedBy: uGov.id, periods: [
      [12, 12, "H1 2024 — 12 internal policies approved.", KpiValueStatus.APPROVED],
      [6,  18, "H2 2024 — New governance framework policies added.", KpiValueStatus.APPROVED],
      [0,  22, "H1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "governance_dept_kpi_2", submittedBy: uGov.id, periods: [
      [12, 8, "Q1 2024 — 8 unapproved/delayed reports (lower is better).", KpiValueStatus.APPROVED],
      [9,  6, "Q2 2024 — Improved reporting discipline.", KpiValueStatus.APPROVED],
      [6,  4, "Q3 2024 — Further reduction.", KpiValueStatus.APPROVED],
      [3,  2, "Q4 2024 — Almost none delayed.", KpiValueStatus.APPROVED],
      [0,  1, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "governance_dept_kpi_3", submittedBy: uGov.id, periods: [
      [12, 78, "Q1 2024 — 78% internal compliance rate.", KpiValueStatus.APPROVED],
      [9,  83, "Q2 2024 — Policy awareness training conducted.", KpiValueStatus.APPROVED],
      [6,  88, "Q3 2024 — Strong improvement.", KpiValueStatus.APPROVED],
      [3,  93, "Q4 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,  95, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "governance_dept_kpi_4", submittedBy: uGov.id, periods: [
      [12, 12, "Q1 2024 — 12 high-risk items (lower is better).", KpiValueStatus.APPROVED],
      [9,   9, "Q2 2024 — Risk mitigation plans activated.", KpiValueStatus.APPROVED],
      [6,   6, "Q3 2024 — Risk register updated.", KpiValueStatus.APPROVED],
      [3,   4, "Q4 2024 — Good reduction.", KpiValueStatus.APPROVED],
      [0,   3, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "governance_dept_kpi_5", submittedBy: uGov.id, periods: [
      [12, 60, "Q1 2024 — 60% of risk mitigation plans implemented.", KpiValueStatus.APPROVED],
      [9,  70, "Q2 2024 — More plans actioned.", KpiValueStatus.APPROVED],
      [6,  78, "Q3 2024 — Good progress.", KpiValueStatus.APPROVED],
      [3,  85, "Q4 2024 — Strong implementation.", KpiValueStatus.APPROVED],
      [0,  88, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "governance_dept_kpi_6", submittedBy: uGov.id, periods: [
      [12, 18, "Jan 2024 — Avg 18 days to resolve risks (lower is better).", KpiValueStatus.APPROVED],
      [9,  14, "Feb 2024 — Faster response.", KpiValueStatus.APPROVED],
      [6,  10, "Mar 2024 — Improved.", KpiValueStatus.APPROVED],
      [3,   7, "Apr 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,   5, "May 2024 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "governance_dept_kpi_7", submittedBy: uGov.id, periods: [
      [12, 80, "Q1 2024 — 80% of reports approved.", KpiValueStatus.APPROVED],
      [9,  85, "Q2 2024 — Improved quality.", KpiValueStatus.APPROVED],
      [6,  90, "Q3 2024 — Good.", KpiValueStatus.APPROVED],
      [3,  94, "Q4 2024 — Near full.", KpiValueStatus.APPROVED],
      [0,  96, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "governance_dept_kpi_8", submittedBy: uGov.id, periods: [
      [12, 65, "Q1 2024 — 65% violations addressed in plan.", KpiValueStatus.APPROVED],
      [9,  73, "Q2 2024 — Better follow-through.", KpiValueStatus.APPROVED],
      [6,  80, "Q3 2024 — Strong.", KpiValueStatus.APPROVED],
      [3,  87, "Q4 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,  90, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},

    // ── Communication ─────────────────────────────────────────────────────────
    { key: "communication_dept_kpi_1", submittedBy: uComm.id, periods: [
      [12, 70, "Jan 2024 — 70% responded on time.", KpiValueStatus.APPROVED],
      [9,  76, "Feb 2024 — New response tracking tool.", KpiValueStatus.APPROVED],
      [6,  82, "Mar 2024 — Improving.", KpiValueStatus.APPROVED],
      [3,  88, "Apr 2024 — Strong.", KpiValueStatus.APPROVED],
      [0,  92, "May 2024 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "communication_dept_kpi_2", submittedBy: uComm.id, periods: [
      [12, 6,  "Jan 2024 — Avg 6 hrs response time (lower is better).", KpiValueStatus.APPROVED],
      [9,  5,  "Feb 2024 — Improved.", KpiValueStatus.APPROVED],
      [6,  4,  "Mar 2024 — Good progress.", KpiValueStatus.APPROVED],
      [3,  3,  "Apr 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,  2,  "May 2024 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "communication_dept_kpi_3", submittedBy: uComm.id, periods: [
      [12, 72, "Q1 2024 — 72% compliance with communication schedule.", KpiValueStatus.APPROVED],
      [9,  78, "Q2 2024 — Better planning.", KpiValueStatus.APPROVED],
      [6,  85, "Q3 2024 — Strong.", KpiValueStatus.APPROVED],
      [3,  90, "Q4 2024 — Near full.", KpiValueStatus.APPROVED],
      [0,  93, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "communication_dept_kpi_4", submittedBy: uComm.id, periods: [
      [12, 68, "H1 2024 — Clarity satisfaction 68%.", KpiValueStatus.APPROVED],
      [6,  76, "H2 2024 — Improved messaging quality.", KpiValueStatus.APPROVED],
      [0,  82, "H1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "communication_dept_kpi_5", submittedBy: uComm.id, periods: [
      [12, 12, "Jan 2024 — 12 complaints about poor communication (lower is better).", KpiValueStatus.APPROVED],
      [9,   9, "Feb 2024 — Improving.", KpiValueStatus.APPROVED],
      [6,   6, "Mar 2024 — Good reduction.", KpiValueStatus.APPROVED],
      [3,   4, "Apr 2024 — Nearly resolved.", KpiValueStatus.APPROVED],
      [0,   3, "May 2024 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "communication_dept_kpi_6", submittedBy: uComm.id, periods: [
      [12, 65, "H1 2024 — Overall satisfaction 65%.", KpiValueStatus.APPROVED],
      [6,  73, "H2 2024 — Campaign improvements.", KpiValueStatus.APPROVED],
      [0,  79, "H1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "communication_dept_kpi_7", submittedBy: uComm.id, periods: [
      [12, 60, "Q1 2024 — 60% campaign objectives achieved.", KpiValueStatus.APPROVED],
      [9,  68, "Q2 2024 — Ramadan campaign strong.", KpiValueStatus.APPROVED],
      [6,  75, "Q3 2024 — Good performance.", KpiValueStatus.APPROVED],
      [3,  82, "Q4 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,  85, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "communication_dept_kpi_8", submittedBy: uComm.id, periods: [
      [12, 3.2, "Jan 2024 — 3.2% avg engagement rate.", KpiValueStatus.APPROVED],
      [9,  4.1, "Feb 2024 — Social content improving.", KpiValueStatus.APPROVED],
      [6,  5.0, "Mar 2024 — Strong engagement.", KpiValueStatus.APPROVED],
      [3,  5.8, "Apr 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,  6.2, "May 2024 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "communication_dept_kpi_9", submittedBy: uComm.id, periods: [
      [12, 3,  "Q1 2024 — 3 events participated.", KpiValueStatus.APPROVED],
      [9,  5,  "Q2 2024 — More industry events attended.", KpiValueStatus.APPROVED],
      [6,  7,  "Q3 2024 — Good visibility.", KpiValueStatus.APPROVED],
      [3,  9,  "Q4 2024 — Strong presence.", KpiValueStatus.APPROVED],
      [0,  10, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},

    // ── Legal ─────────────────────────────────────────────────────────────────
    { key: "legal_dept_kpi_1", submittedBy: uLegal.id, periods: [
      [12, 80, "Q1 2024 — 80% of contracts legally reviewed before approval.", KpiValueStatus.APPROVED],
      [9,  85, "Q2 2024 — Improved review workflow.", KpiValueStatus.APPROVED],
      [6,  90, "Q3 2024 — Strong.", KpiValueStatus.APPROVED],
      [3,  94, "Q4 2024 — Near 100%.", KpiValueStatus.APPROVED],
      [0,  96, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "legal_dept_kpi_2", submittedBy: uLegal.id, periods: [
      [12, 8,  "Q1 2024 — 8 avoidable cases (lower is better).", KpiValueStatus.APPROVED],
      [9,  6,  "Q2 2024 — Proactive legal advisory improved.", KpiValueStatus.APPROVED],
      [6,  4,  "Q3 2024 — Fewer disputes.", KpiValueStatus.APPROVED],
      [3,  2,  "Q4 2024 — Good result.", KpiValueStatus.APPROVED],
      [0,  1,  "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "legal_dept_kpi_3", submittedBy: uLegal.id, periods: [
      [12, 85, "Q1 2024 — 85% compliance with laws.", KpiValueStatus.APPROVED],
      [9,  89, "Q2 2024 — Regulatory changes tracked.", KpiValueStatus.APPROVED],
      [6,  93, "Q3 2024 — Strong.", KpiValueStatus.APPROVED],
      [3,  96, "Q4 2024 — Near full.", KpiValueStatus.APPROVED],
      [0,  97, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "legal_dept_kpi_4", submittedBy: uLegal.id, periods: [
      [12, 12, "Jan 2024 — Avg 12 days to review contracts (lower is better).", KpiValueStatus.APPROVED],
      [9,  10, "Feb 2024 — Improved.", KpiValueStatus.APPROVED],
      [6,   8, "Mar 2024 — Getting faster.", KpiValueStatus.APPROVED],
      [3,   6, "Apr 2024 — Significant improvement.", KpiValueStatus.APPROVED],
      [0,   5, "May 2024 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "legal_dept_kpi_5", submittedBy: uLegal.id, periods: [
      [12, 3,  "Jan 2024 — Avg 3 days for legal consultation response (lower is better).", KpiValueStatus.APPROVED],
      [9,  2,  "Feb 2024 — Faster responses.", KpiValueStatus.APPROVED],
      [6,  2,  "Mar 2024 — Maintained.", KpiValueStatus.APPROVED],
      [3,  1,  "Apr 2024 — Target met.", KpiValueStatus.APPROVED],
      [0,  1,  "May 2024 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "legal_dept_kpi_6", submittedBy: uLegal.id, periods: [
      [12, 75, "Q1 2024 — 75% compliance with statutory deadlines.", KpiValueStatus.APPROVED],
      [9,  82, "Q2 2024 — Deadline tracking improved.", KpiValueStatus.APPROVED],
      [6,  88, "Q3 2024 — Strong.", KpiValueStatus.APPROVED],
      [3,  93, "Q4 2024 — Near full.", KpiValueStatus.APPROVED],
      [0,  95, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "legal_dept_kpi_7", submittedBy: uLegal.id, periods: [
      [12, 10, "Jan 2024 — 10% exceeded statutory limits (lower is better).", KpiValueStatus.APPROVED],
      [9,   8, "Feb 2024 — Improving.", KpiValueStatus.APPROVED],
      [6,   5, "Mar 2024 — Good.", KpiValueStatus.APPROVED],
      [3,   3, "Apr 2024 — Near zero.", KpiValueStatus.APPROVED],
      [0,   2, "May 2024 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "legal_dept_kpi_8", submittedBy: uLegal.id, periods: [
      [12, 55, "H1 2024 — 55% of disputes settled amicably.", KpiValueStatus.APPROVED],
      [6,  68, "H2 2024 — Mediation program launched.", KpiValueStatus.APPROVED],
      [0,  74, "H1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
  ];

  let totalValues = 0;
  for (const def of valueDefs) {
    totalValues += await seedValues(def);
  }
  console.log(`✅ Seeded ${totalValues} KPI values across all departments.`);

  // ── Objective KPIs ────────────────────────────────────────────────────────
  const objectiveValueDefs: ValueSeed[] = [
    // Goal 1: Expand investment portfolio (5 new sectors)
    { key: "objective_kpi_1_1", submittedBy: uInvest.id, periods: [
      [12, 55, "Q1 2024 — 55% of new sector expansion target achieved.", KpiValueStatus.APPROVED],
      [9,  68, "Q2 2024 — Healthcare & logistics sectors entered.", KpiValueStatus.APPROVED],
      [6,  78, "Q3 2024 — Technology sector added.", KpiValueStatus.APPROVED],
      [3,  88, "Q4 2024 — Education sector entered, 88% progress.", KpiValueStatus.APPROVED],
      [0,  94, "Q1 2025 — Near target. Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_1_2", submittedBy: uInvest.id, periods: [
      [12, 48, "Q1 2024 — 48% portfolio contribution from new sectors.", KpiValueStatus.APPROVED],
      [9,  60, "Q2 2024 — Growing contribution.", KpiValueStatus.APPROVED],
      [6,  72, "Q3 2024 — New sectors performing well.", KpiValueStatus.APPROVED],
      [3,  83, "Q4 2024 — Strong diversification.", KpiValueStatus.APPROVED],
      [0,  88, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_1_3", submittedBy: uInvest.id, periods: [
      [12, 52, "Q1 2024 — 52% new partnerships target achieved.", KpiValueStatus.APPROVED],
      [9,  64, "Q2 2024 — 4 new JV agreements signed.", KpiValueStatus.APPROVED],
      [6,  75, "Q3 2024 — Pipeline growing.", KpiValueStatus.APPROVED],
      [3,  84, "Q4 2024 — Strong deal flow.", KpiValueStatus.APPROVED],
      [0,  90, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_1_4", submittedBy: uInvest.id, periods: [
      [12, 60, "Q1 2024 — ROI at 60% of target.", KpiValueStatus.APPROVED],
      [9,  72, "Q2 2024 — Returns improving.", KpiValueStatus.APPROVED],
      [6,  81, "Q3 2024 — Healthcare investments yielding.", KpiValueStatus.APPROVED],
      [3,  91, "Q4 2024 — Near 20% ROI target.", KpiValueStatus.APPROVED],
      [0,  95, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},

    // Goal 2: Investment leadership — 20% ROI
    { key: "objective_kpi_2_1", submittedBy: uInvest.id, periods: [
      [12, 58, "Q1 2024 — Portfolio ROI at 58% of 20% target.", KpiValueStatus.APPROVED],
      [9,  68, "Q2 2024 — New deals contributing.", KpiValueStatus.APPROVED],
      [6,  78, "Q3 2024 — Strong performance.", KpiValueStatus.APPROVED],
      [3,  87, "Q4 2024 — ROI reaching ~17.4%.", KpiValueStatus.APPROVED],
      [0,  92, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_2_2", submittedBy: uInvest.id, periods: [
      [12, 55, "Q1 2024 — Annual compound return 55% of target.", KpiValueStatus.APPROVED],
      [9,  66, "Q2 2024 — Compounding effect strengthening.", KpiValueStatus.APPROVED],
      [6,  76, "Q3 2024 — Good trajectory.", KpiValueStatus.APPROVED],
      [3,  85, "Q4 2024 — On track for target.", KpiValueStatus.APPROVED],
      [0,  90, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_2_3", submittedBy: uInvest.id, periods: [
      [12, 62, "Q1 2024 — Diversification ratio at 62%.", KpiValueStatus.APPROVED],
      [9,  72, "Q2 2024 — Portfolio more diversified.", KpiValueStatus.APPROVED],
      [6,  80, "Q3 2024 — Good spread across sectors.", KpiValueStatus.APPROVED],
      [3,  88, "Q4 2024 — Strong diversification.", KpiValueStatus.APPROVED],
      [0,  92, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_2_4", submittedBy: uInvest.id, periods: [
      [12, 60, "Q1 2024 — New investments contributing 60% of target.", KpiValueStatus.APPROVED],
      [9,  71, "Q2 2024 — Growing contribution.", KpiValueStatus.APPROVED],
      [6,  79, "Q3 2024 — Improving.", KpiValueStatus.APPROVED],
      [3,  86, "Q4 2024 — Strong.", KpiValueStatus.APPROVED],
      [0,  91, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_2_5", submittedBy: uInvest.id, periods: [
      [12, 65, "Q1 2024 — 65% of investments achieving target return.", KpiValueStatus.APPROVED],
      [9,  74, "Q2 2024 — More investments maturing.", KpiValueStatus.APPROVED],
      [6,  82, "Q3 2024 — Strong performance.", KpiValueStatus.APPROVED],
      [3,  89, "Q4 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,  93, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},

    // Goal 3: Sustainable revenues SAR 200M
    { key: "objective_kpi_3_1", submittedBy: uFinance.id, periods: [
      [12, 55, "Q1 2024 — Total revenues at 55% of SAR 200M target.", KpiValueStatus.APPROVED],
      [9,  65, "Q2 2024 — Revenue growth accelerating.", KpiValueStatus.APPROVED],
      [6,  75, "Q3 2024 — SAR 150M run-rate.", KpiValueStatus.APPROVED],
      [3,  85, "Q4 2024 — SAR 170M achieved.", KpiValueStatus.APPROVED],
      [0,  90, "Q1 2025 — SAR 180M projected. Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_3_2", submittedBy: uFinance.id, periods: [
      [12, 50, "Q1 2024 — 50% sustainable revenue ratio.", KpiValueStatus.APPROVED],
      [9,  62, "Q2 2024 — Recurring revenue base growing.", KpiValueStatus.APPROVED],
      [6,  72, "Q3 2024 — Good progress.", KpiValueStatus.APPROVED],
      [3,  82, "Q4 2024 — Strong sustainable revenue mix.", KpiValueStatus.APPROVED],
      [0,  88, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_3_3", submittedBy: uFinance.id, periods: [
      [12, 15, "Q1 2024 — 15% deviation from revenue target (lower is better).", KpiValueStatus.APPROVED],
      [9,  11, "Q2 2024 — Gap narrowing.", KpiValueStatus.APPROVED],
      [6,   7, "Q3 2024 — On track.", KpiValueStatus.APPROVED],
      [3,   4, "Q4 2024 — Very close to target.", KpiValueStatus.APPROVED],
      [0,   3, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_3_4", submittedBy: uFinance.id, periods: [
      [12, 48, "Q1 2024 — New sectors contributing 48% to sustainable revenues.", KpiValueStatus.APPROVED],
      [9,  60, "Q2 2024 — Growing share.", KpiValueStatus.APPROVED],
      [6,  70, "Q3 2024 — Good.", KpiValueStatus.APPROVED],
      [3,  80, "Q4 2024 — Strong.", KpiValueStatus.APPROVED],
      [0,  86, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},

    // Goal 4: Financial discipline
    { key: "objective_kpi_4_1", submittedBy: uFinance.id, periods: [
      [12, 70, "Q1 2024 — 70% system compliance rate.", KpiValueStatus.APPROVED],
      [9,  78, "Q2 2024 — Training programs conducted.", KpiValueStatus.APPROVED],
      [6,  85, "Q3 2024 — System adoption improving.", KpiValueStatus.APPROVED],
      [3,  91, "Q4 2024 — Strong compliance.", KpiValueStatus.APPROVED],
      [0,  94, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_4_2", submittedBy: uFinance.id, periods: [
      [12, 12, "Q1 2024 — 12% financial deviation rate (lower is better).", KpiValueStatus.APPROVED],
      [9,   9, "Q2 2024 — Controls tightened.", KpiValueStatus.APPROVED],
      [6,   6, "Q3 2024 — Significantly reduced.", KpiValueStatus.APPROVED],
      [3,   4, "Q4 2024 — Well controlled.", KpiValueStatus.APPROVED],
      [0,   3, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_4_3", submittedBy: uFinance.id, periods: [
      [12, 65, "Q1 2024 — 65% reduction rate in financial deviations.", KpiValueStatus.APPROVED],
      [9,  73, "Q2 2024 — Better controls.", KpiValueStatus.APPROVED],
      [6,  81, "Q3 2024 — Good progress.", KpiValueStatus.APPROVED],
      [3,  88, "Q4 2024 — Strong.", KpiValueStatus.APPROVED],
      [0,  92, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_4_4", submittedBy: uFinance.id, periods: [
      [12, 60, "Q1 2024 — 60% decrease in unjustified expenses.", KpiValueStatus.APPROVED],
      [9,  70, "Q2 2024 — Expense review process implemented.", KpiValueStatus.APPROVED],
      [6,  79, "Q3 2024 — Good reduction.", KpiValueStatus.APPROVED],
      [3,  87, "Q4 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,  91, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_4_5", submittedBy: uFinance.id, periods: [
      [12, 68, "Q1 2024 — 68% unified financial reports achieved.", KpiValueStatus.APPROVED],
      [9,  76, "Q2 2024 — More subsidiaries integrated.", KpiValueStatus.APPROVED],
      [6,  83, "Q3 2024 — Good.", KpiValueStatus.APPROVED],
      [3,  90, "Q4 2024 — Near full unification.", KpiValueStatus.APPROVED],
      [0,  93, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},

    // Goal 5: Listing readiness
    { key: "objective_kpi_5_1", submittedBy: uGov.id, periods: [
      [12, 60, "Q1 2024 — 60% listing readiness compliance.", KpiValueStatus.APPROVED],
      [9,  70, "Q2 2024 — Governance framework updated.", KpiValueStatus.APPROVED],
      [6,  78, "Q3 2024 — Board structure enhanced.", KpiValueStatus.APPROVED],
      [3,  85, "Q4 2024 — Near readiness milestone.", KpiValueStatus.APPROVED],
      [0,  89, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_5_2", submittedBy: uGov.id, periods: [
      [12, 55, "Q1 2024 — 55% operating model activated.", KpiValueStatus.APPROVED],
      [9,  66, "Q2 2024 — Key functions operationalized.", KpiValueStatus.APPROVED],
      [6,  75, "Q3 2024 — Subsidiaries activated.", KpiValueStatus.APPROVED],
      [3,  84, "Q4 2024 — Strong activation.", KpiValueStatus.APPROVED],
      [0,  88, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_5_3", submittedBy: uAudit.id, periods: [
      [12, 65, "Q1 2024 — 65% successful reviews target.", KpiValueStatus.APPROVED],
      [9,  74, "Q2 2024 — External auditor findings resolved.", KpiValueStatus.APPROVED],
      [6,  82, "Q3 2024 — Internal audit quality improving.", KpiValueStatus.APPROVED],
      [3,  89, "Q4 2024 — Strong audit outcomes.", KpiValueStatus.APPROVED],
      [0,  93, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},

    // Goal 6: Employee productivity 85%
    { key: "objective_kpi_6_1", submittedBy: uStrategy.id, periods: [
      [12, 62, "Q1 2024 — 62% training participation rate.", KpiValueStatus.APPROVED],
      [9,  70, "Q2 2024 — New L&D programs launched.", KpiValueStatus.APPROVED],
      [6,  76, "Q3 2024 — Mandatory training completed.", KpiValueStatus.APPROVED],
      [3,  82, "Q4 2024 — Strong participation.", KpiValueStatus.APPROVED],
      [0,  86, "Q1 2025 — Target reached. Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_6_2", submittedBy: uStrategy.id, periods: [
      [12, 58, "Q1 2024 — 58% productivity improvement post-training.", KpiValueStatus.APPROVED],
      [9,  67, "Q2 2024 — Training ROI visible.", KpiValueStatus.APPROVED],
      [6,  74, "Q3 2024 — Productivity gains confirmed.", KpiValueStatus.APPROVED],
      [3,  81, "Q4 2024 — Strong improvement.", KpiValueStatus.APPROVED],
      [0,  85, "Q1 2025 — Target hit! Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_6_3", submittedBy: uStrategy.id, periods: [
      [12, 65, "Q1 2024 — 65% task timeline compliance.", KpiValueStatus.APPROVED],
      [9,  72, "Q2 2024 — Project management tools deployed.", KpiValueStatus.APPROVED],
      [6,  79, "Q3 2024 — Improving delivery.", KpiValueStatus.APPROVED],
      [3,  84, "Q4 2024 — Near target.", KpiValueStatus.APPROVED],
      [0,  87, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_6_4", submittedBy: uStrategy.id, periods: [
      [12, 60, "Q1 2024 — Organizational culture index 60%.", KpiValueStatus.APPROVED],
      [9,  68, "Q2 2024 — Culture initiatives launched.", KpiValueStatus.APPROVED],
      [6,  75, "Q3 2024 — Employee engagement improving.", KpiValueStatus.APPROVED],
      [3,  82, "Q4 2024 — Culture score improving.", KpiValueStatus.APPROVED],
      [0,  85, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},

    // Goal 7: Brand awareness
    { key: "objective_kpi_7_1", submittedBy: uComm.id, periods: [
      [12, 58, "Q1 2024 — Brand awareness index 58%.", KpiValueStatus.APPROVED],
      [9,  66, "Q2 2024 — PR campaigns running.", KpiValueStatus.APPROVED],
      [6,  74, "Q3 2024 — Social media reach growing.", KpiValueStatus.APPROVED],
      [3,  82, "Q4 2024 — Brand recognition strong.", KpiValueStatus.APPROVED],
      [0,  87, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_7_2", submittedBy: uComm.id, periods: [
      [12, 55, "Q1 2024 — 55% events participation target.", KpiValueStatus.APPROVED],
      [9,  65, "Q2 2024 — Attended 3 major conferences.", KpiValueStatus.APPROVED],
      [6,  75, "Q3 2024 — Participated in 2 industry expos.", KpiValueStatus.APPROVED],
      [3,  85, "Q4 2024 — Strong year-end presence.", KpiValueStatus.APPROVED],
      [0,  90, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_7_3", submittedBy: uComm.id, periods: [
      [12, 52, "Q1 2024 — 52% digital interaction rate.", KpiValueStatus.APPROVED],
      [9,  62, "Q2 2024 — Social media engagement improving.", KpiValueStatus.APPROVED],
      [6,  72, "Q3 2024 — Digital campaigns performing well.", KpiValueStatus.APPROVED],
      [3,  80, "Q4 2024 — Strong digital presence.", KpiValueStatus.APPROVED],
      [0,  85, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
    { key: "objective_kpi_7_4", submittedBy: uComm.id, periods: [
      [12, 60, "Q1 2024 — 60% marketing campaign target.", KpiValueStatus.APPROVED],
      [9,  70, "Q2 2024 — Ramadan & National Day campaigns.", KpiValueStatus.APPROVED],
      [6,  78, "Q3 2024 — 7 campaigns executed.", KpiValueStatus.APPROVED],
      [3,  88, "Q4 2024 — 9 campaigns this year.", KpiValueStatus.APPROVED],
      [0,  92, "Q1 2025 — Submitted.", KpiValueStatus.SUBMITTED],
    ]},
  ];

  for (const def of objectiveValueDefs) {
    totalValues += await seedValues(def);
  }
  console.log(`✅ Seeded ${totalValues} KPI values total (departments + objectives).`);

  // ── 7.5. Compute derived entity values (after KPI values are seeded) ──────────
  console.log("📐 Computing derived entity values (departments, objectives, initiatives, pillars)...");

  const kpiValueMap = new Map<string, number>();
  const allKpiEntities = await prisma.entity.findMany({
    where: { orgId: org.id, deletedAt: null },
    select: {
      key: true,
      values: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { actualValue: true, calculatedValue: true, finalValue: true },
      },
    },
  });
  for (const e of allKpiEntities) {
    if (!e.key) continue;
    const v = e.values[0];
    if (!v) continue;
    const val = v.finalValue ?? v.calculatedValue ?? v.actualValue;
    if (typeof val === "number" && Number.isFinite(val)) {
      kpiValueMap.set(e.key, val);
    }
  }

  function evalFormula(formula: string, valMap: Map<string, number>): number | null {
    if (!formula) return null;
    try {
      const resolved = formula.replace(/get\(["']([^"']+)["']\)/g, (_match, key: string) => {
        return String(valMap.get(key) ?? 0);
      });
      if (/[^0-9+\-*/().\s]/.test(resolved)) return null;
      // eslint-disable-next-line no-eval
      const result = eval(resolved) as number;
      return Number.isFinite(result) ? result : null;
    } catch {
      return null;
    }
  }

  function derivedSortOrder(key: string | null): number {
    if (!key) return 99;
    if (key.startsWith("objective_kpi_")) return 2;
    if (key.startsWith("dept_")) return 1;
    if (key.startsWith("objective_")) return 3;
    if (key.startsWith("initiative_") && key.includes("_kpi_")) return 1;
    if (key.startsWith("initiative_")) return 4;
    if (key.startsWith("pillar_")) return 5;
    return 2;
  }

  const derivedEntities = await prisma.entity.findMany({
    where: { orgId: org.id, deletedAt: null, sourceType: "DERIVED" },
    select: { id: true, key: true, formula: true, targetValue: true },
    orderBy: { createdAt: "asc" },
  });
  derivedEntities.sort((a, b) => derivedSortOrder(a.key) - derivedSortOrder(b.key));

  let derivedCount = 0;
  for (const e of derivedEntities) {
    if (!e.formula || !e.key) continue;
    const computedValue = evalFormula(e.formula, kpiValueMap);
    if (computedValue === null) continue;
    kpiValueMap.set(e.key, computedValue);

    const existingValue = await prisma.entityValue.findFirst({
      where: { entityId: e.id },
      select: { id: true },
    });
    if (existingValue) {
      await prisma.entityValue.update({
        where: { id: existingValue.id },
        data: {
          calculatedValue: computedValue,
          finalValue: computedValue,
          achievementValue: e.targetValue ? (computedValue / e.targetValue) * 100 : null,
          status: KpiValueStatus.APPROVED,
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      });
    } else {
      await prisma.entityValue.create({
        data: {
          entityId: e.id,
          calculatedValue: computedValue,
          finalValue: computedValue,
          achievementValue: e.targetValue ? (computedValue / e.targetValue) * 100 : null,
          status: KpiValueStatus.APPROVED,
          approvalType: KpiApprovalType.AUTO,
          approvedBy: adminId,
          approvedAt: new Date(),
          createdAt: daysAgo(1),
        },
      });
    }
    derivedCount++;
  }
  console.log(`✅ Computed and seeded ${derivedCount} derived entity values.`);

  // ── 8. Notifications ─────────────────────────────────────────────────────────
  console.log("🔔 Seeding notifications...");

  // Wipe existing notifications for this org first
  await prisma.notification.deleteMany({ where: { orgId: org.id } });

  // ... rest of the code remains the same ...
  type NotifDef = {
    userId: string; type: NotificationType; entityKey: string;
    message: string; messageAr: string; readAt: Date | null; createdAt: Date;
  };

  // Build a lookup: entityKey → entityId
  async function entityIdByKey(key: string): Promise<string | null> {
    const e = await prisma.entity.findFirst({ where: { orgId: org.id, key }, select: { id: true } });
    return e?.id ?? null;
  }

  const notifDefs: NotifDef[] = [
    // ── APPROVAL_PENDING — sent to admin for each current SUBMITTED value ─────
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "strategy_dept_kpi_1",       message: "Khalid Al-Ghamdi submitted Strategy KPI-1 (Strategic Goals Achievement) for approval.",        messageAr: "خالد الغامدي أرسل مؤشر الاستراتيجية 1 للاعتماد.",         readAt: null,        createdAt: daysAgo(2) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "strategy_dept_kpi_2",       message: "Khalid Al-Ghamdi submitted Strategy KPI-2 (Initiatives On-Time) for approval.",               messageAr: "خالد الغامدي أرسل مؤشر الاستراتيجية 2 للاعتماد.",         readAt: null,        createdAt: daysAgo(2) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "investment_dept_kpi_1",     message: "Faisal Al-Muqrin submitted Investment KPI-1 (New Sectors) for approval.",                      messageAr: "فيصل المقرن أرسل مؤشر الاستثمار 1 (قطاعات جديدة) للاعتماد.", readAt: null,      createdAt: daysAgo(1) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "investment_dept_kpi_2",     message: "Faisal Al-Muqrin submitted Investment KPI-2 (Total New Investments) for approval.",             messageAr: "فيصل المقرن أرسل مؤشر الاستثمار 2 للاعتماد.",            readAt: null,        createdAt: daysAgo(1) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "investment_dept_kpi_5",     message: "Faisal Al-Muqrin submitted Investment KPI-5 (Target Return %) for approval.",                  messageAr: "فيصل المقرن أرسل مؤشر الاستثمار 5 للاعتماد.",            readAt: null,        createdAt: daysAgo(1) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "finance_dept_kpi_2",        message: "Rania Al-Zahrani submitted Finance KPI-2 (Budget Compliance) for approval.",                   messageAr: "رانيا الزهراني أرسلت مؤشر المالية 2 (الالتزام بالميزانية) للاعتماد.", readAt: null, createdAt: daysAgo(3) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "finance_dept_kpi_7",        message: "Rania Al-Zahrani submitted Finance KPI-7 (Return on Assets) for approval.",                    messageAr: "رانيا الزهراني أرسلت مؤشر المالية 7 (العائد على الأصول) للاعتماد.", readAt: null, createdAt: daysAgo(3) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "internal_audit_dept_kpi_1", message: "Tariq Al-Shamri submitted Audit KPI-1 (Audit Plans Completed) for approval.",                 messageAr: "طارق الشمري أرسل مؤشر التدقيق 1 للاعتماد.",              readAt: null,        createdAt: daysAgo(4) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "internal_audit_dept_kpi_6", message: "Tariq Al-Shamri submitted Audit KPI-6 (Recommendations Implemented) for approval.",           messageAr: "طارق الشمري أرسل مؤشر التدقيق 6 للاعتماد.",              readAt: null,        createdAt: daysAgo(4) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "governance_dept_kpi_3",     message: "Lina Al-Dosari submitted Governance KPI-3 (Internal Compliance Rate) for approval.",           messageAr: "لينا الدوسري أرسلت مؤشر الحوكمة 3 للاعتماد.",            readAt: null,        createdAt: daysAgo(5) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "governance_dept_kpi_5",     message: "Lina Al-Dosari submitted Governance KPI-5 (Risk Mitigation Rate) for approval.",               messageAr: "لينا الدوسري أرسلت مؤشر الحوكمة 5 للاعتماد.",            readAt: null,        createdAt: daysAgo(5) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "communication_dept_kpi_1",  message: "Sara Al-Otaibi submitted Communication KPI-1 (On-Time Response Rate) for approval.",           messageAr: "سارة العتيبي أرسلت مؤشر التواصل 1 للاعتماد.",            readAt: null,        createdAt: daysAgo(2) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "communication_dept_kpi_7",  message: "Sara Al-Otaibi submitted Communication KPI-7 (Campaign Objectives) for approval.",             messageAr: "سارة العتيبي أرسلت مؤشر التواصل 7 للاعتماد.",            readAt: null,        createdAt: daysAgo(2) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "legal_dept_kpi_1",          message: "Omar Al-Rashidi submitted Legal KPI-1 (Contracts Reviewed) for approval.",                     messageAr: "عمر الراشدي أرسل مؤشر القانونية 1 للاعتماد.",            readAt: null,        createdAt: daysAgo(3) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "legal_dept_kpi_3",          message: "Omar Al-Rashidi submitted Legal KPI-3 (Regulatory Compliance) for approval.",                  messageAr: "عمر الراشدي أرسل مؤشر القانونية 3 للاعتماد.",            readAt: null,        createdAt: daysAgo(3) },
    { userId: adminId, type: NotificationType.APPROVAL_PENDING, entityKey: "support_services_dept_kpi_1", message: "Nasser Al-Harthy submitted Support KPI-1 (Internal Satisfaction) for approval.",            messageAr: "ناصر الحارثي أرسل مؤشر الخدمات المساندة 1 للاعتماد.",    readAt: null,        createdAt: daysAgo(2) },

    // ── VALUE_APPROVED — sent to submitters for prior quarter approvals ────────
    { userId: uStrategy.id, type: NotificationType.VALUE_APPROVED, entityKey: "strategy_dept_kpi_1", message: "Your Q4 2024 submission for Strategy KPI-1 (Strategic Goals 85%) was approved.",    messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر الاستراتيجية 1 (85%).",  readAt: daysAgo(5),  createdAt: monthsAgo(3) },
    { userId: uStrategy.id, type: NotificationType.VALUE_APPROVED, entityKey: "strategy_dept_kpi_2", message: "Your Q4 2024 submission for Strategy KPI-2 (Initiatives 78%) was approved.",        messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر الاستراتيجية 2 (78%).",  readAt: null,        createdAt: monthsAgo(3) },
    { userId: uInvest.id,   type: NotificationType.VALUE_APPROVED, entityKey: "investment_dept_kpi_1", message: "Your Q4 2024 submission for Investment KPI-1 (6 sectors) was approved.",          messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر الاستثمار 1 (6 قطاعات).", readAt: daysAgo(2),  createdAt: monthsAgo(3) },
    { userId: uInvest.id,   type: NotificationType.VALUE_APPROVED, entityKey: "investment_dept_kpi_5", message: "Your Q4 2024 submission for Investment KPI-5 (92%) was approved.",                messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر الاستثمار 5 (92%).",    readAt: null,        createdAt: monthsAgo(3) },
    { userId: uInvest.id,   type: NotificationType.VALUE_APPROVED, entityKey: "investment_dept_kpi_10", message: "Your Q4 2024 submission for Investment KPI-10 (62 days) was approved.",          messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر الاستثمار 10 (62 يوم).", readAt: daysAgo(1),  createdAt: monthsAgo(3) },
    { userId: uFinance.id,  type: NotificationType.VALUE_APPROVED, entityKey: "finance_dept_kpi_2",   message: "Your Q4 2024 submission for Finance KPI-2 (Budget Compliance 95%) was approved.",  messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر المالية 2 (95%).",       readAt: null,        createdAt: monthsAgo(3) },
    { userId: uFinance.id,  type: NotificationType.VALUE_APPROVED, entityKey: "finance_dept_kpi_4",   message: "Your Q4 2024 submission for Finance KPI-4 (Liquidity 2.0) was approved.",          messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر المالية 4 (2.0).",       readAt: daysAgo(7),  createdAt: monthsAgo(3) },
    { userId: uAudit.id,    type: NotificationType.VALUE_APPROVED, entityKey: "internal_audit_dept_kpi_1", message: "Your Q4 2024 submission for Audit KPI-1 (92% plans) was approved.",          messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر التدقيق 1 (92%).",      readAt: null,        createdAt: monthsAgo(3) },
    { userId: uAudit.id,    type: NotificationType.VALUE_APPROVED, entityKey: "internal_audit_dept_kpi_3", message: "Your Q4 2024 submission for Audit KPI-3 (Overdue 6%) was approved.",          messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر التدقيق 3 (6%).",       readAt: daysAgo(3),  createdAt: monthsAgo(3) },
    { userId: uGov.id,      type: NotificationType.VALUE_APPROVED, entityKey: "governance_dept_kpi_3", message: "Your Q4 2024 submission for Governance KPI-3 (Compliance 93%) was approved.",    messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر الحوكمة 3 (93%).",      readAt: null,        createdAt: monthsAgo(3) },
    { userId: uGov.id,      type: NotificationType.VALUE_APPROVED, entityKey: "governance_dept_kpi_4", message: "Your Q4 2024 submission for Governance KPI-4 (High-Risk: 4) was approved.",      messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر الحوكمة 4 (4 مخاطر).",  readAt: daysAgo(10), createdAt: monthsAgo(3) },
    { userId: uComm.id,     type: NotificationType.VALUE_APPROVED, entityKey: "communication_dept_kpi_7", message: "Your Q4 2024 submission for Communication KPI-7 (82%) was approved.",         messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر التواصل 7 (82%).",      readAt: null,        createdAt: monthsAgo(3) },
    { userId: uLegal.id,    type: NotificationType.VALUE_APPROVED, entityKey: "legal_dept_kpi_1",      message: "Your Q4 2024 submission for Legal KPI-1 (94% contracts reviewed) was approved.", messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر القانونية 1 (94%).",    readAt: daysAgo(4),  createdAt: monthsAgo(3) },
    { userId: uSupport.id,  type: NotificationType.VALUE_APPROVED, entityKey: "support_services_dept_kpi_1", message: "Your Q4 2024 submission for Support KPI-1 (Satisfaction 87%) was approved.", messageAr: "تم اعتماد تقديمك للربع الرابع 2024 لمؤشر الخدمات المساندة 1 (87%).", readAt: null, createdAt: monthsAgo(3) },

    // ── VALUE_REJECTED — two rejected values for testing the rejection path ────
    { userId: uInvest.id,  type: NotificationType.VALUE_REJECTED, entityKey: "investment_dept_kpi_3", message: "Your Q2 2024 submission for Investment KPI-3 (Unutilized Opportunities) was rejected. Reason: Data source not verified. Please resubmit with audited figures.", messageAr: "تم رفض تقديمك لمؤشر الاستثمار 3 (ق2 2024). السبب: لم يتم التحقق من مصدر البيانات. يرجى إعادة التقديم بأرقام مدققة.", readAt: null,       createdAt: monthsAgo(9) },
    { userId: uFinance.id, type: NotificationType.VALUE_REJECTED, entityKey: "finance_dept_kpi_1",   message: "Your Q1 2024 submission for Finance KPI-1 (Budget Variance) was rejected. Reason: Calculation methodology inconsistent with prior periods.", messageAr: "تم رفض تقديمك لمؤشر المالية 1 (ق1 2024). السبب: منهجية الحساب غير متسقة مع الفترات السابقة.", readAt: daysAgo(30), createdAt: monthsAgo(12) },

    // ── CEO summary notifications ─────────────────────────────────────────────
    { userId: uCeo.id, type: NotificationType.VALUE_APPROVED, entityKey: "investment_dept_kpi_7", message: "Investment Portfolio reached SAR 1.05B in H1 2025 — approved.", messageAr: "بلغت المحفظة الاستثمارية 1.05 مليار ريال في النصف الأول 2025 — تم الاعتماد.", readAt: null,       createdAt: daysAgo(1) },
    { userId: uCeo.id, type: NotificationType.APPROVAL_PENDING, entityKey: "strategy_dept_kpi_1", message: "Q1 2025 Strategy scorecard awaiting your review.",                                   messageAr: "بطاقة الأداء الاستراتيجية للربع الأول 2025 بانتظار مراجعتك.",           readAt: null,       createdAt: daysAgo(2) },
    { userId: uCeo.id, type: NotificationType.VALUE_APPROVED,   entityKey: "governance_dept_kpi_3", message: "Governance Compliance reached 93% (Q4 2024) — approved.",                         messageAr: "بلغ الامتثال للحوكمة 93% (ق4 2024) — تم الاعتماد.",                   readAt: daysAgo(5), createdAt: monthsAgo(3) },
  ];

  let notifCount = 0;
  for (const n of notifDefs) {
    const entityId = await entityIdByKey(n.entityKey);
    if (!entityId) continue;
    await prisma.notification.create({
      data: {
        userId: n.userId,
        orgId: org.id,
        type: n.type,
        entityId,
        message: n.message,
        messageAr: n.messageAr,
        readAt: n.readAt,
        createdAt: n.createdAt,
      },
    });
    notifCount++;
  }

  const unreadCount = notifDefs.filter((n) => !n.readAt).length;
  console.log(`✅ Seeded ${notifCount} notifications (${unreadCount} unread).`);

  console.log(`
✨ Mosa Raw Data Seed Complete
   Org domain  : ${domain}
   Password    : ${password}
   Users
     o.alharbi@almosa.com.sa      → ADMIN
     m.alamri@almosa.com.sa       → ADMIN
     ceo@almosa.com.sa            → EXECUTIVE (Group CEO)
     strategy@almosa.com.sa       → MANAGER  (Head of Strategy)
     investment@almosa.com.sa     → MANAGER  (Head of Investment)
     finance@almosa.com.sa        → MANAGER  (CFO)
     support@almosa.com.sa        → MANAGER  (Head of Support)
     audit@almosa.com.sa          → MANAGER  (Head of Internal Audit)
     governance@almosa.com.sa     → MANAGER  (Head of Governance & Risk)
     communication@almosa.com.sa  → MANAGER  (Head of Communication)
     legal@almosa.com.sa          → MANAGER  (General Counsel)
   KPI values  : ${totalValues} (APPROVED history + SUBMITTED current per KPI)
   Assignments : ${assignCount} user-entity assignments
   Notifications: ${notifCount} total, ${unreadCount} unread
  `);
}

seed()
  .then(() => {
    console.log("✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
