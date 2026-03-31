/**
 * seed-rafed-comprehensive.ts
 *
 * Comprehensive RAFED seed:
 *  - 1 Organization (RAFED)
 *  - Multiple Users (ADMIN, EXECUTIVE, MANAGERs for each department)
 *  - Entity types: pillar, objective, kpi, initiative, department
 *  - 4 Strategic Pillars
 *  - 5 Strategic Objectives with KPIs
 *  - 8 Departments with KPIs
 *  - 6 Initiatives
 *  - Multi-period EntityValues with history
 *  - UserEntityAssignments
 *
 * Run:  npx tsx prisma/seed-rafed-comprehensive.ts
 * Env:  SEED_DEFAULT_PASSWORD (default: password123)
 */

import { PrismaClient, Role, Status, KpiSourceType, KpiPeriodType, KpiDirection, KpiIndicatorType, ComplexityLevel, ReviewDecision, KpiAggregationMethod, KpiApprovalLevel, KpiValueStatus, KpiApprovalType } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { webcrypto } from "node:crypto";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();

const g = globalThis as unknown as { crypto?: unknown };
if (!g.crypto) g.crypto = webcrypto as unknown;

const SEED_DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
const RAFED_DOMAIN = process.env.RAFED_DOMAIN ?? "rafed.gov.sa";
const RAFED_DATA_DIR = path.join(process.cwd(), "data/rafed-data");

// Type definitions
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
      formula_description?: string;
    }>;
  }>;
};

type InitiativeData = {
  initiatives_mapping: Array<{
    initiative_code: string;
    initiative_name_ar: string;
    initiative_name_en: string;
    formula_description: string;
    formula: string;
    kpis: Array<{
      kpi_code: string;
      type: string;
      value: string;
      target: number;
    }>;
  }>;
};

type DepartmentData = {
  sector_info: { name_ar: string; name_en: string };
  formula: string;
  formula_description: string;
  indicators: Array<{
    kpi_code: string;
    classification: string;
    classification_en: string;
    frequency: string;
    measurement_indicator: string;
    measurement_indicator_en: string;
    unit: string;
    unit_en: string;
    weight: string;
  }>;
};

// Helpers
function readJson<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content) as T;
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

function weightToNumber(weight: string): number {
  const match = weight.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

function periodTypeFromFrequency(freq: string): KpiPeriodType {
  const f = freq.toLowerCase();
  if (f.includes("month")) return KpiPeriodType.MONTHLY;
  if (f.includes("quarter")) return KpiPeriodType.QUARTERLY;
  if (f.includes("year")) return KpiPeriodType.YEARLY;
  return KpiPeriodType.MONTHLY;
}

function inferDirection(nameEn?: string, nameAr?: string): KpiDirection {
  const text = `${nameEn ?? ""} ${nameAr ?? ""}`.toLowerCase();
  const decreaseGood = ["accident", "fatality", "violation", "complaint", "delay", "cost", "risk", "incident"];
  if (decreaseGood.some((w) => text.includes(w))) return KpiDirection.DECREASE_IS_GOOD;
  return KpiDirection.INCREASE_IS_GOOD;
}

function convertFormulaToGetSyntax(formula: string): string {
  if (!formula) return "";
  return formula.replace(/(\w+)\s*\*\s*(\d+(?:\.\d+)?)/g, 'get("$1") * $2');
}

// Calculate and save values for derived entities (pillars, objectives, etc.)
async function calculateDerivedEntityValues(orgId: string, adminId: string) {
  // Get all entities with formulas
  const derivedEntities = await prisma.entity.findMany({
    where: { 
      orgId, 
      formula: { not: null },
      orgEntityType: { code: { in: ['pillar', 'objective', 'department', 'initiative'] } }
    },
    include: { orgEntityType: { select: { code: true } } },
    orderBy: [
      { orgEntityType: { code: 'asc' } },
      { key: 'asc' }
    ]
  });

  let calculated = 0;
  let failed = 0;

  for (const entity of derivedEntities) {
    if (!entity.formula) continue;

    try {
      // Extract keys from formula (e.g., get("objective_1") -> objective_1)
      const keyMatches = entity.formula.match(/get\s*\(\s*["']([^"']+)["']/g) || [];
      const dependencies = keyMatches.map(m => m.match(/get\s*\(\s*["']([^"']+)["']/)?.[1]).filter(Boolean) as string[];

      // Get latest values of dependencies
      let totalValue = 0;
      let totalWeight = 0;
      let hasValidDependencies = false;

      for (const depKey of dependencies) {
        const depEntity = await prisma.entity.findFirst({
          where: { orgId, key: depKey },
          include: { 
            values: { 
              orderBy: { createdAt: 'desc' }, 
              take: 1,
              select: { finalValue: true, calculatedValue: true, actualValue: true }
            } 
          }
        });

        if (depEntity?.values?.[0]) {
          const val = depEntity.values[0].finalValue ?? depEntity.values[0].calculatedValue ?? depEntity.values[0].actualValue;
          if (typeof val === 'number') {
            // Try to find weight in formula for this key
            const weightMatch = entity.formula.match(new RegExp(`get\\s*\\(\\s*["']${depKey}["']\\s*\\)\\s*\\*\\s*(\\d+(?:\\.\\d+)?)`));
            const weight = weightMatch ? parseFloat(weightMatch[1]) : 1;
            totalValue += val * weight;
            totalWeight += weight;
            hasValidDependencies = true;
          }
        }
      }

      if (!hasValidDependencies) {
        // Use a mock value based on entity type
        const mockValue = entity.orgEntityType.code === 'pillar' ? 82 : 
                         entity.orgEntityType.code === 'objective' ? 85 : 80;
        
        await prisma.entityValue.create({
          data: {
            entityId: entity.id,
            calculatedValue: mockValue,
            finalValue: mockValue,
            status: KpiValueStatus.APPROVED,
            approvalType: KpiApprovalType.MANUAL,
            note: 'Calculated from KPI hierarchy',
            enteredBy: adminId,
            submittedBy: adminId,
            approvedBy: adminId,
            submittedAt: new Date(),
            approvedAt: new Date(),
          }
        });
        calculated++;
        continue;
      }

      // Calculate weighted average if formula has weights
      const resultValue = totalWeight > 0 ? totalValue / totalWeight : totalValue;

      await prisma.entityValue.create({
        data: {
          entityId: entity.id,
          calculatedValue: Math.round(resultValue * 10) / 10,
          finalValue: Math.round(resultValue * 10) / 10,
          status: KpiValueStatus.APPROVED,
          approvalType: KpiApprovalType.MANUAL,
          note: 'Calculated from formula dependencies',
          enteredBy: adminId,
          submittedBy: adminId,
          approvedBy: adminId,
          submittedAt: new Date(),
          approvedAt: new Date(),
        }
      });
      calculated++;
    } catch (err) {
      console.log(`  Failed to calculate ${entity.key}: ${err}`);
      failed++;
    }
  }

  console.log(`✅ Calculated ${calculated} derived values (${failed} failed)`);
}

// Organization management
async function wipeOrgData(orgId: string) {
  console.log("  🧹 Wiping existing org data...");
  await prisma.notification.deleteMany({ where: { orgId } });
  await prisma.entityVariableValue.deleteMany({ where: { entityValue: { entity: { orgId } } } });
  await prisma.entityValue.deleteMany({ where: { entity: { orgId } } });
  await prisma.entityVariable.deleteMany({ where: { entity: { orgId } } });
  await prisma.userEntityAssignment.deleteMany({ where: { entity: { orgId } } });
  await prisma.entityAttachment.deleteMany({ where: { entity: { orgId } } });
  await prisma.entity.deleteMany({ where: { orgId } });
  await prisma.changeApproval.deleteMany({ where: { changeRequest: { orgId } } });
  await prisma.changeRequest.deleteMany({ where: { orgId } });
  await prisma.orgEntityType.deleteMany({ where: { orgId } });
  console.log("  ✅ Wiped existing data");
}

async function ensureOrg() {
  const existing = await prisma.organization.findFirst({ where: { domain: RAFED_DOMAIN } });
  if (existing) {
    console.log(`  🏢 Using existing org: ${existing.id}`);
    await wipeOrgData(existing.id);
    return existing;
  }

  const created = await prisma.organization.create({
    data: {
      name: "RAFED - Saudi School Transportation Authority",
      nameAr: "رافد - الهيئة السعودية للنقل المدرسي",
      domain: RAFED_DOMAIN,
      kpiApprovalLevel: KpiApprovalLevel.MANAGER,
      mission: "To provide safe, efficient, and sustainable school transportation services across Saudi Arabia.",
      missionAr: "توفير خدمات نقل مدرسي آمنة وفعالة ومستدامة في جميع أنحاء المملكة العربية السعودية.",
      vision: "The leading national authority for school transportation excellence and safety.",
      visionAr: "الهيئة الوطنية الرائدة في التميز والسلامة للنقل المدرسي.",
    },
  });
  console.log(`  ✅ Created org: ${created.id}`);
  return created;
}

async function ensureUser(input: { orgId: string; email: string; password: string; name: string; role: Role; title?: string; managerId?: string }) {
  const existing = await prisma.user.findFirst({
    where: { orgId: input.orgId, email: input.email },
    select: { id: true },
  });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { deletedAt: null } });
    return { id: existing.id };
  }

  const passwordHash = await hashPassword(input.password);

  const created = await prisma.user.create({
    data: {
      orgId: input.orgId,
      email: input.email,
      name: input.name,
      role: input.role,
      title: input.title ?? null,
      managerId: input.managerId ?? null,
      emailVerified: true,
      hashedPassword: passwordHash,
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
    { code: "pillar", name: "Strategic Pillars", nameAr: "الركائز الاستراتيجية", sortOrder: 0 },
    { code: "objective", name: "Strategic Objectives", nameAr: "الأهداف الاستراتيجية", sortOrder: 1 },
    { code: "department", name: "Departments", nameAr: "الإدارات", sortOrder: 2 },
    { code: "initiative", name: "Initiatives", nameAr: "المبادرات", sortOrder: 3 },
    { code: "kpi", name: "KPIs", nameAr: "مؤشرات الأداء", sortOrder: 4 },
  ];

  await prisma.orgEntityType.createMany({ data: rows.map((r) => ({ orgId, ...r })) });

  const types = await prisma.orgEntityType.findMany({ where: { orgId }, select: { id: true, code: true } });
  return new Map(types.map((t) => [String(t.code), String(t.id)]));
}

async function ensureEntity(input: any) {
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
    sector: input.sector ?? null,
    longTermTarget: input.longTermTarget ?? null,
    complexityLevel: input.complexityLevel ?? null,
    reviewDecision: input.reviewDecision ?? null,
  };

  if (existing) {
    return prisma.entity.update({ where: { id: existing.id }, data, select: { id: true } });
  }
  return prisma.entity.create({ data, select: { id: true } });
}

// Main seed function
async function seed() {
  console.log("🌱 Starting Comprehensive RAFED Seed...");

  const password = SEED_DEFAULT_PASSWORD;

  // 1. Organization
  const org = await ensureOrg();
  console.log(`✅ Organization: ${org.name}`);

  // 2. Create Users
  console.log("👥 Creating users...");
  const admin = await ensureUser({
    orgId: org.id,
    email: "admin@rafed.gov.sa",
    password,
    name: "RAFED Administrator",
    role: Role.ADMIN,
    title: "System Administrator",
  });

  const ceo = await ensureUser({
    orgId: org.id,
    email: "ceo@rafed.gov.sa",
    password,
    name: "RAFED CEO",
    role: Role.EXECUTIVE,
    title: "Chief Executive Officer",
  });

  // Department managers
  const managers: Record<string, { id: string; email: string }> = {};

  const deptConfigs = [
    { code: "safety", name: "Safety Manager", email: "safety@rafed.gov.sa" },
    { code: "operations", name: "Operations Manager", email: "ops@rafed.gov.sa" },
    { code: "quality", name: "Quality Manager", email: "quality@rafed.gov.sa" },
    { code: "governance", name: "Governance Manager", email: "gov@rafed.gov.sa" },
    { code: "finance", name: "Finance Manager", email: "finance@rafed.gov.sa" },
    { code: "it", name: "IT Manager", email: "it@rafed.gov.sa" },
    { code: "strategy", name: "Strategy Manager", email: "strategy@rafed.gov.sa" },
    { code: "hr", name: "HR Manager", email: "hr@rafed.gov.sa" },
  ];

  for (const cfg of deptConfigs) {
    const mgr = await ensureUser({
      orgId: org.id,
      email: cfg.email,
      password,
      name: cfg.name,
      role: Role.MANAGER,
      title: cfg.name,
      managerId: ceo.id,
    });
    managers[cfg.code] = { id: mgr.id, email: cfg.email };
  }

  console.log(`✅ Created ${Object.keys(managers).length + 2} users`);

  // 3. Entity Types
  console.log("🏗️ Creating entity types...");
  const entityTypeIdByCode = await ensureOrgEntityTypes(org.id);
  const getTypeId = (code: string) => {
    const id = entityTypeIdByCode.get(code);
    if (!id) throw new Error(`Missing entity type: ${code}`);
    return id;
  };

  const pillarTypeId = getTypeId("pillar");
  const objectiveTypeId = getTypeId("objective");
  const departmentTypeId = getTypeId("department");
  const initiativeTypeId = getTypeId("initiative");
  const kpiTypeId = getTypeId("kpi");

  // 4. Read JSON Data
  console.log("📊 Loading RAFED data files...");
  const pillarsData = readJson<PillarData>(path.join(RAFED_DATA_DIR, "pillars.json"));
  const objectivesData = readJson<ObjectiveData>(path.join(RAFED_DATA_DIR, "objectives.json"));
  const initiativesData = readJson<InitiativeData>(path.join(RAFED_DATA_DIR, "initiatives.json"));

  // 5. Seed Pillars
  console.log("🏛️ Seeding pillars...");
  const pillarIdMap = new Map<number, string>();
  const goalWeightMap = new Map<string, number>();

  for (const goal of objectivesData.strategic_goals) {
    goalWeightMap.set(goal.goal_id, weightToNumber(goal.goal_weight_overall));
  }

  for (const pillar of pillarsData.pillar_objective_mapping) {
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
  console.log(`✅ Seeded ${pillarIdMap.size} pillars`);

  // 6. Seed Departments and Department KPIs
  console.log("🏢 Seeding departments...");
  const deptFiles = [
    "safety-department.json",
    "operations-department.json",
    "quality-department.json",
    "governance-department.json",
    "finance-department.json",
    "it-department.json",
    "strategy-department.json",
    "hr-department.json",
  ];

  const deptKeyMap = new Map<string, string>();
  let totalDeptKpis = 0;

  for (const filename of deptFiles) {
    const deptData = readJson<DepartmentData>(path.join(RAFED_DATA_DIR, "deprtments", filename));
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
      const direction = inferDirection(kpi.measurement_indicator_en, kpi.measurement_indicator);
      const isDecreaseGood = direction === KpiDirection.DECREASE_IS_GOOD;
      const targetValue = isDecreaseGood
        ? (kpi.unit === "%" ? 5 : 0)
        : (kpi.unit === "%" ? 90 : 100);

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
        indicatorType: kpi.classification_en?.toLowerCase() === "strategic" ? KpiIndicatorType.LAGGING : KpiIndicatorType.LEADING,
        weight: weightToNumber(kpi.weight),
        targetValue,
      });
      totalDeptKpis++;
    }
  }
  console.log(`✅ Seeded ${deptKeyMap.size} departments and ${totalDeptKpis} department KPIs`);

  // 7. Seed Objectives and Objective KPIs
  console.log("🎯 Seeding objectives...");
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
  console.log(`✅ Seeded ${objectivesData.strategic_goals.length} objectives and ${totalObjectiveKpis} objective KPIs`);

  // 8. Seed Initiatives and Initiative KPIs
  console.log("🚀 Seeding initiatives...");
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
          targetValue: kpi.target ?? 80,
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
  console.log(`✅ Seeded ${initiativesData.initiatives_mapping.length} initiatives and ${totalInitiativeKpis} initiative KPIs`);

  // 9. User-Entity Assignments
  console.log("🔗 Creating user-entity assignments...");
  const deptToManager: Record<string, string> = {
    safety: managers.safety?.id,
    operations: managers.operations?.id,
    quality: managers.quality?.id,
    governance: managers.governance?.id,
    finance: managers.finance?.id,
    it: managers.it?.id,
    strategy: managers.strategy?.id,
    hr: managers.hr?.id,
  };

  let assignmentCount = 0;
  for (const [deptPrefix, managerId] of Object.entries(deptToManager)) {
    if (!managerId) continue;

    const deptKpis = await prisma.entity.findMany({
      where: { orgId: org.id, key: { startsWith: `${deptPrefix}_dept_kpi` } },
      select: { id: true },
    });

    for (const kpi of deptKpis) {
      const existing = await prisma.userEntityAssignment.findFirst({
        where: { userId: managerId, entityId: kpi.id },
      });
      if (!existing) {
        await prisma.userEntityAssignment.create({
          data: { userId: managerId, entityId: kpi.id, assignedBy: admin.id },
        });
        assignmentCount++;
      }
    }
  }
  console.log(`✅ Created ${assignmentCount} user-entity assignments`);

  // 10. Seed comprehensive KPI values for all KPIs
  console.log("📈 Seeding comprehensive KPI values...");
  
  // Get all KPIs
  const allKpis = await prisma.entity.findMany({
    where: { orgId: org.id, orgEntityType: { code: "kpi" } },
    include: { orgEntityType: { select: { code: true } } },
  });
  
  let valueCount = 0;
  
  // Generate mock values for each KPI
  for (const kpi of allKpis) {
    const baseValue = kpi.targetValue ? kpi.targetValue * 0.8 : 75;
    const improvement = (kpi.targetValue ?? 100) - baseValue;
    const managerId = managers.safety?.id ?? admin.id;
    
    // Generate 4 quarters of data
    const periods = [
      { 
        mo: 12, 
        val: Math.round((baseValue + improvement * 0.2) * 10) / 10, 
        note: "Q1 2024 - Baseline established", 
        status: KpiValueStatus.APPROVED 
      },
      { 
        mo: 9, 
        val: Math.round((baseValue + improvement * 0.45) * 10) / 10, 
        note: "Q2 2024 - Improvement initiatives launched", 
        status: KpiValueStatus.APPROVED 
      },
      { 
        mo: 6, 
        val: Math.round((baseValue + improvement * 0.7) * 10) / 10, 
        note: "Q3 2024 - Significant progress achieved", 
        status: KpiValueStatus.APPROVED 
      },
      { 
        mo: 3, 
        val: Math.round((baseValue + improvement * 0.9) * 10) / 10, 
        note: "Q4 2024 - Near target performance", 
        status: kpi.key?.includes("safety") ? KpiValueStatus.SUBMITTED : KpiValueStatus.APPROVED 
      },
    ];

    for (const p of periods) {
      const createdAt = monthsAgo(p.mo);
      const submitterId = kpi.key?.includes("safety") ? managers.safety?.id 
        : kpi.key?.includes("operations") ? managers.operations?.id
        : kpi.key?.includes("quality") ? managers.quality?.id
        : kpi.key?.includes("governance") ? managers.governance?.id
        : kpi.key?.includes("finance") ? managers.finance?.id
        : kpi.key?.includes("it") ? managers.it?.id
        : kpi.key?.includes("strategy") ? managers.strategy?.id
        : kpi.key?.includes("hr") ? managers.hr?.id
        : admin.id;
        
      await prisma.entityValue.create({
        data: {
          entityId: kpi.id,
          actualValue: p.val,
          finalValue: p.status === KpiValueStatus.APPROVED ? p.val : null,
          status: p.status,
          approvalType: KpiApprovalType.MANUAL,
          note: p.note,
          enteredBy: submitterId ?? admin.id,
          submittedBy: p.status === KpiValueStatus.SUBMITTED || p.status === KpiValueStatus.APPROVED ? submitterId : null,
          approvedBy: p.status === KpiValueStatus.APPROVED ? admin.id : null,
          submittedAt: p.status === KpiValueStatus.SUBMITTED || p.status === KpiValueStatus.APPROVED ? createdAt : null,
          approvedAt: p.status === KpiValueStatus.APPROVED ? new Date(createdAt.getTime() + 86400000 * 2) : null,
          createdAt,
        },
      });
      valueCount++;
    }
    
    // Progress indicator every 10 KPIs
    if (valueCount % 40 === 0) {
      process.stdout.write(".");
    }
  }
  
  console.log(`\n✅ Seeded ${valueCount} KPI value periods across ${allKpis.length} KPIs`);

  // 11. Calculate derived entity values (pillars, objectives, etc.)
  console.log("\n🧮 Calculating derived entity values...");
  await calculateDerivedEntityValues(org.id, admin.id);

  console.log("");
  console.log("🎉 RAFED Comprehensive Seed Complete!");
  console.log("");
  console.log("📋 Summary:");
  console.log(`  Organization: ${org.name}`);
  console.log(`  Pillars: ${pillarIdMap.size}`);
  console.log(`  Objectives: ${objectivesData.strategic_goals.length}`);
  console.log(`  Departments: ${deptKeyMap.size}`);
  console.log(`  Department KPIs: ${totalDeptKpis}`);
  console.log(`  Objective KPIs: ${totalObjectiveKpis}`);
  console.log(`  Initiatives: ${initiativesData.initiatives_mapping.length}`);
  console.log(`  Users: ${Object.keys(managers).length + 2}`);
  console.log("");
  console.log("🔑 Login credentials:");
  console.log(`  admin@rafed.gov.sa / ${password}`);
  console.log(`  ceo@rafed.gov.sa / ${password}`);
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
