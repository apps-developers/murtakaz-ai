/**
 * seed-demo.ts
 *
 * Comprehensive demo seed:
 *  - 1 Organization
 *  - 8 Users (ADMIN, EXECUTIVE, 6 MANAGERs)
 *  - Entity types: objective, kpi, initiative, risk
 *  - 8 Strategic Objectives
 *  - 14 KPIs with targets, units, variables, formulas
 *  - Multi-period EntityValues (APPROVED history + SUBMITTED current)
 *  - EntityVariableValues for KPIs that have variables
 *  - UserEntityAssignments
 *  - Notifications (APPROVAL_PENDING, VALUE_APPROVED, VALUE_REJECTED)
 *
 * Run:  pnpm db:seed-demo
 * Env:  SEED_DEFAULT_PASSWORD (default: password123)
 *       SEED_ORG_DOMAIN       (default: demo.rafed.local)
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
  NotificationType,
  Role,
  Status,
} from "@prisma/client";
import { webcrypto } from "node:crypto";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const g = globalThis as unknown as { crypto?: unknown };
if (!g.crypto) g.crypto = webcrypto as unknown;

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── wipe ─────────────────────────────────────────────────────────────────────

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
  const domain = process.env.SEED_ORG_DOMAIN ?? "demo.rafed.local";
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
  const pwHash = await hashPassword(defaultPassword);

  console.log(`🌱  Seeding demo org — domain: ${domain}`);

  await wipeDomain(domain);

  // ── Organization ────────────────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      id: "org-demo",
      name: "Rafed Group",
      nameAr: "مجموعة رافد",
      domain,
      kpiApprovalLevel: "MANAGER",
      ragGreenMin: 75,
      ragAmberMin: 50,
      mission: "Drive sustainable value across our portfolio.",
      missionAr: "قيادة القيمة المستدامة عبر محفظتنا.",
      vision: "To be the region's most trusted holding group.",
      visionAr: "أن نكون أكثر مجموعات الاستثمار موثوقية في المنطقة.",
    },
  });
  const orgId = org.id;
  console.log(`  ✓  org: ${org.name}`);

  // ── Entity Types ─────────────────────────────────────────────────────────────
  const [etObjective, etKpi, etInitiative, etRisk] = await Promise.all([
    prisma.orgEntityType.create({ data: { orgId, code: "objective", name: "Strategic Objective", nameAr: "الهدف الاستراتيجي", sortOrder: 1 } }),
    prisma.orgEntityType.create({ data: { orgId, code: "kpi", name: "KPI", nameAr: "مؤشر الأداء", sortOrder: 2 } }),
    prisma.orgEntityType.create({ data: { orgId, code: "initiative", name: "Initiative", nameAr: "مبادرة", sortOrder: 3 } }),
    prisma.orgEntityType.create({ data: { orgId, code: "risk", name: "Risk", nameAr: "مخاطر", sortOrder: 4 } }),
  ]);
  console.log("  ✓  entity types");

  // ── Users ─────────────────────────────────────────────────────────────────────
  async function createUser(id: string, email: string, name: string, role: Role, title: string, managerId: string | null) {
    const u = await prisma.user.create({
      data: { id, orgId, email, emailVerified: true, name, role, title, managerId, hashedPassword: pwHash },
    });
    await prisma.account.create({ data: { userId: u.id, providerId: "credential", accountId: u.id, password: pwHash } });
    return u;
  }

  const admin    = await createUser("u-admin",   "admin@demo.rafed.local",      "Sara Al-Rashid",     Role.ADMIN,     "System Administrator",       null);
  const ceo      = await createUser("u-ceo",     "ceo@demo.rafed.local",        "Khalid Al-Marzouqi", Role.EXECUTIVE, "Group CEO",                  null);
  const mFinance = await createUser("u-finance", "cfo@demo.rafed.local",        "Rania Al-Dosari",    Role.MANAGER,   "Chief Financial Officer",    ceo.id);
  const mInvest  = await createUser("u-invest",  "investment@demo.rafed.local", "Faisal Al-Hamdan",   Role.MANAGER,   "Head of Investment",         ceo.id);
  const mHr      = await createUser("u-hr",      "hr@demo.rafed.local",         "Nora Al-Otaibi",     Role.MANAGER,   "CHRO",                       ceo.id);
  const mIt      = await createUser("u-it",      "cio@demo.rafed.local",        "Omar Al-Shehri",     Role.MANAGER,   "Chief Information Officer",  ceo.id);
  const mStrat   = await createUser("u-strat",   "strategy@demo.rafed.local",   "Lina Al-Qahtani",    Role.MANAGER,   "Head of Strategy",           ceo.id);
  const mAudit   = await createUser("u-audit",   "audit@demo.rafed.local",      "Tariq Al-Zahrani",   Role.MANAGER,   "Head of Internal Audit",     ceo.id);

  console.log("  ✓  users (8)");

  // ── Strategic Objectives ──────────────────────────────────────────────────────
  async function makeObjective(id: string, key: string, title: string, titleAr: string, owner: string, status: Status) {
    return prisma.entity.create({
      data: {
        id, orgId, key,
        orgEntityTypeId: etObjective.id,
        title, titleAr,
        ownerUserId: owner,
        status,
        sourceType: KpiSourceType.DERIVED,
        periodType: KpiPeriodType.YEARLY,
        unit: "score", unitAr: "نقاط",
        direction: KpiDirection.INCREASE_IS_GOOD,
        aggregation: KpiAggregationMethod.LAST_VALUE,
        targetValue: 100,
      },
    });
  }

  await makeObjective("obj-1", "OBJ-1", "Expand Investment Portfolio",        "توسيع المحفظة الاستثمارية",      mInvest.id,  Status.ACTIVE);
  await makeObjective("obj-2", "OBJ-2", "Enhance Investment Leadership",       "تعزيز الريادة الاستثمارية",       mInvest.id,  Status.ACTIVE);
  await makeObjective("obj-3", "OBJ-3", "Boost Revenue & Sustainability",      "تعزيز الإيرادات والاستدامة",      mFinance.id, Status.ACTIVE);
  await makeObjective("obj-4", "OBJ-4", "Financial Discipline",                "الانضباط المالي",                 mFinance.id, Status.AT_RISK);
  await makeObjective("obj-5", "OBJ-5", "Governance Compliance",               "الامتثال للحوكمة",                mAudit.id,   Status.ACTIVE);
  await makeObjective("obj-6", "OBJ-6", "Organizational Culture & Capability", "الثقافة التنظيمية والقدرات",      mHr.id,      Status.ACTIVE);
  await makeObjective("obj-7", "OBJ-7", "Increase Brand Value",                "زيادة قيمة العلامة التجارية",     mStrat.id,   Status.ACTIVE);
  await makeObjective("obj-8", "OBJ-8", "Digital Transformation",              "التحول الرقمي",                   mIt.id,      Status.PLANNED);

  console.log("  ✓  objectives (8)");

  // ── KPIs ──────────────────────────────────────────────────────────────────────
  type KpiDef = {
    id: string; key: string; title: string; titleAr: string;
    owner: string; status: Status;
    periodType: KpiPeriodType; unit: string; unitAr: string;
    target: number; baseline: number;
    direction: KpiDirection; indicatorType: KpiIndicatorType;
    sourceType: KpiSourceType; formula?: string;
  };

  const kpiDefs: KpiDef[] = [
    { id: "kpi-1-1", key: "KPI-1-1", title: "New Sectors Entered",            titleAr: "القطاعات الجديدة التي تم الدخول فيها",  owner: mInvest.id,  status: Status.ACTIVE,   periodType: KpiPeriodType.YEARLY,     unit: "Count",   unitAr: "عدد",       target: 7,   baseline: 0,   direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LEADING,  sourceType: KpiSourceType.MANUAL },
    { id: "kpi-1-2", key: "KPI-1-2", title: "CAGR of New Investments",        titleAr: "معدل النمو السنوي للاستثمارات الجديدة",  owner: mInvest.id,  status: Status.ACTIVE,   periodType: KpiPeriodType.YEARLY,     unit: "%",       unitAr: "%",         target: 12,  baseline: 5,   direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LAGGING,  sourceType: KpiSourceType.MANUAL },
    { id: "kpi-2-1", key: "KPI-2-1", title: "ROI vs Market Average",          titleAr: "العائد على الاستثمار مقارنة بالسوق",     owner: mInvest.id,  status: Status.AT_RISK,  periodType: KpiPeriodType.QUARTERLY,  unit: "%",       unitAr: "%",         target: 15,  baseline: 8,   direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LAGGING,  sourceType: KpiSourceType.MANUAL },
    { id: "kpi-2-2", key: "KPI-2-2", title: "Contribution of New Investments", titleAr: "نسبة مساهمة الاستثمارات الجديدة",       owner: mInvest.id,  status: Status.ACTIVE,   periodType: KpiPeriodType.QUARTERLY,  unit: "%",       unitAr: "%",         target: 20,  baseline: 10,  direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LEADING,  sourceType: KpiSourceType.MANUAL },
    { id: "kpi-3-1", key: "KPI-3-1", title: "Total Annual Revenue",           titleAr: "إجمالي الإيرادات السنوية",               owner: mFinance.id, status: Status.ACTIVE,   periodType: KpiPeriodType.QUARTERLY,  unit: "SAR M",   unitAr: "مليون ريال",target: 500, baseline: 320, direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LAGGING,  sourceType: KpiSourceType.CALCULATED, formula: "vars.REVENUE" },
    { id: "kpi-3-2", key: "KPI-3-2", title: "Sustainable Revenue Share",      titleAr: "نسبة الإيرادات المستدامة",               owner: mFinance.id, status: Status.ACTIVE,   periodType: KpiPeriodType.YEARLY,     unit: "%",       unitAr: "%",         target: 60,  baseline: 35,  direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LEADING,  sourceType: KpiSourceType.MANUAL },
    { id: "kpi-4-1", key: "KPI-4-1", title: "System Compliance Rate",         titleAr: "نسبة الالتزام بتطبيق النظام",            owner: mFinance.id, status: Status.ACTIVE,   periodType: KpiPeriodType.QUARTERLY,  unit: "%",       unitAr: "%",         target: 100, baseline: 70,  direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LAGGING,  sourceType: KpiSourceType.MANUAL },
    { id: "kpi-5-1", key: "KPI-5-1", title: "Governance Compliance Rate",     titleAr: "نسبة الامتثال لمتطلبات الحوكمة",         owner: mAudit.id,   status: Status.ACTIVE,   periodType: KpiPeriodType.QUARTERLY,  unit: "%",       unitAr: "%",         target: 100, baseline: 72,  direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LAGGING,  sourceType: KpiSourceType.MANUAL },
    { id: "kpi-6-1", key: "KPI-6-1", title: "Training Participation Rate",    titleAr: "معدل المشاركة في الدورات التدريبية",     owner: mHr.id,      status: Status.ACTIVE,   periodType: KpiPeriodType.YEARLY,     unit: "%",       unitAr: "%",         target: 80,  baseline: 55,  direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LEADING,  sourceType: KpiSourceType.MANUAL },
    { id: "kpi-6-2", key: "KPI-6-2", title: "Organizational Culture Index",   titleAr: "مؤشر الثقافة التنظيمية",                owner: mHr.id,      status: Status.AT_RISK,  periodType: KpiPeriodType.YEARLY,     unit: "Score",   unitAr: "نقطة",      target: 85,  baseline: 60,  direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LAGGING,  sourceType: KpiSourceType.MANUAL },
    { id: "kpi-7-1", key: "KPI-7-1", title: "Brand Value Growth",             titleAr: "نسبة نمو قيمة العلامة التجارية",         owner: mStrat.id,   status: Status.ACTIVE,   periodType: KpiPeriodType.YEARLY,     unit: "%",       unitAr: "%",         target: 20,  baseline: 8,   direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LEADING,  sourceType: KpiSourceType.MANUAL },
    { id: "kpi-8-1", key: "KPI-8-1", title: "Brand Awareness Index",          titleAr: "مؤشر الوعي بالعلامة التجارية",           owner: mStrat.id,   status: Status.ACTIVE,   periodType: KpiPeriodType.YEARLY,     unit: "Score",   unitAr: "نقطة",      target: 75,  baseline: 55,  direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LAGGING,  sourceType: KpiSourceType.MANUAL },
    { id: "kpi-8-2", key: "KPI-8-2", title: "Marketing Campaigns Executed",   titleAr: "عدد الحملات التسويقية المنفذة",           owner: mStrat.id,   status: Status.COMPLETED,periodType: KpiPeriodType.YEARLY,     unit: "Count",   unitAr: "عدد",       target: 4,   baseline: 1,   direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LEADING,  sourceType: KpiSourceType.MANUAL },
    { id: "kpi-9-1", key: "KPI-9-1", title: "IT Systems Uptime",              titleAr: "مدة تشغيل الأنظمة",                      owner: mIt.id,      status: Status.ACTIVE,   periodType: KpiPeriodType.MONTHLY,    unit: "%",       unitAr: "%",         target: 99.9,baseline: 95,  direction: KpiDirection.INCREASE_IS_GOOD, indicatorType: KpiIndicatorType.LAGGING,  sourceType: KpiSourceType.MANUAL },
  ];

  for (const k of kpiDefs) {
    await prisma.entity.create({
      data: {
        id: k.id, orgId, key: k.key,
        orgEntityTypeId: etKpi.id,
        title: k.title, titleAr: k.titleAr,
        ownerUserId: k.owner,
        status: k.status,
        sourceType: k.sourceType,
        periodType: k.periodType,
        unit: k.unit, unitAr: k.unitAr,
        direction: k.direction,
        indicatorType: k.indicatorType,
        aggregation: KpiAggregationMethod.LAST_VALUE,
        baselineValue: k.baseline,
        targetValue: k.target,
        formula: k.formula ?? null,
        weight: 1.0,
      },
    });
  }
  console.log(`  ✓  KPIs (${kpiDefs.length})`);

  // ── EntityVariables for KPI-3-1 (Revenue — CALCULATED) ───────────────────────
  const varRevenue = await prisma.entityVariable.create({
    data: {
      entityId: "kpi-3-1",
      code: "REVENUE",
      displayName: "Quarterly Revenue",
      nameAr: "الإيرادات الفصلية",
      dataType: "NUMBER",
      isRequired: true,
      isStatic: false,
    },
  });

  // ── EntityVariables for KPI-2-1 (ROI — two inputs) ───────────────────────────
  const varPortfolioReturn = await prisma.entityVariable.create({
    data: {
      entityId: "kpi-2-1",
      code: "PORTFOLIO_RTN",
      displayName: "Portfolio Return %",
      nameAr: "عائد المحفظة %",
      dataType: "PERCENTAGE",
      isRequired: true,
      isStatic: false,
    },
  });
  const varMarketReturn = await prisma.entityVariable.create({
    data: {
      entityId: "kpi-2-1",
      code: "MARKET_RTN",
      displayName: "Market Return %",
      nameAr: "عائد السوق %",
      dataType: "PERCENTAGE",
      isRequired: true,
      isStatic: false,
    },
  });

  // Update KPI-2-1 formula to use variables
  await prisma.entity.update({
    where: { id: "kpi-2-1" },
    data: { formula: "vars.PORTFOLIO_RTN - vars.MARKET_RTN", sourceType: KpiSourceType.CALCULATED },
  });

  console.log("  ✓  variables (3)");

  // ── UserEntityAssignments ─────────────────────────────────────────────────────
  const assignments = [
    // Finance manager → finance KPIs
    { userId: mFinance.id, entityId: "kpi-3-1" },
    { userId: mFinance.id, entityId: "kpi-3-2" },
    { userId: mFinance.id, entityId: "kpi-4-1" },
    // Investment manager → investment KPIs
    { userId: mInvest.id,  entityId: "kpi-1-1" },
    { userId: mInvest.id,  entityId: "kpi-1-2" },
    { userId: mInvest.id,  entityId: "kpi-2-1" },
    { userId: mInvest.id,  entityId: "kpi-2-2" },
    // HR manager → HR KPIs
    { userId: mHr.id,      entityId: "kpi-6-1" },
    { userId: mHr.id,      entityId: "kpi-6-2" },
    // Audit → governance
    { userId: mAudit.id,   entityId: "kpi-5-1" },
    // IT
    { userId: mIt.id,      entityId: "kpi-9-1" },
    // Strategy
    { userId: mStrat.id,   entityId: "kpi-7-1" },
    { userId: mStrat.id,   entityId: "kpi-8-1" },
    { userId: mStrat.id,   entityId: "kpi-8-2" },
    // CEO sees all objectives
    { userId: ceo.id,      entityId: "obj-1" },
    { userId: ceo.id,      entityId: "obj-2" },
    { userId: ceo.id,      entityId: "obj-3" },
    { userId: ceo.id,      entityId: "obj-4" },
  ];

  for (const a of assignments) {
    await prisma.userEntityAssignment.create({
      data: { userId: a.userId, entityId: a.entityId, assignedBy: admin.id },
    });
  }
  console.log(`  ✓  assignments (${assignments.length})`);

  // ── EntityValues — historical + current ────────────────────────────────────────
  //  Pattern per KPI:
  //    • 3–4 APPROVED historical periods (oldest → newest)
  //    • 1 SUBMITTED current period (needing approval → triggers notification)
  //  For KPI-6-2 and KPI-4-1 we seed one REJECTED to test that path.
  //  For KPI-9-1 (monthly) we add 6 APPROVED monthly periods + 1 DRAFT current.

  type PeriodSeed = {
    entityId: string;
    enteredBy: string;
    submittedBy: string;
    approvedBy: string;
    status: KpiValueStatus;
    approvalType: KpiApprovalType;
    actualValue: number;
    note: string;
    createdAt: Date;
    submittedAt?: Date;
    approvedAt?: Date;
    varValues?: Array<{ variableId: string; value: number }>;
  };

  const periods: PeriodSeed[] = [
    // ── KPI-1-1  New Sectors Entered (target 7) ──────────────────────────────
    { entityId: "kpi-1-1", enteredBy: mInvest.id, submittedBy: mInvest.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 1, note: "Q1 2024 — First sector entered (Logistics).",            createdAt: monthsAgo(15), submittedAt: monthsAgo(15), approvedAt: monthsAgo(14) },
    { entityId: "kpi-1-1", enteredBy: mInvest.id, submittedBy: mInvest.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 3, note: "Q2 2024 — Two more sectors added (Healthcare, Fintech).", createdAt: monthsAgo(12), submittedAt: monthsAgo(12), approvedAt: monthsAgo(11) },
    { entityId: "kpi-1-1", enteredBy: mInvest.id, submittedBy: mInvest.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 5, note: "Q3 2024 — On track. Energy and Education entered.",       createdAt: monthsAgo(9),  submittedAt: monthsAgo(9),  approvedAt: monthsAgo(8) },
    { entityId: "kpi-1-1", enteredBy: mInvest.id, submittedBy: mInvest.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 6, note: "Q4 2024 — One more sector (Real Estate).",                createdAt: monthsAgo(6),  submittedAt: monthsAgo(6),  approvedAt: monthsAgo(5) },
    { entityId: "kpi-1-1", enteredBy: mInvest.id, submittedBy: mInvest.id, approvedBy: admin.id, status: KpiValueStatus.SUBMITTED, approvalType: KpiApprovalType.MANUAL, actualValue: 7, note: "Q1 2025 — Target reached! 7th sector (Technology) confirmed.", createdAt: daysAgo(3), submittedAt: daysAgo(3) },

    // ── KPI-1-2  CAGR New Investments (target 12%) ───────────────────────────
    { entityId: "kpi-1-2", enteredBy: mInvest.id, submittedBy: mInvest.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 6.2,  note: "FY 2022 — Below target, new investment cycle starting.",       createdAt: monthsAgo(24), submittedAt: monthsAgo(24), approvedAt: monthsAgo(23) },
    { entityId: "kpi-1-2", enteredBy: mInvest.id, submittedBy: mInvest.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 8.7,  note: "FY 2023 — Growth improved following portfolio restructuring.",  createdAt: monthsAgo(12), submittedAt: monthsAgo(12), approvedAt: monthsAgo(11) },
    { entityId: "kpi-1-2", enteredBy: mInvest.id, submittedBy: mInvest.id, approvedBy: admin.id, status: KpiValueStatus.SUBMITTED, approvalType: KpiApprovalType.MANUAL, actualValue: 10.4, note: "FY 2024 — Approaching target, new sectors contributing.",      createdAt: daysAgo(5),    submittedAt: daysAgo(5) },

    // ── KPI-2-1  ROI vs Market Average (target 15%, calculated) ─────────────
    { entityId: "kpi-2-1", enteredBy: mInvest.id, submittedBy: mInvest.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 3.1,  note: "Q2 2024 — Portfolio +9.1%, market +6.0%.",                     createdAt: monthsAgo(12), submittedAt: monthsAgo(12), approvedAt: monthsAgo(11),
      varValues: [{ variableId: varPortfolioReturn.id, value: 9.1 }, { variableId: varMarketReturn.id, value: 6.0 }] },
    { entityId: "kpi-2-1", enteredBy: mInvest.id, submittedBy: mInvest.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 5.4,  note: "Q3 2024 — Portfolio +12.4%, market +7.0%.",                    createdAt: monthsAgo(9),  submittedAt: monthsAgo(9),  approvedAt: monthsAgo(8),
      varValues: [{ variableId: varPortfolioReturn.id, value: 12.4 }, { variableId: varMarketReturn.id, value: 7.0 }] },
    { entityId: "kpi-2-1", enteredBy: mInvest.id, submittedBy: mInvest.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 7.2,  note: "Q4 2024 — Strong outperformance. Portfolio +15.2%, market +8%.", createdAt: monthsAgo(6), submittedAt: monthsAgo(6), approvedAt: monthsAgo(5),
      varValues: [{ variableId: varPortfolioReturn.id, value: 15.2 }, { variableId: varMarketReturn.id, value: 8.0 }] },
    { entityId: "kpi-2-1", enteredBy: mInvest.id, submittedBy: mInvest.id, approvedBy: admin.id, status: KpiValueStatus.SUBMITTED, approvalType: KpiApprovalType.MANUAL, actualValue: 9.8, note: "Q1 2025 — Best quarter yet. Portfolio +18.3%, market +8.5%.",  createdAt: daysAgo(2),   submittedAt: daysAgo(2),
      varValues: [{ variableId: varPortfolioReturn.id, value: 18.3 }, { variableId: varMarketReturn.id, value: 8.5 }] },

    // ── KPI-3-1  Total Revenue (target 500 SAR M, variable-driven) ───────────
    { entityId: "kpi-3-1", enteredBy: mFinance.id, submittedBy: mFinance.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 320, note: "Q1 2024 — Revenue inline with budget.",                      createdAt: monthsAgo(15), submittedAt: monthsAgo(15), approvedAt: monthsAgo(14),
      varValues: [{ variableId: varRevenue.id, value: 320 }] },
    { entityId: "kpi-3-1", enteredBy: mFinance.id, submittedBy: mFinance.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 355, note: "Q2 2024 — 10.9% growth QoQ.",                                 createdAt: monthsAgo(12), submittedAt: monthsAgo(12), approvedAt: monthsAgo(11),
      varValues: [{ variableId: varRevenue.id, value: 355 }] },
    { entityId: "kpi-3-1", enteredBy: mFinance.id, submittedBy: mFinance.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 390, note: "Q3 2024 — New investment dividends contributing.",            createdAt: monthsAgo(9),  submittedAt: monthsAgo(9),  approvedAt: monthsAgo(8),
      varValues: [{ variableId: varRevenue.id, value: 390 }] },
    { entityId: "kpi-3-1", enteredBy: mFinance.id, submittedBy: mFinance.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 430, note: "Q4 2024 — Record quarter.",                                   createdAt: monthsAgo(6),  submittedAt: monthsAgo(6),  approvedAt: monthsAgo(5),
      varValues: [{ variableId: varRevenue.id, value: 430 }] },
    { entityId: "kpi-3-1", enteredBy: mFinance.id, submittedBy: mFinance.id, approvedBy: admin.id, status: KpiValueStatus.SUBMITTED, approvalType: KpiApprovalType.MANUAL, actualValue: 468, note: "Q1 2025 — On track to hit 500M annual target.",             createdAt: daysAgo(1),    submittedAt: daysAgo(1),
      varValues: [{ variableId: varRevenue.id, value: 468 }] },

    // ── KPI-4-1  System Compliance (target 100%) — includes a REJECTED ───────
    { entityId: "kpi-4-1", enteredBy: mFinance.id, submittedBy: mFinance.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 72, note: "Q1 2024 — Multiple legacy system gaps identified.",            createdAt: monthsAgo(15), submittedAt: monthsAgo(15), approvedAt: monthsAgo(14) },
    { entityId: "kpi-4-1", enteredBy: mFinance.id, submittedBy: mFinance.id, approvedBy: admin.id, status: KpiValueStatus.SUBMITTED, approvalType: KpiApprovalType.MANUAL, actualValue: 78, note: "Q2 2024 — REJECTED: Submitted 78% but reviewer found calculation errors. Pending correction.", createdAt: monthsAgo(12), submittedAt: monthsAgo(12), approvedAt: monthsAgo(11) },
    { entityId: "kpi-4-1", enteredBy: mFinance.id, submittedBy: mFinance.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 85, note: "Q3 2024 — Resubmitted after correction.",                       createdAt: monthsAgo(9),  submittedAt: monthsAgo(9),  approvedAt: monthsAgo(8) },
    { entityId: "kpi-4-1", enteredBy: mFinance.id, submittedBy: mFinance.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 93, note: "Q4 2024 — ERP rollout phase 1 complete.",                      createdAt: monthsAgo(6),  submittedAt: monthsAgo(6),  approvedAt: monthsAgo(5) },
    { entityId: "kpi-4-1", enteredBy: mFinance.id, submittedBy: mFinance.id, approvedBy: admin.id, status: KpiValueStatus.SUBMITTED, approvalType: KpiApprovalType.MANUAL, actualValue: 97, note: "Q1 2025 — Near full compliance, 2 legacy modules remaining.", createdAt: daysAgo(4),    submittedAt: daysAgo(4) },

    // ── KPI-5-1  Governance Compliance (target 100%) ─────────────────────────
    { entityId: "kpi-5-1", enteredBy: mAudit.id, submittedBy: mAudit.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 72, note: "Q1 2024 — Baseline audit completed.",                 createdAt: monthsAgo(15), submittedAt: monthsAgo(15), approvedAt: monthsAgo(14) },
    { entityId: "kpi-5-1", enteredBy: mAudit.id, submittedBy: mAudit.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 85, note: "Q2 2024 — Board charter fully implemented.",          createdAt: monthsAgo(12), submittedAt: monthsAgo(12), approvedAt: monthsAgo(11) },
    { entityId: "kpi-5-1", enteredBy: mAudit.id, submittedBy: mAudit.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 92, note: "Q3 2024 — External audit passed with minor findings.", createdAt: monthsAgo(9),  submittedAt: monthsAgo(9),  approvedAt: monthsAgo(8) },
    { entityId: "kpi-5-1", enteredBy: mAudit.id, submittedBy: mAudit.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 98, note: "Q4 2024 — All critical findings closed.",             createdAt: monthsAgo(6),  submittedAt: monthsAgo(6),  approvedAt: monthsAgo(5) },
    { entityId: "kpi-5-1", enteredBy: mAudit.id, submittedBy: mAudit.id, approvedBy: admin.id, status: KpiValueStatus.SUBMITTED, approvalType: KpiApprovalType.MANUAL, actualValue: 100, note: "Q1 2025 — Full compliance achieved!",              createdAt: daysAgo(6),    submittedAt: daysAgo(6) },

    // ── KPI-6-1  Training Participation (target 80%) ──────────────────────────
    { entityId: "kpi-6-1", enteredBy: mHr.id, submittedBy: mHr.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 55, note: "FY 2022 — Low participation, L&D budget cut.",       createdAt: monthsAgo(24), submittedAt: monthsAgo(24), approvedAt: monthsAgo(23) },
    { entityId: "kpi-6-1", enteredBy: mHr.id, submittedBy: mHr.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 64, note: "FY 2023 — Mandatory training program launched.",      createdAt: monthsAgo(12), submittedAt: monthsAgo(12), approvedAt: monthsAgo(11) },
    { entityId: "kpi-6-1", enteredBy: mHr.id, submittedBy: mHr.id, approvedBy: admin.id, status: KpiValueStatus.SUBMITTED, approvalType: KpiApprovalType.MANUAL, actualValue: 74, note: "FY 2024 — Good progress; e-learning platform helped.", createdAt: daysAgo(7),    submittedAt: daysAgo(7) },

    // ── KPI-6-2  Culture Index (target 85) — includes a REJECTED ─────────────
    { entityId: "kpi-6-2", enteredBy: mHr.id, submittedBy: mHr.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 60, note: "FY 2022 — Baseline survey.",                                    createdAt: monthsAgo(24), submittedAt: monthsAgo(24), approvedAt: monthsAgo(23) },
    { entityId: "kpi-6-2", enteredBy: mHr.id, submittedBy: mHr.id, approvedBy: admin.id, status: KpiValueStatus.SUBMITTED, approvalType: KpiApprovalType.MANUAL, actualValue: 90, note: "FY 2023 — REJECTED: Score rejected — sample size too small (n=12). Pending full survey.", createdAt: monthsAgo(12), submittedAt: monthsAgo(12), approvedAt: monthsAgo(11) },
    { entityId: "kpi-6-2", enteredBy: mHr.id, submittedBy: mHr.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 68, note: "FY 2023 — Corrected: full org survey (n=450) conducted.",   createdAt: monthsAgo(8),  submittedAt: monthsAgo(8),  approvedAt: monthsAgo(7) },
    { entityId: "kpi-6-2", enteredBy: mHr.id, submittedBy: mHr.id, approvedBy: admin.id, status: KpiValueStatus.SUBMITTED, approvalType: KpiApprovalType.MANUAL, actualValue: 71, note: "FY 2024 — Improvement after values campaign, below target.", createdAt: daysAgo(8),    submittedAt: daysAgo(8) },

    // ── KPI-7-1  Brand Value Growth (target 20%) ──────────────────────────────
    { entityId: "kpi-7-1", enteredBy: mStrat.id, submittedBy: mStrat.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 8,  note: "FY 2022 — Baseline valuation.",                  createdAt: monthsAgo(24), submittedAt: monthsAgo(24), approvedAt: monthsAgo(23) },
    { entityId: "kpi-7-1", enteredBy: mStrat.id, submittedBy: mStrat.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 12, note: "FY 2023 — New brand guidelines drove uplift.",    createdAt: monthsAgo(12), submittedAt: monthsAgo(12), approvedAt: monthsAgo(11) },
    { entityId: "kpi-7-1", enteredBy: mStrat.id, submittedBy: mStrat.id, approvedBy: admin.id, status: KpiValueStatus.SUBMITTED, approvalType: KpiApprovalType.MANUAL, actualValue: 17, note: "FY 2024 — Strong growth, PR coverage expanded.", createdAt: daysAgo(4),    submittedAt: daysAgo(4) },

    // ── KPI-8-1  Brand Awareness Index (target 75) ────────────────────────────
    { entityId: "kpi-8-1", enteredBy: mStrat.id, submittedBy: mStrat.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 55, note: "FY 2022 — Baseline awareness survey.",                  createdAt: monthsAgo(24), submittedAt: monthsAgo(24), approvedAt: monthsAgo(23) },
    { entityId: "kpi-8-1", enteredBy: mStrat.id, submittedBy: mStrat.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 62, note: "FY 2023 — Social campaigns boosted recognition.",      createdAt: monthsAgo(12), submittedAt: monthsAgo(12), approvedAt: monthsAgo(11) },
    { entityId: "kpi-8-1", enteredBy: mStrat.id, submittedBy: mStrat.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 70, note: "FY 2024 — Good progress, 5 points from target.",        createdAt: daysAgo(20),   submittedAt: daysAgo(20),   approvedAt: daysAgo(15) },

    // ── KPI-8-2  Marketing Campaigns (target 4, COMPLETED) ───────────────────
    { entityId: "kpi-8-2", enteredBy: mStrat.id, submittedBy: mStrat.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 1, note: "Q1 2024 — National Day campaign.",       createdAt: monthsAgo(12), submittedAt: monthsAgo(12), approvedAt: monthsAgo(11) },
    { entityId: "kpi-8-2", enteredBy: mStrat.id, submittedBy: mStrat.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 2, note: "Q2 2024 — Ramadan campaign launched.",    createdAt: monthsAgo(9),  submittedAt: monthsAgo(9),  approvedAt: monthsAgo(8) },
    { entityId: "kpi-8-2", enteredBy: mStrat.id, submittedBy: mStrat.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 3, note: "Q3 2024 — Digital campaign executed.",    createdAt: monthsAgo(6),  submittedAt: monthsAgo(6),  approvedAt: monthsAgo(5) },
    { entityId: "kpi-8-2", enteredBy: mStrat.id, submittedBy: mStrat.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.MANUAL, actualValue: 4, note: "Q4 2024 — Year-end campaign. Target met!", createdAt: daysAgo(30),   submittedAt: daysAgo(30),   approvedAt: daysAgo(25) },

    // ── KPI-9-1  IT Uptime (monthly, target 99.9%) ─────────────────────────────
    { entityId: "kpi-9-1", enteredBy: mIt.id, submittedBy: mIt.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.AUTO, actualValue: 99.7, note: "Oct 2024 — One unplanned outage.",         createdAt: monthsAgo(6),  submittedAt: monthsAgo(6),  approvedAt: monthsAgo(6) },
    { entityId: "kpi-9-1", enteredBy: mIt.id, submittedBy: mIt.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.AUTO, actualValue: 99.9, note: "Nov 2024 — Full uptime achieved.",         createdAt: monthsAgo(5),  submittedAt: monthsAgo(5),  approvedAt: monthsAgo(5) },
    { entityId: "kpi-9-1", enteredBy: mIt.id, submittedBy: mIt.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.AUTO, actualValue: 99.8, note: "Dec 2024 — Scheduled maintenance window.", createdAt: monthsAgo(4),  submittedAt: monthsAgo(4),  approvedAt: monthsAgo(4) },
    { entityId: "kpi-9-1", enteredBy: mIt.id, submittedBy: mIt.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.AUTO, actualValue: 100,  note: "Jan 2025 — Perfect month.",               createdAt: monthsAgo(3),  submittedAt: monthsAgo(3),  approvedAt: monthsAgo(3) },
    { entityId: "kpi-9-1", enteredBy: mIt.id, submittedBy: mIt.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.AUTO, actualValue: 99.9, note: "Feb 2025 — On target.",                   createdAt: monthsAgo(2),  submittedAt: monthsAgo(2),  approvedAt: monthsAgo(2) },
    { entityId: "kpi-9-1", enteredBy: mIt.id, submittedBy: mIt.id, approvedBy: admin.id, status: KpiValueStatus.APPROVED, approvalType: KpiApprovalType.AUTO, actualValue: 99.6, note: "Mar 2025 — DC migration caused 0.4% downtime.", createdAt: monthsAgo(1), submittedAt: monthsAgo(1), approvedAt: monthsAgo(1) },
    { entityId: "kpi-9-1", enteredBy: mIt.id, submittedBy: mIt.id, approvedBy: admin.id, status: KpiValueStatus.DRAFT,    approvalType: KpiApprovalType.AUTO, actualValue: 99.95,note: "Apr 2025 — Draft. Month not yet closed.",  createdAt: daysAgo(5) },
  ];

  let valueCount = 0;
  const createdValueIds: { entityValueId: string; entityId: string; status: KpiValueStatus }[] = []; // eslint-disable-line @typescript-eslint/no-unused-vars

  for (const p of periods) {
    const isApproved = p.status === KpiValueStatus.APPROVED;
    const ev = await prisma.entityValue.create({
      data: {
        entityId: p.entityId,
        actualValue: p.actualValue,
        finalValue: isApproved ? p.actualValue : null,
        status: p.status,
        approvalType: p.approvalType,
        note: p.note,
        enteredBy: p.enteredBy,
        submittedBy: p.status !== KpiValueStatus.DRAFT ? p.submittedBy : null,
        approvedBy: isApproved ? p.approvedBy : null,
        submittedAt: p.submittedAt ?? null,
        approvedAt: p.approvedAt ?? null,
        createdAt: p.createdAt,
      },
    });

    // variable values
    for (const vv of p.varValues ?? []) {
      await prisma.entityVariableValue.create({
        data: { entityValueId: ev.id, entityVariableId: vv.variableId, value: vv.value },
      });
    }

    createdValueIds.push({ entityValueId: ev.id, entityId: p.entityId, status: p.status });
    valueCount++;
  }

  console.log(`  ✓  entity values (${valueCount})`);

  // ── Notifications ─────────────────────────────────────────────────────────────
  //  Scenarios covered:
  //   • APPROVAL_PENDING  → sent to admin/approver when someone submits
  //   • VALUE_APPROVED    → sent to submitter when their value is approved
  //   • VALUE_REJECTED    → sent to submitter when their value is rejected

  type NotifSeed = {
    userId: string;
    type: NotificationType;
    entityId: string;
    message: string;
    messageAr: string;
    readAt: Date | null;
    createdAt: Date;
  };

  const notifs: NotifSeed[] = [
    // Pending approvals (unread — drives the bell badge)
    { userId: admin.id,  type: NotificationType.APPROVAL_PENDING, entityId: "kpi-1-1", message: "Faisal Al-Hamdan submitted KPI-1-1 (New Sectors Entered) for approval.", messageAr: "فيصل الحمدان أرسل مؤشر KPI-1-1 (القطاعات الجديدة) للاعتماد.", readAt: null, createdAt: daysAgo(3) },
    { userId: admin.id,  type: NotificationType.APPROVAL_PENDING, entityId: "kpi-2-1", message: "Faisal Al-Hamdan submitted KPI-2-1 (ROI vs Market) for approval.",         messageAr: "فيصل الحمدان أرسل مؤشر KPI-2-1 (العائد مقارنة بالسوق) للاعتماد.",  readAt: null, createdAt: daysAgo(2) },
    { userId: admin.id,  type: NotificationType.APPROVAL_PENDING, entityId: "kpi-3-1", message: "Rania Al-Dosari submitted KPI-3-1 (Total Revenue) for approval.",           messageAr: "رانيا الدوسري أرسلت مؤشر KPI-3-1 (الإيرادات الكلية) للاعتماد.",      readAt: null, createdAt: daysAgo(1) },
    { userId: admin.id,  type: NotificationType.APPROVAL_PENDING, entityId: "kpi-4-1", message: "Rania Al-Dosari submitted KPI-4-1 (System Compliance) for approval.",       messageAr: "رانيا الدوسري أرسلت مؤشر KPI-4-1 (الالتزام بالنظام) للاعتماد.",      readAt: null, createdAt: daysAgo(4) },
    { userId: admin.id,  type: NotificationType.APPROVAL_PENDING, entityId: "kpi-5-1", message: "Tariq Al-Zahrani submitted KPI-5-1 (Governance Compliance) for approval.",  messageAr: "طارق الزهراني أرسل مؤشر KPI-5-1 (الامتثال للحوكمة) للاعتماد.",       readAt: null, createdAt: daysAgo(6) },
    { userId: admin.id,  type: NotificationType.APPROVAL_PENDING, entityId: "kpi-6-1", message: "Nora Al-Otaibi submitted KPI-6-1 (Training Participation) for approval.",   messageAr: "نورة العتيبي أرسلت مؤشر KPI-6-1 (معدل التدريب) للاعتماد.",            readAt: null, createdAt: daysAgo(7) },
    { userId: admin.id,  type: NotificationType.APPROVAL_PENDING, entityId: "kpi-6-2", message: "Nora Al-Otaibi submitted KPI-6-2 (Culture Index) for approval.",            messageAr: "نورة العتيبي أرسلت مؤشر KPI-6-2 (مؤشر الثقافة) للاعتماد.",           readAt: null, createdAt: daysAgo(8) },
    { userId: admin.id,  type: NotificationType.APPROVAL_PENDING, entityId: "kpi-7-1", message: "Lina Al-Qahtani submitted KPI-7-1 (Brand Value Growth) for approval.",      messageAr: "لينا القحطاني أرسلت مؤشر KPI-7-1 (نمو قيمة العلامة) للاعتماد.",      readAt: null, createdAt: daysAgo(4) },
    { userId: admin.id,  type: NotificationType.APPROVAL_PENDING, entityId: "kpi-1-2", message: "Faisal Al-Hamdan submitted KPI-1-2 (CAGR New Investments) for approval.",   messageAr: "فيصل الحمدان أرسل مؤشر KPI-1-2 (معدل النمو السنوي) للاعتماد.",       readAt: null, createdAt: daysAgo(5) },

    // Approvals received by submitters (mix of read/unread)
    { userId: mInvest.id,  type: NotificationType.VALUE_APPROVED, entityId: "kpi-1-1", message: "Your submission for KPI-1-1 (New Sectors — Q4 2024) was approved.",          messageAr: "تم اعتماد تقديمك لمؤشر KPI-1-1 (القطاعات الجديدة — ق4 2024).",       readAt: daysAgo(10), createdAt: monthsAgo(5) },
    { userId: mInvest.id,  type: NotificationType.VALUE_APPROVED, entityId: "kpi-2-1", message: "Your submission for KPI-2-1 (ROI — Q4 2024) was approved.",                  messageAr: "تم اعتماد تقديمك لمؤشر KPI-2-1 (العائد — ق4 2024).",                  readAt: daysAgo(8),  createdAt: monthsAgo(5) },
    { userId: mFinance.id, type: NotificationType.VALUE_APPROVED, entityId: "kpi-3-1", message: "Your submission for KPI-3-1 (Revenue — Q4 2024) was approved.",              messageAr: "تم اعتماد تقديمك لمؤشر KPI-3-1 (الإيرادات — ق4 2024).",              readAt: null,        createdAt: monthsAgo(5) },
    { userId: mAudit.id,   type: NotificationType.VALUE_APPROVED, entityId: "kpi-5-1", message: "Your submission for KPI-5-1 (Governance — Q4 2024) was approved.",           messageAr: "تم اعتماد تقديمك لمؤشر KPI-5-1 (الحوكمة — ق4 2024).",               readAt: null,        createdAt: monthsAgo(5) },
    { userId: mHr.id,      type: NotificationType.VALUE_APPROVED, entityId: "kpi-6-1", message: "Your submission for KPI-6-1 (Training — FY 2023) was approved.",             messageAr: "تم اعتماد تقديمك لمؤشر KPI-6-1 (التدريب — ك2023).",                  readAt: daysAgo(15), createdAt: monthsAgo(11) },
    { userId: mStrat.id,   type: NotificationType.VALUE_APPROVED, entityId: "kpi-8-1", message: "Your submission for KPI-8-1 (Brand Awareness — FY 2024) was approved.",      messageAr: "تم اعتماد تقديمك لمؤشر KPI-8-1 (الوعي بالعلامة — ك2024).",          readAt: null,        createdAt: daysAgo(15) },
    { userId: mIt.id,      type: NotificationType.VALUE_APPROVED, entityId: "kpi-9-1", message: "Your submission for KPI-9-1 (IT Uptime — Mar 2025) was auto-approved.",      messageAr: "تم الاعتماد التلقائي لتقديمك لمؤشر KPI-9-1 (تشغيل الأنظمة — مار 2025).", readAt: null, createdAt: monthsAgo(1) },

    // Rejections received by submitters
    { userId: mFinance.id, type: NotificationType.VALUE_REJECTED, entityId: "kpi-4-1", message: "Your submission for KPI-4-1 (System Compliance — Q2 2024) was rejected. Reason: Calculation errors found. Please re-check and resubmit.", messageAr: "تم رفض تقديمك لمؤشر KPI-4-1 (ق2 2024). السبب: أخطاء في الحسابات. يرجى المراجعة وإعادة التقديم.", readAt: daysAgo(20), createdAt: monthsAgo(11) },
    { userId: mHr.id,      type: NotificationType.VALUE_REJECTED, entityId: "kpi-6-2", message: "Your submission for KPI-6-2 (Culture Index — FY 2023) was rejected. Reason: Sample size insufficient (n=12). Please conduct full survey.", messageAr: "تم رفض تقديمك لمؤشر KPI-6-2 (ك2023). السبب: حجم العينة غير كافٍ. يرجى إجراء مسح شامل.", readAt: null, createdAt: monthsAgo(11) },

    // CEO gets summary approvals notifications (read)
    { userId: ceo.id, type: NotificationType.VALUE_APPROVED, entityId: "kpi-3-1", message: "Revenue KPI (Q4 2024) approved — SAR 430M recorded.",          messageAr: "تم اعتماد مؤشر الإيرادات (ق4 2024) — تم تسجيل 430 مليون ريال.", readAt: daysAgo(2), createdAt: monthsAgo(5) },
    { userId: ceo.id, type: NotificationType.VALUE_APPROVED, entityId: "kpi-5-1", message: "Governance Compliance reached 98% (Q4 2024) — approved.",       messageAr: "بلغ الامتثال للحوكمة 98% (ق4 2024) — تم الاعتماد.",             readAt: daysAgo(1), createdAt: monthsAgo(5) },
    { userId: ceo.id, type: NotificationType.APPROVAL_PENDING, entityId: "kpi-2-1", message: "ROI vs Market (Q1 2025) awaiting your review.",               messageAr: "العائد مقارنة بالسوق (ق1 2025) بانتظار مراجعتك.",               readAt: null,       createdAt: daysAgo(2) },
  ];

  for (const n of notifs) {
    await prisma.notification.create({
      data: {
        userId: n.userId,
        orgId,
        type: n.type,
        entityId: n.entityId,
        message: n.message,
        messageAr: n.messageAr,
        readAt: n.readAt,
        createdAt: n.createdAt,
      },
    });
  }
  console.log(`  ✓  notifications (${notifs.length})`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`
✅  Demo seed complete
    Org domain  : ${domain}
    Password    : ${defaultPassword}
    Users
      admin@demo.rafed.local     → ADMIN
      ceo@demo.rafed.local       → EXECUTIVE
      cfo@demo.rafed.local       → MANAGER (Finance)
      investment@demo.rafed.local→ MANAGER (Investment)
      hr@demo.rafed.local        → MANAGER (HR)
      cio@demo.rafed.local       → MANAGER (IT)
      strategy@demo.rafed.local  → MANAGER (Strategy)
      audit@demo.rafed.local     → MANAGER (Audit)
    Entities    : 8 objectives + ${kpiDefs.length} KPIs
    Values      : ${valueCount} (mix of APPROVED/SUBMITTED/REJECTED/DRAFT)
    Unread notif: ${notifs.filter((n) => !n.readAt).length} unread notifications for bell testing
  `);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
