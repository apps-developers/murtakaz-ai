import {
  PrismaClient,
  KpiAggregationMethod,
  KpiDirection,
  KpiIndicatorType,
  KpiPeriodType,
  KpiSourceType,
  KpiApprovalLevel,
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

  console.log("✨ Seed complete!");
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
