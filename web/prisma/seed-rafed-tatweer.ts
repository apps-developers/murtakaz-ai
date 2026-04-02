/**
 * seed-rafed-tatweer.ts
 *
 * RAFED seed with Tatweer's Strategy House structure:
 *  - Tatweer 2030 Vision/Mission/Values
 *  - 5 Strategic Pillars (with Arabic names)
 *  - Strategic Objectives under each pillar
 *  - KPIs for each objective
 *  - Supporting initiatives
 *
 * Run:  SEED_ORG_DOMAIN=rafed.gov.sa npx tsx prisma/seed-rafed-tatweer.ts
 */

import {
  PrismaClient,
  KpiAggregationMethod,
  KpiApprovalType,
  KpiDirection,
  KpiIndicatorType,
  KpiPeriodType,
  KpiSourceType,
  KpiValueStatus,
  KpiVariableDataType,
  NotificationType,
  Role,
  Status,
} from "@prisma/client";
import { webcrypto } from "node:crypto";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const g = globalThis as unknown as { crypto?: unknown };
if (!g.crypto) g.crypto = webcrypto as unknown;

// ─── Tatweer Strategy House Data ─────────────────────────────────────────────

const TATWEER_DATA = {
  vision: "The National Education Champion, empowering every learner to be globally competitive",
  visionAr: "الشركة الوطنية الرائدة في التعليم، تهدف إلى تمكين كل متعلم من المنافسة عالمياً",
  mission: "Elevate the education ecosystem with integrated, innovative, and efficient solutions through our dedicated talent, cutting-edge capabilities, and strategic partnerships",
  missionAr: "تعزيز البيئة التعليمية من خلال حلول متكاملة ومبتكرة وفعالة، مستلهمة من مواهبنا المتميزة، وإمكانياتنا المتقدمة، وشراكاتنا الاستراتيجية",
  values: [
    { name: "Care", nameAr: "تعاون" },
    { name: "Ownership", nameAr: "مسؤولية" },
    { name: "Resilience", nameAr: "مرونة" },
    { name: "Engagement", nameAr: "اهتمام" },
  ],
  pillars: [
    {
      id: "P1",
      key: "pillar_1",
      title: "EXCEL IN EXISTING BUSINESSES",
      titleAr: "التميز في الخدمات الحالية",
      objectives: [
        {
          key: "OBJ-1-1",
          title: "Enhance customer experience",
          titleAr: "تعزيز تجربة العميل",
          kpiCode: "KPI-P1-1",
          kpiTitle: "Customer Satisfaction Index",
          kpiTitleAr: "مؤشر رضا العملاء",
          target: 90,
          unit: "%",
        },
        {
          key: "OBJ-1-2",
          title: "Improve operational and cost efficiency",
          titleAr: "تحسين الكفاءة التشغيلية وتقليل التكاليف",
          kpiCode: "KPI-P1-2",
          kpiTitle: "Operational Efficiency Ratio",
          kpiTitleAr: "نسبة الكفاءة التشغيلية",
          target: 85,
          unit: "%",
        },
        {
          key: "OBJ-1-3",
          title: "Enhance product / service quality",
          titleAr: "تحسين جودة المنتجات / الخدمات",
          kpiCode: "KPI-P1-3",
          kpiTitle: "Quality Assurance Score",
          kpiTitleAr: "درجة ضمان الجودة",
          target: 95,
          unit: "%",
        },
        {
          key: "OBJ-1-4",
          title: "Build sustainable, long-term business",
          titleAr: "بناء أعمال ومستدامة على المدى البعيد",
          kpiCode: "KPI-P1-4",
          kpiTitle: "Sustainability Index",
          kpiTitleAr: "مؤشر الاستدامة",
          target: 80,
          unit: "%",
        },
      ],
    },
    {
      id: "P2",
      key: "pillar_2",
      title: "EXPAND EXISTING BUSINESSES",
      titleAr: "التوسع في الخدمات الحالية",
      objectives: [
        {
          key: "OBJ-2-1",
          title: "Expand to KSA Public Education Segments",
          titleAr: "التوسع بقطاعات التعليم العام داخل المملكة",
          kpiCode: "KPI-P2-1",
          kpiTitle: "Public Education Market Share",
          kpiTitleAr: "حصة السوق في التعليم العام",
          target: 35,
          unit: "%",
        },
        {
          key: "OBJ-2-2",
          title: "Expand to KSA Private Education Segments",
          titleAr: "التوسع بقطاع التعليم الخاص داخل المملكة",
          kpiCode: "KPI-P2-2",
          kpiTitle: "Private Education Penetration",
          kpiTitleAr: "نفاذية التعليم الخاص",
          target: 40,
          unit: "%",
        },
        {
          key: "OBJ-2-3",
          title: "Expand to KSA Government, Private, & Third Sectors",
          titleAr: "التوسع في القطاعين الحكومي والخاص والقطاعات الثالثة",
          kpiCode: "KPI-P2-3",
          kpiTitle: "Multi-Sector Coverage",
          kpiTitleAr: "تغطية متعددة القطاعات",
          target: 75,
          unit: "%",
        },
        {
          key: "OBJ-2-4",
          title: "Expand Internationally",
          titleAr: "التوسع خارج المملكة على المستوى الدولي",
          kpiCode: "KPI-P2-4",
          kpiTitle: "International Presence Score",
          kpiTitleAr: "درجة التواجد الدولي",
          target: 60,
          unit: "%",
        },
      ],
    },
    {
      id: "P3",
      key: "pillar_3",
      title: "EVOLVE INTO NEW BUSINESSES",
      titleAr: "تطوير خدمات جديدة",
      objectives: [
        {
          key: "OBJ-3-1",
          title: "Uplift the quality of the education workforce",
          titleAr: "رفع كفاءة وجودة العاملين في قطاع التعليم",
          kpiCode: "KPI-P3-1",
          kpiTitle: "Workforce Competency Index",
          kpiTitleAr: "مؤشر كفاءة القوى العاملة",
          target: 85,
          unit: "%",
        },
        {
          key: "OBJ-3-2",
          title: "Elevate catering to support student wellbeing",
          titleAr: "تحسين مستوى خدمات التغذية المدرسية لدعم جودة حياة الطلاب",
          kpiCode: "KPI-P3-2",
          kpiTitle: "Student Wellbeing Score",
          kpiTitleAr: "درجة رفاهية الطلاب",
          target: 88,
          unit: "%",
        },
        {
          key: "OBJ-3-3",
          title: "Enrich student development through extracurricular activities",
          titleAr: "تنمية وتطوير قدرات ومهارات الطلاب عبر الأنشطة اللاصفية",
          kpiCode: "KPI-P3-3",
          kpiTitle: "Extracurricular Participation Rate",
          kpiTitleAr: "نسبة المشاركة في الأنشطة اللاصفية",
          target: 70,
          unit: "%",
        },
        {
          key: "OBJ-3-4",
          title: "Strengthen cybersecurity across the education sector",
          titleAr: "تعزيز الأمن السيبراني في قطاع التعليم",
          kpiCode: "KPI-P3-4",
          kpiTitle: "Cybersecurity Maturity Score",
          kpiTitleAr: "درجة نضج الأمن السيبراني",
          target: 90,
          unit: "%",
        },
        {
          key: "OBJ-3-5",
          title: "Enhance educational broadcasting and media",
          titleAr: "تحسين البث الإعلامي في قطاع التعليم",
          kpiCode: "KPI-P3-5",
          kpiTitle: "Media Reach Index",
          kpiTitleAr: "مؤشر انتشار المحتوى الإعلامي",
          target: 75,
          unit: "%",
        },
      ],
    },
    {
      id: "P4",
      key: "pillar_4",
      title: "HARMONIZE THE ECOSYSTEM",
      titleAr: "تعزيز التكامل والمواءمة",
      objectives: [
        {
          key: "OBJ-4-1",
          title: "Develop group strategy & operating model",
          titleAr: "بناء استراتيجية المجموعة والنموذج التشغيلي",
          kpiCode: "KPI-P4-1",
          kpiTitle: "Strategy Implementation Rate",
          kpiTitleAr: "نسبة تنفيذ الاستراتيجية",
          target: 80,
          unit: "%",
        },
        {
          key: "OBJ-4-2",
          title: "Adapt identity & culture that drives required behaviors",
          titleAr: "تطوير الهوية والثقافة التي تدفع السلوكيات المطلوبة",
          kpiCode: "KPI-P4-2",
          kpiTitle: "Cultural Alignment Score",
          kpiTitleAr: "درجة التوافق الثقافي",
          target: 85,
          unit: "%",
        },
        {
          key: "OBJ-4-3",
          title: "Align business development & investment activities",
          titleAr: "مواءمة الأنشطة التجارية والاستثمارية",
          kpiCode: "KPI-P4-3",
          kpiTitle: "Investment Alignment Index",
          kpiTitleAr: "مؤشر توافق الاستثمارات",
          target: 78,
          unit: "%",
        },
      ],
    },
    {
      id: "P5",
      key: "pillar_5",
      title: "BUILD AN EFFECTIVE ORGANIZATION",
      titleAr: "بناء منظومة فعالة",
      objectives: [
        {
          key: "OBJ-5-1",
          title: "Build shared services to leverage economies of scale",
          titleAr: "بناء الخدمات المشتركة لتحقيق التكاليف الكفؤة",
          kpiCode: "KPI-P5-1",
          kpiTitle: "Shared Services Efficiency",
          kpiTitleAr: "كفاءة الخدمات المشتركة",
          target: 82,
          unit: "%",
        },
        {
          key: "OBJ-5-2",
          title: "Revamp finance to streamline and provide better visibility & value",
          titleAr: "تطوير وتحسين الموارد المالية لزيادة الكفاءة",
          kpiCode: "KPI-P5-2",
          kpiTitle: "Financial Process Optimization",
          kpiTitleAr: "تحسين العمليات المالية",
          target: 85,
          unit: "%",
        },
        {
          key: "OBJ-5-3",
          title: "Address gaps identified in due diligence",
          titleAr: "دراسة الفجوات التي تم تحديدها في دراسات الجدوى",
          kpiCode: "KPI-P5-3",
          kpiTitle: "Due Diligence Completion Rate",
          kpiTitleAr: "نسبة إنجاز دراسات الجدوى",
          target: 95,
          unit: "%",
        },
        {
          key: "OBJ-5-4",
          title: "Build & foster needed core human capabilities",
          titleAr: "تعزيز وبناء القدرات البشرية الأساسية",
          kpiCode: "KPI-P5-4",
          kpiTitle: "Core Capabilities Index",
          kpiTitleAr: "مؤشر القدرات الأساسية",
          target: 80,
          unit: "%",
        },
        {
          key: "OBJ-5-5",
          title: "Optimize talent retention & capabilities building",
          titleAr: "تحسين الاحتفاظ بالمواهب وبناء القدرات",
          kpiCode: "KPI-P5-5",
          kpiTitle: "Talent Retention Rate",
          kpiTitleAr: "نسبة الاحتفاظ بالمواهب",
          target: 90,
          unit: "%",
        },
        {
          key: "OBJ-5-6",
          title: "Digitalize the organization",
          titleAr: "رقمنة المنظومة",
          kpiCode: "KPI-P5-6",
          kpiTitle: "Digital Maturity Score",
          kpiTitleAr: "درجة النضج الرقمي",
          target: 75,
          unit: "%",
        },
      ],
    },
  ],
  initiatives: [
    { key: "INIT-1", title: "Customer Experience Transformation", titleAr: "تحول تجربة العميل", pillarId: "P1" },
    { key: "INIT-2", title: "Operational Excellence Program", titleAr: "برنامج التميز التشغيلي", pillarId: "P1" },
    { key: "INIT-3", title: "Public Education Expansion", titleAr: "توسيع التعليم العام", pillarId: "P2" },
    { key: "INIT-4", title: "International Market Entry", titleAr: "دخول الأسواق الدولية", pillarId: "P2" },
    { key: "INIT-5", title: "Workforce Development Hub", titleAr: "مركز تطوير القوى العاملة", pillarId: "P3" },
    { key: "INIT-6", title: "Student Wellbeing Initiative", titleAr: "مبادرة رفاهية الطلاب", pillarId: "P3" },
    { key: "INIT-7", title: "Cybersecurity Enhancement", titleAr: "تعزيز الأمن السيبراني", pillarId: "P3" },
    { key: "INIT-8", title: "Strategy Implementation Office", titleAr: "مكتب تنفيذ الاستراتيجية", pillarId: "P4" },
    { key: "INIT-9", title: "Cultural Transformation", titleAr: "تحول ثقافي", pillarId: "P4" },
    { key: "INIT-10", title: "Shared Services Center", titleAr: "مركز الخدمات المشتركة", pillarId: "P5" },
    { key: "INIT-11", title: "Digital Transformation Program", titleAr: "برنامج التحول الرقمي", pillarId: "P5" },
    { key: "INIT-12", title: "Talent Management System", titleAr: "نظام إدارة المواهب", pillarId: "P5" },
  ],
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  return d;
}

async function wipeDomain(domain: string) {
  const org = await prisma.organization.findFirst({
    where: { domain, deletedAt: null },
    select: { id: true },
  });
  if (!org) return;
  const orgId = org.id;

  await prisma.notification.deleteMany({ where: { orgId } });
  await prisma.entityVariableValue.deleteMany({ where: { entityValue: { entity: { orgId } } } });
  await prisma.entityValue.deleteMany({ where: { entity: { orgId } } });
  await prisma.entityVariable.deleteMany({ where: { entity: { orgId } } });
  await prisma.userEntityAssignment.deleteMany({ where: { entity: { orgId } } });
  await prisma.entityAttachment.deleteMany({ where: { entity: { orgId } } });
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

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const domain = process.env.SEED_ORG_DOMAIN ?? "rafed.gov.sa";
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
  const pwHash = await hashPassword(defaultPassword);

  console.log(`🌱  Seeding RAFED with Tatweer Strategy House — domain: ${domain}`);

  await wipeDomain(domain);

  // ── Organization ────────────────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: "RAFED - Saudi School Transportation Authority",
      nameAr: "رافد - الهيئة السعودية للنقل المدرسي",
      domain,
      kpiApprovalLevel: "MANAGER",
      ragGreenMin: 75,
      ragAmberMin: 50,
      mission: TATWEER_DATA.mission,
      missionAr: TATWEER_DATA.missionAr,
      vision: TATWEER_DATA.vision,
      visionAr: TATWEER_DATA.visionAr,
    },
  });
  const orgId = org.id;
  console.log(`  ✓  org: ${org.name}`);

  // ── Entity Types ───────────────────────────────────────────────────────────
  const [etPillar, etObjective, etKpi, etInitiative] = await Promise.all([
    prisma.orgEntityType.create({ data: { orgId, code: "pillar", name: "Strategic Pillar", nameAr: "الركيزة الاستراتيجية", sortOrder: 1 } }),
    prisma.orgEntityType.create({ data: { orgId, code: "objective", name: "Strategic Objective", nameAr: "الهدف الاستراتيجي", sortOrder: 2 } }),
    prisma.orgEntityType.create({ data: { orgId, code: "kpi", name: "KPI", nameAr: "مؤشر الأداء", sortOrder: 3 } }),
    prisma.orgEntityType.create({ data: { orgId, code: "initiative", name: "Initiative", nameAr: "المبادرة", sortOrder: 4 } }),
  ]);
  console.log("  ✓  entity types");

  // ── Users ───────────────────────────────────────────────────────────────────
  async function createUser(email: string, name: string, role: Role, title: string, managerId: string | null) {
    const u = await prisma.user.create({
      data: { orgId, email, emailVerified: true, name, role, title, managerId, hashedPassword: pwHash },
    });
    await prisma.account.create({ data: { userId: u.id, providerId: "credential", accountId: u.id, password: pwHash } });
    return u;
  }

  const admin = await createUser(`admin@${domain}`, "System Administrator", Role.ADMIN, "System Administrator", null);
  const ceo = await createUser(`ceo@${domain}`, "Chief Executive Officer", Role.EXECUTIVE, "CEO", null);
  const mOperations = await createUser(`operations@${domain}`, "Operations Manager", Role.MANAGER, "Operations Director", ceo.id);
  const mStrategy = await createUser(`strategy@${domain}`, "Strategy Manager", Role.MANAGER, "Strategy Director", ceo.id);
  const mFinance = await createUser(`finance@${domain}`, "Finance Manager", Role.MANAGER, "Finance Director", ceo.id);
  const mHr = await createUser(`hr@${domain}`, "HR Manager", Role.MANAGER, "HR Director", ceo.id);
  const mIt = await createUser(`it@${domain}`, "IT Manager", Role.MANAGER, "IT Director", ceo.id);
  const mQuality = await createUser(`quality@${domain}`, "Quality Manager", Role.MANAGER, "Quality Director", ceo.id);

  console.log("  ✓  users (8)");

  // ── Strategic Pillars ───────────────────────────────────────────────────────
  const pillarIdMap = new Map<string, string>();

  for (const pillarData of TATWEER_DATA.pillars) {
    const pillar = await prisma.entity.create({
      data: {
        orgId,
        key: pillarData.key,
        orgEntityTypeId: etPillar.id,
        title: pillarData.title,
        titleAr: pillarData.titleAr,
        status: Status.ACTIVE,
        sourceType: KpiSourceType.DERIVED,
        periodType: KpiPeriodType.YEARLY,
        unit: "score",
        unitAr: "نقاط",
        direction: KpiDirection.INCREASE_IS_GOOD,
        aggregation: KpiAggregationMethod.LAST_VALUE,
        targetValue: 85,
        formula: `get("${pillarData.key}_score")`,
      },
    });
    pillarIdMap.set(pillarData.key, pillar.id);
    console.log(`  ✓  pillar: ${pillarData.titleAr}`);
  }

  // ── Strategic Objectives & KPIs ────────────────────────────────────────────
  const objectiveIdMap = new Map<string, string>();
  const kpiIdMap = new Map<string, string>();

  for (const pillarData of TATWEER_DATA.pillars) {
    const pillarId = pillarIdMap.get(pillarData.key);
    if (!pillarId) continue;

    for (const objData of pillarData.objectives) {
      const owner = objData.key.startsWith("OBJ-1") ? mOperations.id
        : objData.key.startsWith("OBJ-2") ? mOperations.id
        : objData.key.startsWith("OBJ-3") ? mQuality.id
        : objData.key.startsWith("OBJ-4") ? mStrategy.id
        : ceo.id;

      const objective = await prisma.entity.create({
        data: {
          orgId,
          key: objData.key,
          orgEntityTypeId: etObjective.id,
          title: objData.title,
          titleAr: objData.titleAr,
          ownerUserId: owner,
          parentId: pillarId, // Link to parent pillar
          status: Status.ACTIVE,
          sourceType: KpiSourceType.CALCULATED,
          periodType: KpiPeriodType.YEARLY,
          unit: "score",
          unitAr: "نقاط",
          direction: KpiDirection.INCREASE_IS_GOOD,
          aggregation: KpiAggregationMethod.LAST_VALUE,
          targetValue: 100,
          formula: `get("${objData.kpiCode}")`, // Formula referencing child KPI
        },
      });
      objectiveIdMap.set(objData.key, objective.id);

      // Create KPI for this objective
      const kpi = await prisma.entity.create({
        data: {
          orgId,
          key: objData.kpiCode,
          orgEntityTypeId: etKpi.id,
          title: objData.kpiTitle,
          titleAr: objData.kpiTitleAr,
          ownerUserId: owner,
          parentId: objective.id, // Link to parent objective
          status: Status.ACTIVE,
          sourceType: KpiSourceType.MANUAL,
          periodType: KpiPeriodType.QUARTERLY,
          unit: objData.unit,
          unitAr: objData.unit === "%" ? "%" : objData.unit,
          direction: KpiDirection.INCREASE_IS_GOOD,
          indicatorType: KpiIndicatorType.LAGGING,
          aggregation: KpiAggregationMethod.LAST_VALUE,
          targetValue: objData.target,
          baselineValue: objData.target * 0.6,
        },
      });
      kpiIdMap.set(objData.kpiCode, kpi.id);

      // Create quarterly KPI values (Q1-Q3) for trend testing
      const q1Val = Math.round(objData.target * 0.65 * 100) / 100;
      const q2Val = Math.round(objData.target * 0.75 * 100) / 100;
      const q3Val = Math.round(objData.target * 0.85 * 100) / 100;

      await prisma.entityValue.create({
        data: {
          entityId: kpi.id,
          actualValue: q1Val,
          finalValue: q1Val,
          status: KpiValueStatus.APPROVED,
          approvalType: KpiApprovalType.MANUAL,
          note: "Q1 2025 - Baseline measurement",
          enteredBy: owner,
          submittedBy: owner,
          approvedBy: admin.id,
          submittedAt: monthsAgo(9),
          approvedAt: monthsAgo(8),
          createdAt: monthsAgo(9),
        },
      });
      await prisma.entityValue.create({
        data: {
          entityId: kpi.id,
          actualValue: q2Val,
          finalValue: q2Val,
          status: KpiValueStatus.APPROVED,
          approvalType: KpiApprovalType.MANUAL,
          note: "Q2 2025 - Progress update",
          enteredBy: owner,
          submittedBy: owner,
          approvedBy: admin.id,
          submittedAt: monthsAgo(6),
          approvedAt: monthsAgo(5),
          createdAt: monthsAgo(6),
        },
      });
      await prisma.entityValue.create({
        data: {
          entityId: kpi.id,
          actualValue: q3Val,
          finalValue: q3Val,
          status: KpiValueStatus.APPROVED,
          approvalType: KpiApprovalType.MANUAL,
          note: "Q3 2025 - Latest measurement",
          enteredBy: owner,
          submittedBy: owner,
          approvedBy: admin.id,
          submittedAt: monthsAgo(3),
          approvedAt: monthsAgo(2),
          createdAt: monthsAgo(3),
        },
      });
    }
  }

  console.log(`  ✓  objectives (${objectiveIdMap.size})`);
  console.log(`  ✓  KPIs (${kpiIdMap.size})`);

  // ── Initiatives ────────────────────────────────────────────────────────────
  for (const initData of TATWEER_DATA.initiatives) {
    const pillarId = pillarIdMap.get(initData.pillarId);
    const owner = initData.pillarId === "P1" ? mOperations.id
      : initData.pillarId === "P2" ? mOperations.id
      : initData.pillarId === "P3" ? mQuality.id
      : initData.pillarId === "P4" ? mStrategy.id
      : mHr.id;

    const init = await prisma.entity.create({
      data: {
        orgId,
        key: initData.key,
        orgEntityTypeId: etInitiative.id,
        title: initData.title,
        titleAr: initData.titleAr,
        ownerUserId: owner,
        parentId: pillarId ?? null, // Link to parent pillar
        status: Status.ACTIVE,
        sourceType: KpiSourceType.MANUAL,
        periodType: KpiPeriodType.YEARLY,
        unit: "%",
        unitAr: "%",
        direction: KpiDirection.INCREASE_IS_GOOD,
        indicatorType: KpiIndicatorType.LEADING,
        aggregation: KpiAggregationMethod.LAST_VALUE,
        targetValue: 100,
        baselineValue: 0,
      },
    });

    // Add initiative progress value
    const initIdx = TATWEER_DATA.initiatives.indexOf(initData);
    const progress = 25 + (initIdx * 5); // Varying progress 25%-80%
    await prisma.entityValue.create({
      data: {
        entityId: init.id,
        actualValue: Math.min(progress, 95),
        finalValue: Math.min(progress, 95),
        status: KpiValueStatus.APPROVED,
        approvalType: KpiApprovalType.MANUAL,
        note: "Initiative progress update",
        enteredBy: owner,
        submittedBy: owner,
        approvedBy: admin.id,
        submittedAt: monthsAgo(1),
        approvedAt: monthsAgo(1),
        createdAt: monthsAgo(1),
      },
    });
  }
  console.log(`  ✓  initiatives (${TATWEER_DATA.initiatives.length})`);

  // ── KPI Connections: Calculated KPIs with Formulas & Variables ───────────────
  console.log("  🔗  creating KPI connections...");

  // 1. Create a composite Pillar Score KPI for each pillar (calculated from objective KPIs)
  for (const pillarData of TATWEER_DATA.pillars) {
    const pillarId = pillarIdMap.get(pillarData.key);
    if (!pillarId) continue;

    // Get all KPIs for this pillar's objectives
    const pillarKpiKeys = pillarData.objectives.map(o => o.kpiCode);
    const formulaParts = pillarKpiKeys.map(k => `get("${k}")`).join(" + ");
    const formula = `(${formulaParts}) / ${pillarData.objectives.length}`;

    const compositeKpi = await prisma.entity.create({
      data: {
        orgId,
        key: `${pillarData.key}_score`,
        orgEntityTypeId: etKpi.id,
        title: `${pillarData.title} - Composite Score`,
        titleAr: `${pillarData.titleAr} - النتيجة المركبة`,
        ownerUserId: ceo.id,
        parentId: pillarId, // Link to parent pillar
        status: Status.ACTIVE,
        sourceType: KpiSourceType.CALCULATED,
        periodType: KpiPeriodType.QUARTERLY,
        unit: "%",
        unitAr: "%",
        direction: KpiDirection.INCREASE_IS_GOOD,
        indicatorType: KpiIndicatorType.LAGGING,
        aggregation: KpiAggregationMethod.AVERAGE,
        targetValue: 85,
        formula,
      },
    });
    kpiIdMap.set(`${pillarData.key}_score`, compositeKpi.id);
  }

  // 2. Create Entity Variables for composite KPIs that need manual inputs
  // Example: Overall Performance Index that combines all pillar scores
  const overallPerfKpi = await prisma.entity.create({
    data: {
      orgId,
      key: "KPI-OVERALL",
      orgEntityTypeId: etKpi.id,
      title: "Overall Strategic Performance Index",
      titleAr: "مؤشر الأداء الاستراتيجي العام",
      ownerUserId: ceo.id,
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: KpiPeriodType.YEARLY,
      unit: "%",
      unitAr: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      indicatorType: KpiIndicatorType.LAGGING,
      aggregation: KpiAggregationMethod.AVERAGE,
      targetValue: 80,
      formula: '(get("pillar_1_score") + get("pillar_2_score") + get("pillar_3_score") + get("pillar_4_score") + get("pillar_5_score")) / 5',
    },
  });
  kpiIdMap.set("KPI-OVERALL", overallPerfKpi.id);

  // 3. Create a calculated KPI with variables (example: ROI calculation)
  const roiKpi = await prisma.entity.create({
    data: {
      orgId,
      key: "KPI-ROI-CALC",
      orgEntityTypeId: etKpi.id,
      title: "Return on Investment (Calculated)",
      titleAr: "العائد على الاستثمار (محسوب)",
      ownerUserId: mFinance.id,
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: KpiPeriodType.QUARTERLY,
      unit: "%",
      unitAr: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      indicatorType: KpiIndicatorType.LAGGING,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      targetValue: 15,
      formula: "((vars.REVENUE - vars.COST) / vars.COST) * 100",
    },
  });
  kpiIdMap.set("KPI-ROI-CALC", roiKpi.id);

  // Create variables for ROI KPI
  const varRevenue = await prisma.entityVariable.create({
    data: {
      entityId: roiKpi.id,
      code: "REVENUE",
      displayName: "Total Revenue",
      nameAr: "الإيرادات الكلية",
      dataType: KpiVariableDataType.NUMBER,
      isRequired: true,
      isStatic: false,
    },
  });

  const varCost = await prisma.entityVariable.create({
    data: {
      entityId: roiKpi.id,
      code: "COST",
      displayName: "Total Cost",
      nameAr: "التكاليف الكلية",
      dataType: KpiVariableDataType.NUMBER,
      isRequired: true,
      isStatic: false,
    },
  });

  // Create initial value for ROI KPI with variable values
  const roiValue = await prisma.entityValue.create({
    data: {
      entityId: roiKpi.id,
      actualValue: 12.5,
      finalValue: 12.5,
      status: KpiValueStatus.APPROVED,
      approvalType: KpiApprovalType.MANUAL,
      note: "Q1 2024 - ROI calculation with variable inputs",
      enteredBy: mFinance.id,
      submittedBy: mFinance.id,
      approvedBy: admin.id,
      submittedAt: monthsAgo(3),
      approvedAt: monthsAgo(2),
      createdAt: monthsAgo(3),
    },
  });

  // Add variable values for ROI
  await prisma.entityVariableValue.createMany({
    data: [
      { entityValueId: roiValue.id, entityVariableId: varRevenue.id, value: 1250000 },
      { entityValueId: roiValue.id, entityVariableId: varCost.id, value: 1111111 },
    ],
  });

  // 4. Create parent-child KPI relationships through naming convention
  // Customer Satisfaction KPI with sub-KPIs
  const csatParent = await prisma.entity.create({
    data: {
      orgId,
      key: "KPI-CSAT-OVERALL",
      orgEntityTypeId: etKpi.id,
      title: "Overall Customer Satisfaction",
      titleAr: "الرضا العام للعملاء",
      ownerUserId: mOperations.id,
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: KpiPeriodType.MONTHLY,
      unit: "%",
      unitAr: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      indicatorType: KpiIndicatorType.LAGGING,
      aggregation: KpiAggregationMethod.AVERAGE,
      targetValue: 90,
      formula: '(get("KPI-P1-1") * 0.4 + get("KPI-CSAT-SERVICE") * 0.35 + get("KPI-CSAT-PRODUCT") * 0.25)',
    },
  });
  kpiIdMap.set("KPI-CSAT-OVERALL", csatParent.id);

  // Child KPIs for Customer Satisfaction
  const csatService = await prisma.entity.create({
    data: {
      orgId,
      key: "KPI-CSAT-SERVICE",
      orgEntityTypeId: etKpi.id,
      title: "Service Quality Satisfaction",
      titleAr: "رضا جودة الخدمة",
      ownerUserId: mOperations.id,
      parentId: csatParent.id, // Link to CSAT parent
      status: Status.ACTIVE,
      sourceType: KpiSourceType.MANUAL,
      periodType: KpiPeriodType.MONTHLY,
      unit: "%",
      unitAr: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      indicatorType: KpiIndicatorType.LAGGING,
      aggregation: KpiAggregationMethod.AVERAGE,
      targetValue: 88,
      baselineValue: 70,
    },
  });
  kpiIdMap.set("KPI-CSAT-SERVICE", csatService.id);

  const csatProduct = await prisma.entity.create({
    data: {
      orgId,
      key: "KPI-CSAT-PRODUCT",
      orgEntityTypeId: etKpi.id,
      title: "Product Quality Satisfaction",
      titleAr: "رضا جودة المنتج",
      ownerUserId: mQuality.id,
      parentId: csatParent.id, // Link to CSAT parent
      status: Status.ACTIVE,
      sourceType: KpiSourceType.MANUAL,
      periodType: KpiPeriodType.MONTHLY,
      unit: "%",
      unitAr: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      indicatorType: KpiIndicatorType.LAGGING,
      aggregation: KpiAggregationMethod.AVERAGE,
      targetValue: 85,
      baselineValue: 65,
    },
  });
  kpiIdMap.set("KPI-CSAT-PRODUCT", csatProduct.id);

  // Create values for child KPIs
  await prisma.entityValue.createMany({
    data: [
      {
        entityId: csatService.id,
        actualValue: 82,
        finalValue: 82,
        status: KpiValueStatus.APPROVED,
        approvalType: KpiApprovalType.MANUAL,
        note: "Service satisfaction - March 2024",
        enteredBy: mOperations.id,
        submittedBy: mOperations.id,
        approvedBy: admin.id,
        submittedAt: monthsAgo(1),
        approvedAt: monthsAgo(1),
        createdAt: monthsAgo(1),
      },
      {
        entityId: csatProduct.id,
        actualValue: 79,
        finalValue: 79,
        status: KpiValueStatus.APPROVED,
        approvalType: KpiApprovalType.MANUAL,
        note: "Product satisfaction - March 2024",
        enteredBy: mQuality.id,
        submittedBy: mQuality.id,
        approvedBy: admin.id,
        submittedAt: monthsAgo(1),
        approvedAt: monthsAgo(1),
        createdAt: monthsAgo(1),
      },
    ],
  });

  // 5. Create a leading indicator KPI that predicts a lagging KPI
  const leadingIndicator = await prisma.entity.create({
    data: {
      orgId,
      key: "KPI-LEAD-PERF",
      orgEntityTypeId: etKpi.id,
      title: "Performance Predictor (Leading)",
      titleAr: "مؤشر التنبؤ بالأداء (مسبق)",
      ownerUserId: mStrategy.id,
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: KpiPeriodType.MONTHLY,
      unit: "score",
      unitAr: "نقطة",
      direction: KpiDirection.INCREASE_IS_GOOD,
      indicatorType: KpiIndicatorType.LEADING,
      aggregation: KpiAggregationMethod.AVERAGE,
      targetValue: 75,
      formula: '(get("KPI-P5-6") * 0.5 + get("KPI-P4-2") * 0.3 + get("KPI-P5-2") * 0.2)',
    },
  });
  kpiIdMap.set("KPI-LEAD-PERF", leadingIndicator.id);

  console.log(`  ✓  calculated KPIs (${5} composite + ${1} ROI + ${3} CSAT + ${1} leading)`);
  console.log(`  ✓  entity variables (${2} for ROI)`);
  console.log(`  ✓  KPI connections established`);

  // ── Q4 Draft / Submitted values for approval workflow testing ──────────────
  // Pick a few KPIs and create DRAFT or SUBMITTED values so testers can exercise the approval flow
  const approvalTestKpis = [
    { key: "KPI-P1-1", value: 88, status: KpiValueStatus.SUBMITTED, submitter: mOperations.id, note: "Q4 2025 - Pending approval" },
    { key: "KPI-P2-1", value: 32, status: KpiValueStatus.SUBMITTED, submitter: mOperations.id, note: "Q4 2025 - Pending approval" },
    { key: "KPI-P3-1", value: 80, status: KpiValueStatus.DRAFT, submitter: mQuality.id, note: "Q4 2025 - Draft, not yet submitted" },
    { key: "KPI-P5-6", value: 70, status: KpiValueStatus.SUBMITTED, submitter: ceo.id, note: "Q4 2025 - Pending approval" },
  ];

  for (const t of approvalTestKpis) {
    const kpiId = kpiIdMap.get(t.key);
    if (!kpiId) continue;
    await prisma.entityValue.create({
      data: {
        entityId: kpiId,
        actualValue: t.value,
        finalValue: t.status === KpiValueStatus.DRAFT ? null : t.value,
        status: t.status,
        approvalType: KpiApprovalType.MANUAL,
        note: t.note,
        enteredBy: t.submitter,
        submittedBy: t.status === KpiValueStatus.SUBMITTED ? t.submitter : null,
        submittedAt: t.status === KpiValueStatus.SUBMITTED ? new Date() : null,
        createdAt: new Date(),
      },
    });
  }
  console.log(`  ✓  approval workflow test values (${approvalTestKpis.length})`);

  // ── Calculate Derived KPI Values ────────────────────────────────────────────
  console.log("  🧮  calculating derived entity values...");

  // Get all entities with formulas (KPIs and Objectives)
  const calculatedEntities = await prisma.entity.findMany({
    where: {
      orgId,
      deletedAt: null,
      formula: { not: null },
      sourceType: { in: [KpiSourceType.CALCULATED, KpiSourceType.DERIVED] },
    },
    select: {
      id: true,
      key: true,
      formula: true,
      targetValue: true,
      orgEntityType: { select: { code: true } },
    },
  });

  // Helper to extract KPI keys from formula
  function extractGetKeys(formula: string): string[] {
    const keys: string[] = [];
    const regex = /get\("([^"]+)"\)/g;
    let match;
    while ((match = regex.exec(formula)) !== null) {
      keys.push(match[1]);
    }
    return keys;
  }

  // Calculate each derived entity
  for (const entity of calculatedEntities) {
    if (!entity.formula || !entity.key) continue;

    // Get referenced KPI values
    const refKeys = extractGetKeys(entity.formula);
    const refValues: Record<string, number> = {};

    for (const refKey of refKeys) {
      const refValue = await prisma.entityValue.findFirst({
        where: { entity: { orgId, key: refKey } },
        orderBy: { createdAt: 'desc' },
        select: { finalValue: true, actualValue: true },
      });
      const val = refValue?.finalValue ?? refValue?.actualValue;
      if (typeof val === 'number') {
        refValues[refKey] = val;
      }
    }

    // Skip if missing dependencies
    if (refKeys.length > 0 && Object.keys(refValues).length === 0) {
      console.log(`    ⚠️  ${entity.key}: missing dependencies, skipping`);
      continue;
    }

    // Simple formula evaluation (only supports get() and basic math)
    let calculatedValue: number | null = null;
    try {
      let expr = entity.formula;
      // Replace get("KEY") with actual values
      for (const [key, val] of Object.entries(refValues)) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
        expr = expr.replace(new RegExp(`get\\("${escapedKey}"\\)`, 'g'), String(val));
      }
      // Handle vars.VARNAME for variable-based KPIs
      if (expr.includes('vars.')) {
        // Variable-based formulas need entityVariableValues - skip for now
        console.log(`    ⚠️  ${entity.key}: variable-based, manual input needed`);
        continue;
      }
      // Safely evaluate
      calculatedValue = Function(`"use strict"; return (${expr})`)();
    } catch (e) {
      console.log(`    ❌ ${entity.key}: formula error`);
      continue;
    }

    if (typeof calculatedValue === 'number' && !isNaN(calculatedValue)) {
      // Create or update value
      const existing = await prisma.entityValue.findFirst({
        where: { entityId: entity.id },
        select: { id: true },
      });

      if (existing) {
        await prisma.entityValue.update({
          where: { id: existing.id },
          data: {
            calculatedValue,
            finalValue: calculatedValue,
            status: KpiValueStatus.APPROVED,
            note: 'Auto-calculated from formula',
            approvedAt: new Date(),
          },
        });
      } else {
        await prisma.entityValue.create({
          data: {
            entityId: entity.id,
            calculatedValue,
            finalValue: calculatedValue,
            status: KpiValueStatus.APPROVED,
            approvalType: KpiApprovalType.MANUAL,
            note: 'Auto-calculated from formula',
            enteredBy: admin.id,
            submittedBy: admin.id,
            approvedBy: admin.id,
            submittedAt: new Date(),
            approvedAt: new Date(),
          },
        });
      }
      console.log(`    ✓ ${entity.key}: ${calculatedValue.toFixed(2)}`);
    }
  }

  // Second pass: recalculate entities that were skipped (pillars depend on composite scores)
  console.log("  🔄  second pass for remaining derived entities...");
  for (const entity of calculatedEntities) {
    if (!entity.formula || !entity.key) continue;

    // Skip if already has a calculated value
    const alreadyDone = await prisma.entityValue.findFirst({
      where: { entityId: entity.id, calculatedValue: { not: null } },
      select: { id: true },
    });
    if (alreadyDone) continue;

    const refKeys = extractGetKeys(entity.formula);
    const refValues: Record<string, number> = {};

    for (const refKey of refKeys) {
      const refValue = await prisma.entityValue.findFirst({
        where: { entity: { orgId, key: refKey } },
        orderBy: { createdAt: 'desc' },
        select: { finalValue: true, actualValue: true, calculatedValue: true },
      });
      const val = refValue?.finalValue ?? refValue?.calculatedValue ?? refValue?.actualValue;
      if (typeof val === 'number') {
        refValues[refKey] = val;
      }
    }

    if (refKeys.length > 0 && Object.keys(refValues).length === 0) continue;

    let calculatedValue2: number | null = null;
    try {
      let expr = entity.formula;
      for (const [key, val] of Object.entries(refValues)) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
        expr = expr.replace(new RegExp(`get\\("${escapedKey}"\\)`, 'g'), String(val));
      }
      if (expr.includes('vars.')) continue;
      calculatedValue2 = Function(`"use strict"; return (${expr})`)();
    } catch { continue; }

    if (typeof calculatedValue2 === 'number' && !isNaN(calculatedValue2)) {
      await prisma.entityValue.create({
        data: {
          entityId: entity.id,
          calculatedValue: calculatedValue2,
          finalValue: calculatedValue2,
          status: KpiValueStatus.APPROVED,
          approvalType: KpiApprovalType.MANUAL,
          note: 'Auto-calculated from formula (2nd pass)',
          enteredBy: admin.id,
          submittedBy: admin.id,
          approvedBy: admin.id,
          submittedAt: new Date(),
          approvedAt: new Date(),
        },
      });
      console.log(`    ✓ ${entity.key}: ${calculatedValue2.toFixed(2)}`);
    }
  }

  console.log(`  ✓  calculated ${calculatedEntities.length} derived entity values`);

  // ── User-Entity Assignments ────────────────────────────────────────────────
  const assignments: Array<{ userId: string; entityId: string }> = [];

  // Assign managers to their KPIs
  for (const [kpiKey, kpiId] of kpiIdMap) {
    const kpi = await prisma.entity.findUnique({ where: { id: kpiId } });
    if (kpi?.ownerUserId) {
      assignments.push({ userId: kpi.ownerUserId, entityId: kpiId });
    }
  }

  // Assign CEO to all pillars and objectives
  for (const [, pillarId] of pillarIdMap) {
    assignments.push({ userId: ceo.id, entityId: pillarId });
  }
  for (const [, objId] of objectiveIdMap) {
    assignments.push({ userId: ceo.id, entityId: objId });
  }

  for (const a of assignments) {
    await prisma.userEntityAssignment.create({
      data: { userId: a.userId, entityId: a.entityId, assignedBy: admin.id },
    });
  }
  console.log(`  ✓  assignments (${assignments.length})`);

  // ── Notifications ────────────────────────────────────────────────────────────
  const notifications = [
    { userId: ceo.id, type: NotificationType.APPROVAL_PENDING, message: "Q1 2025 KPI values are ready for review", messageAr: "قيم مؤشرات الأداء للربع الأول 2025 جاهزة للمراجعة" },
    { userId: mOperations.id, type: NotificationType.VALUE_APPROVED, message: "Your submitted KPI values have been approved", messageAr: "تمت الموافقة على قيم مؤشرات الأداء المقدمة" },
    { userId: mStrategy.id, type: NotificationType.VALUE_REJECTED, message: "Some KPI values need correction. Please review.", messageAr: "بعض قيم مؤشرات الأداء تحتاج إلى تصحيح. يرجى المراجعة." },
  ];

  for (const n of notifications) {
    await prisma.notification.create({
      data: { type: n.type, message: n.message, messageAr: n.messageAr, orgId, userId: n.userId },
    });
  }
  console.log(`  ✓  notifications (${notifications.length})`);

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("");
  console.log("🎉  RAFED Tatweer Strategy House seed complete!");
  console.log("");
  console.log("📋  Summary:");
  console.log(`    Organization: ${org.name}`);
  console.log(`    Domain: ${domain}`);
  console.log(`    Pillars: ${TATWEER_DATA.pillars.length}`);
  console.log(`    Objectives: ${objectiveIdMap.size}`);
  console.log(`    KPIs: ${kpiIdMap.size}`);
  console.log(`    Initiatives: ${TATWEER_DATA.initiatives.length}`);
  console.log(`    Users: 8`);
  console.log("");
  console.log("🔑  Login credentials:");
  console.log(`    admin@${domain} / ${defaultPassword}`);
  console.log(`    ceo@${domain} / ${defaultPassword}`);
  console.log("");
  console.log("📍  Tatweer 2030 Strategic Pillars:");
  for (const p of TATWEER_DATA.pillars) {
    console.log(`    ${p.id}. ${p.titleAr}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
