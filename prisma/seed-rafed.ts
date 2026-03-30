import { PrismaClient, Role, Status, KpiSourceType, KpiPeriodType, KpiDirection, KpiIndicatorType, ComplexityLevel, ReviewDecision, KpiAggregationMethod, KpiApprovalLevel } from "@prisma/client";
import * as path from "path";
import { spawn } from "child_process";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const RAFED_DATA_DIR = path.join(process.cwd(), "rafed-kpi-docs");
const SEED_DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
const RAFED_DOMAIN = process.env.RAFED_DOMAIN ?? "rafed.gov.sa";

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Helper to run Python and get Excel data
async function readExcelData(sheetName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    // Use Python triple quotes to handle any special characters in sheet name
    const pythonScript = `
import pandas as pd
import json
import sys
import numpy as np

try:
    sheet_name = """${sheetName}"""
    df = pd.read_excel("التخطيط.xlsx", sheet_name=sheet_name)
    # Replace NaN with None for JSON serialization
    df = df.replace({np.nan: None})
    data = df.to_dict('records')
    print(json.dumps(data, ensure_ascii=False, default=str))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;
    
    const python = spawn("python3", ["-c", pythonScript], {
      cwd: RAFED_DATA_DIR,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" }
    });
    
    let stdout = "";
    let stderr = "";
    
    python.stdout.on("data", (data) => { stdout += data.toString(); });
    python.stderr.on("data", (data) => { stderr += data.toString(); });
    
    python.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python exited with code ${code}: ${stderr}`));
      } else {
        try {
          const data = JSON.parse(stdout);
          resolve(data);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${e}`));
        }
      }
    });
  });
}

async function ensureOrg(domain: string) {
  const existing = await prisma.organization.findFirst({ where: { domain } });
  if (existing) {
    console.log(`  🏢 Using existing org: ${existing.id}`);
    return existing;
  }

  const created = await prisma.organization.create({
    data: {
      name: "RAFED - Saudi School Transportation Authority",
      nameAr: "رافد - الهيئة السعودية للنقل المدرسي",
      domain,
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

async function ensureUser(input: { orgId: string; email: string; password: string; name: string; role: Role; title?: string }) {
  const existing = await prisma.user.findFirst({
    where: { orgId: input.orgId, email: input.email },
    select: { id: true },
  });
  if (existing) {
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

async function wipeOrgEntities(orgId: string) {
  console.log("  🧹 Wiping existing entities...");
  await prisma.entityVariableValue.deleteMany({ where: { entityValue: { entity: { orgId } } } });
  await prisma.entityValue.deleteMany({ where: { entity: { orgId } } });
  await prisma.entityVariable.deleteMany({ where: { entity: { orgId } } });
  await prisma.userEntityAssignment.deleteMany({ where: { entity: { orgId } } });
  await prisma.entityAttachment.deleteMany({ where: { entity: { orgId } } });
  await prisma.entity.deleteMany({ where: { orgId } });
  console.log("  ✅ Wiped existing entities");
}

async function ensureOrgEntityTypes(orgId: string) {
  await prisma.orgEntityType.deleteMany({ where: { orgId } });

  const rows = [
    { code: "pillar", name: "Strategic Pillars", nameAr: "الركائز الاستراتيجية", sortOrder: 0 },
    { code: "objective", name: "Strategic Objectives", nameAr: "الأهداف الاستراتيجية", sortOrder: 1 },
    { code: "sector", name: "Sectors", nameAr: "القطاعات", sortOrder: 2 },
    { code: "kpi", name: "KPIs", nameAr: "مؤشرات الأداء", sortOrder: 3 },
    { code: "initiative", name: "Initiatives", nameAr: "المبادرات", sortOrder: 4 },
  ];

  await prisma.orgEntityType.createMany({ data: rows.map((r) => ({ orgId, ...r })) });

  const types = await prisma.orgEntityType.findMany({ where: { orgId }, select: { id: true, code: true } });
  return new Map(types.map((t) => [String(t.code), String(t.id)]));
}

function parseComplexityLevel(val: string | null): ComplexityLevel | null {
  if (!val) return null;
  const normalized = val.toLowerCase().trim();
  if (normalized === "low") return ComplexityLevel.LOW;
  if (normalized === "medium") return ComplexityLevel.MEDIUM;
  if (normalized === "high") return ComplexityLevel.HIGH;
  return null;
}

function parseReviewDecision(val: string | null): ReviewDecision | null {
  if (!val) return null;
  const normalized = val.toLowerCase().trim();
  if (normalized === "keep") return ReviewDecision.KEEP;
  if (normalized === "modify") return ReviewDecision.MODIFY;
  if (normalized === "remove") return ReviewDecision.REMOVE;
  return null;
}

function parsePeriodType(val: string | null): KpiPeriodType | null {
  if (!val) return null;
  const normalized = val.toLowerCase().trim();
  if (normalized.includes("month")) return KpiPeriodType.MONTHLY;
  if (normalized.includes("quarter")) return KpiPeriodType.QUARTERLY;
  if (normalized.includes("year")) return KpiPeriodType.YEARLY;
  return null;
}

function parseIndicatorType(val: string | null): KpiIndicatorType | null {
  if (!val) return null;
  const normalized = val.toLowerCase().trim();
  if (normalized === "leading") return KpiIndicatorType.LEADING;
  if (normalized === "lagging") return KpiIndicatorType.LAGGING;
  return null;
}

function parseNumber(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    // Handle various string formats
    const cleaned = val.replace(/[^0-9.\-]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
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
  sector?: string | null;
  longTermTarget?: number | null;
  complexityLevel?: ComplexityLevel | null;
  reviewDecision?: ReviewDecision | null;
}) {
  const existing = await prisma.entity.findFirst({
    where: { orgId: input.orgId, key: input.key, deletedAt: null },
    select: { id: true },
  });

  const data: any = {
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

async function seed() {
  console.log("🌱 Starting RAFED Data Seed...");

  const org = await ensureOrg(RAFED_DOMAIN);
  await wipeOrgEntities(org.id);

  console.log("👥 Creating RAFED admins...");
  const admin1 = await ensureUser({
    orgId: org.id,
    email: "admin@rafed.gov.sa",
    password: SEED_DEFAULT_PASSWORD,
    name: "RAFED Administrator",
    role: Role.ADMIN,
    title: "System Administrator",
  });

  const exec1 = await ensureUser({
    orgId: org.id,
    email: "ceo@rafed.gov.sa",
    password: SEED_DEFAULT_PASSWORD,
    name: "RAFED CEO",
    role: Role.EXECUTIVE,
    title: "Chief Executive Officer",
  });

  console.log("✅ Admins created");

  console.log("🏗️  Creating entity types...");
  const entityTypeIdByCode = await ensureOrgEntityTypes(org.id);
  const getTypeId = (code: string) => {
    const id = entityTypeIdByCode.get(code);
    if (!id) throw new Error(`Missing org entity type ${code}`);
    return id;
  };

  const pillarTypeId = getTypeId("pillar");
  const objectiveTypeId = getTypeId("objective");
  const sectorTypeId = getTypeId("sector");
  const kpiTypeId = getTypeId("kpi");

  console.log("✅ Entity types created");

  // Read KPI data from Excel
  console.log("📊 Reading KPI data from Excel...");
  const kpiData = await readExcelData("KPI's Details");
  console.log(`  ✅ Read ${kpiData.length} KPIs from Excel`);

  // Group by sector
  const sectorMap = new Map<string, any[]>();
  for (const row of kpiData) {
    // Find sector column (might be named differently or inferred from structure)
    // For RAFED, sectors are typically: Safety, Operations, Quality, etc.
    // We'll extract from KPI name or use a default
    const sector = inferSectorFromKPI(row);
    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, []);
    }
    sectorMap.get(sector)!.push(row);
  }

  console.log(`  📁 Found ${sectorMap.size} sectors`);

  // Create sectors as entities
  const sectorIdMap = new Map<string, string>();
  let sectorIndex = 0;
  for (const [sectorName, kpis] of sectorMap) {
    const sectorKey = `sector_${sectorIndex++}`;
    const sector = await ensureEntity({
      orgId: org.id,
      orgEntityTypeId: sectorTypeId,
      key: sectorKey,
      title: sectorName,
      titleAr: sectorName, // TODO: Add Arabic translations
      status: Status.ACTIVE,
      sourceType: KpiSourceType.DERIVED,
      description: `${sectorName} sector KPIs`,
    });
    sectorIdMap.set(sectorName, sector.id);
    console.log(`    📂 Sector: ${sectorName} (${kpis.length} KPIs)`);
  }

  // Seed KPIs
  console.log("🎯 Seeding KPIs...");
  let kpiCount = 0;
  let skippedCount = 0;

  for (const row of kpiData) {
    const kpiName = row["KPI Name"] || row["KPI"] || "";
    if (!kpiName || kpiName.toString().trim() === "") {
      skippedCount++;
      continue;
    }

    // Skip rows that are headers or totals
    if (kpiName.toString().toLowerCase().includes("total") ||
        kpiName.toString().toLowerCase().includes("مجموع") ||
        kpiName.toString().toLowerCase().includes("sector")) {
      skippedCount++;
      continue;
    }

    const sector = inferSectorFromKPI(row);
    const complexityLevel = parseComplexityLevel(row["Complexity Level\n (Low / Medium / High)"] || row["Complexity Level"]);
    const reviewDecision = parseReviewDecision(row["Decision\n ( Keep / Modify / Remove)"] || row["Decision"]);
    const periodType = parsePeriodType(row["Frequency"]);
    const indicatorType = parseIndicatorType(row["Lead / Lag"]);
    
    const targetValue = parseNumber(row["2026 Target"]);
    const longTermTarget = parseNumber(row["5-Year Target"]);
    
    // Extract unit from target value string or use default
    let unit = "%";
    const targetStr = String(row["2026 Target"] || "");
    if (targetStr.includes("%")) unit = "%";
    else if (targetStr.toLowerCase().includes("day")) unit = "days";
    else if (targetStr.toLowerCase().includes("rate") || targetStr.toLowerCase().includes("ratio")) unit = "ratio";

    // Formula from Excel
    const formula = row["Calculation Formula"] || row["Formula"] || null;

    // Skip KPIs marked for removal
    if (reviewDecision === ReviewDecision.REMOVE) {
      console.log(`    ⏭️  Skipping removed KPI: ${kpiName}`);
      skippedCount++;
      continue;
    }

    const kpiKey = `kpi_${kpiCount + 1}`;

    await ensureEntity({
      orgId: org.id,
      orgEntityTypeId: kpiTypeId,
      key: kpiKey,
      title: kpiName.toString().trim(),
      titleAr: null, // TODO: Add Arabic names
      description: row["Why This KPI Matters (Impact)"] || null,
      status: Status.ACTIVE,
      sourceType: formula ? KpiSourceType.CALCULATED : KpiSourceType.MANUAL,
      periodType,
      unit,
      direction: KpiDirection.INCREASE_IS_GOOD, // Default, could be inferred
      indicatorType,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      targetValue,
      longTermTarget,
      complexityLevel,
      reviewDecision,
      sector,
      formula: formula ? formula.toString().trim() : null,
    });

    kpiCount++;
    if (kpiCount % 10 === 0) {
      process.stdout.write(`.`);
    }
  }

  console.log(`\n  ✅ Seeded ${kpiCount} KPIs (skipped ${skippedCount})`);

  // Read Composite KPI Structure
  console.log("📊 Reading Composite KPI Structure...");
  try {
    const compositeData = await readExcelData("Composite KPI Structure");
    console.log(`  ✅ Read ${compositeData.length} composite components`);
    // TODO: Link composite KPIs with formulas
  } catch (e) {
    console.log(`  ⚠️  Could not read composite structure: ${e}`);
  }

  console.log("🎉 RAFED seed complete!");
  console.log("");
  console.log("📋 Summary:");
  console.log(`  Organization: ${org.name} (${RAFED_DOMAIN})`);
  console.log(`  Sectors: ${sectorMap.size}`);
  console.log(`  KPIs: ${kpiCount}`);
  console.log("");
  console.log("🔑 Default login credentials:");
  console.log(`  admin@rafed.gov.sa / ${SEED_DEFAULT_PASSWORD}`);
  console.log(`  ceo@rafed.gov.sa / ${SEED_DEFAULT_PASSWORD}`);
}

function inferSectorFromKPI(row: any): string {
  // Try to infer sector from various indicators in the row
  const kpiName = String(row["KPI Name"] || row["KPI"] || "").toLowerCase();
  
  // Safety-related KPIs
  if (kpiName.includes("safety") || 
      kpiName.includes("accident") || 
      kpiName.includes("fatality") || 
      kpiName.includes("incident") ||
      kpiName.includes("risk") ||
      kpiName.includes("audit")) {
    return "Safety & Risk Management";
  }
  
  // Operations-related KPIs
  if (kpiName.includes("on-time") || 
      kpiName.includes("route") || 
      kpiName.includes("trip") ||
      kpiName.includes("coverage") ||
      kpiName.includes("availability")) {
    return "Operations & Service Delivery";
  }
  
  // Quality-related KPIs
  if (kpiName.includes("satisfaction") || 
      kpiName.includes("quality") || 
      kpiName.includes("complaint") ||
      kpiName.includes("feedback")) {
    return "Quality & Customer Experience";
  }
  
  // Efficiency-related KPIs
  if (kpiName.includes("cost") || 
      kpiName.includes("efficiency") || 
      kpiName.includes("utilization") ||
      kpiName.includes("fuel") ||
      kpiName.includes("emission")) {
    return "Efficiency & Sustainability";
  }
  
  // Compliance-related KPIs
  if (kpiName.includes("compliance") || 
      kpiName.includes("regulation") || 
      kpiName.includes("standard") ||
      kpiName.includes("certification")) {
    return "Compliance & Standards";
  }
  
  // Vendor-related KPIs
  if (kpiName.includes("vendor") || 
      kpiName.includes("contractor") || 
      kpiName.includes("supplier")) {
    return "Vendor Management";
  }
  
  // Default sector
  return "General Performance";
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
