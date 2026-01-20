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

const strategicObjectivesSeed: StrategicObjectiveMap = {
 strategic_objectives_map: [
  {
   goal_id: 1,
   goal_title: "توسيع المحفظة الاستثمارية عبر الدخول في 5 قطاعات جديدة بنهاية عام 2028",
   strategic_kpis: [
    {
     id: "1.1",
     title: "عدد القطاعات الجديدة",
     formula_avg_KPIs: [
      {
       department_kpi_name: "عدد القطاعات الجديدة",
       weight: "10%",
       unit: "عدد",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
     ],
    },
    {
     id: "1.2",
     title: "نسبة مساهمة القطاعات الجديدة في إجمالي المحفظة",
     formula_avg_KPIs: [
      {
       department_kpi_name: "عدد القطاعات الجديدة",
       weight: "10%",
       unit: "عدد",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة تحقيق العائد الاستثماري المستهدف",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة فجوة تحقيق العائد الاستثماري",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة نجاح المشاريع الاستثمارية",
       weight: "10%",
       unit: "%",
       frequency: "سنوي",
       page_source: 10,
      },
      {
       department_kpi_name: "نسبة المشاريع غير الناجحة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي",
       page_source: 10,
      },
     ],
    },
    {
     id: "1.3",
     title: "عدد الشراكات أو المشاريع الاستثمارية الجديدة",
     formula_avg_KPIs: [
      {
       department_kpi_name: "عدد القطاعات الجديدة",
       weight: "10%",
       unit: "عدد",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة نجاح المشاريع الاستثمارية",
       weight: "10%",
       unit: "%",
       frequency: "سنوي",
       page_source: 10,
      },
      {
       department_kpi_name: "نسبة المشاريع غير الناجحة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي",
       page_source: 10,
      },
     ],
    },
    {
     id: "1.4",
     title: "العائد على الاستثمارات الجديدة (ROI)",
     formula_avg_KPIs: [
      {
       department_kpi_name: "عدد القطاعات الجديدة",
       weight: "10%",
       unit: "عدد",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة تحقيق العائد الاستثماري المستهدف",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة فجوة تحقيق العائد الاستثماري",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي",
       page_source: 9,
      },
     ],
    },
   ],
  },
  {
   goal_id: 2,
   goal_title: "تعزيز الريادة الاستثمارية عبر إدارة محفظة استثمارية تحقق عائداً استثمارياً بنسبة 20% بنهاية عام 2028",
   strategic_kpis: [
    {
     id: "2.1",
     title: "العائد على الاستثمار",
     formula_avg_KPIs: [
      {
       department_kpi_name: "اجمالي الاستثمارات الجديدة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة الفرص الاستثمارية غير المستغلة",
       weight: "10%",
       unit: "%",
       frequency: "شهري/ربع سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة تحقيق العائد الاستثماري المستهدف",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة فجوة تحقيق العائد الاستثماري",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة النمو في المحفظة الاستثمارية",
       weight: "10%",
       unit: "ريال",
       frequency: "نصف سنوي/سنوي",
       page_source: 9,
      },
     ],
    },
    {
     id: "2.2",
     title: "العائد المركب السنوي",
     formula_avg_KPIs: [
      {
       department_kpi_name: "اجمالي الاستثمارات الجديدة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة الفرص الاستثمارية غير المستغلة",
       weight: "10%",
       unit: "%",
       frequency: "شهري/ربع سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة تحقيق العائد الاستثماري المستهدف",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة فجوة تحقيق العائد الاستثماري",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة النمو في المحفظة الاستثمارية",
       weight: "10%",
       unit: "ريال",
       frequency: "نصف سنوي/سنوي",
       page_source: 9,
      },
     ],
    },
    {
     id: "2.3",
     title: "نسبة التنوع",
     formula_avg_KPIs: [
      {
       department_kpi_name: "اجمالي الاستثمارات الجديدة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة الفرص الاستثمارية غير المستغلة",
       weight: "10%",
       unit: "%",
       frequency: "شهري/ربع سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة نجاح المشاريع الاستثمارية",
       weight: "10%",
       unit: "%",
       frequency: "سنوي",
       page_source: 10,
      },
      {
       department_kpi_name: "نسبة المشاريع غير الناجحة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي",
       page_source: 10,
      },
     ],
    },
    {
     id: "2.4",
     title: "نسبة مساهمة الاستثمارات الجديدة",
     formula_avg_KPIs: [
      {
       department_kpi_name: "اجمالي الاستثمارات الجديدة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة الفرص الاستثمارية غير المستغلة",
       weight: "10%",
       unit: "%",
       frequency: "شهري/ربع سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة تحقيق العائد الاستثماري المستهدف",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة فجوة تحقيق العائد الاستثماري",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة النمو في المحفظة الاستثمارية",
       weight: "10%",
       unit: "ريال",
       frequency: "نصف سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة نجاح المشاريع الاستثمارية",
       weight: "10%",
       unit: "%",
       frequency: "سنوي",
       page_source: 10,
      },
      {
       department_kpi_name: "نسبة المشاريع غير الناجحة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي",
       page_source: 10,
      },
     ],
    },
    {
     id: "2.5",
     title: "عدد الاستثمارات التي تحقق العائد",
     formula_avg_KPIs: [
      {
       department_kpi_name: "اجمالي الاستثمارات الجديدة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة الفرص الاستثمارية غير المستغلة",
       weight: "10%",
       unit: "%",
       frequency: "شهري/ربع سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة تحقيق العائد الاستثماري المستهدف",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة فجوة تحقيق العائد الاستثماري",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة النمو في المحفظة الاستثمارية",
       weight: "10%",
       unit: "ريال",
       frequency: "نصف سنوي/سنوي",
       page_source: 9,
      },
      {
       department_kpi_name: "نسبة نجاح المشاريع الاستثمارية",
       weight: "10%",
       unit: "%",
       frequency: "سنوي",
       page_source: 10,
      },
      {
       department_kpi_name: "نسبة المشاريع غير الناجحة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي",
       page_source: 10,
      },
     ],
    },
   ],
  },
  {
   goal_id: 3,
   goal_title: "رفع الإيرادات المستدامة للمجموعة لتصل إلى 200 مليون ريال بنهاية عام 2028",
   strategic_kpis: [
    {
     id: "3.1",
     title: "إجمالي الإيرادات السنوية",
     formula_avg_KPIs: [
      {
       department_kpi_name: "نمو الإيرادات المستدامة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
     ],
    },
    {
     id: "3.2",
     title: "نسبة الإيرادات المستدامة",
     formula_avg_KPIs: [
      {
       department_kpi_name: "نمو الإيرادات المستدامة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
     ],
    },
    {
     id: "3.3",
     title: "نسبة الانحراف عن المستهدف",
     formula_avg_KPIs: [
      {
       department_kpi_name: "نمو الإيرادات المستدامة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
     ],
    },
    {
     id: "3.4",
     title: "نسبة مساهمة القطاعات الجديدة في الإيرادات المستدامة",
     formula_avg_KPIs: [
      {
       department_kpi_name: "نمو الإيرادات المستدامة",
       weight: "10%",
       unit: "%",
       frequency: "ربع سنوي/سنوي",
       page_source: 9,
      },
     ],
    },
   ],
  },
  {
   goal_id: 4,
   goal_title: "تعزيز الانضباط المالي من خلال تعظيم كفاءة رأس المال وتطبيق نظام موحد لكفاءة الإنفاق",
   strategic_kpis: [
    { id: "4.1", title: "نسبة الالتزام بتطبيق النظام", formula_avg_KPIs: [] },
    { id: "4.2", title: "نسبة الانحرافات المالية", formula_avg_KPIs: [] },
    { id: "4.3", title: "معدل خفض الانحرافات المالية", formula_avg_KPIs: [] },
    { id: "4.4", title: "معدل الانخفاض في المصروفات غير المبررة", formula_avg_KPIs: [] },
    { id: "4.5", title: "عدد التقارير المالية الموحدة", formula_avg_KPIs: [] },
   ],
  },
  {
   goal_id: 5,
   goal_title: "رفع الجاهزية للإدراج من خلال رفع مستوى الحوكمة وتفعيل النموذج التشغيلي بحلول 2027",
   strategic_kpis: [
    { id: "5.1", title: "نسبة الامتثال لمتطلبات تقرير الجاهزية للإدراج", formula_avg_KPIs: [] },
    { id: "5.2", title: "نسبة تفعيل النموذج التشغيلي", formula_avg_KPIs: [] },
    { id: "5.3", title: "عدد المراجعات الداخلية والخارجية الناجحة", formula_avg_KPIs: [] },
   ],
  },
  {
   goal_id: 6,
   goal_title: "رفع مستوى الإنتاجية للموظفين بنسبة 85% بنهاية 2028",
   strategic_kpis: [
    { id: "6.1", title: "معدل المشاركة في الدورات التدريبية", formula_avg_KPIs: [] },
    { id: "6.2", title: "نسبة التحسن في إنتاجية الموظفين بعد التدريب", formula_avg_KPIs: [] },
    { id: "6.3", title: "نسبة الالتزام بالمدة الزمنية لتنفيذ المهام", formula_avg_KPIs: [] },
    { id: "6.4", title: "مؤشر الثقافة التنظيمية", formula_avg_KPIs: [] },
   ],
  },
  {
   goal_id: 7,
   goal_title: "تعزيز الوعي بالعلامة التجارية",
   strategic_kpis: [
    { id: "7.1", title: "مؤشر الوعي بالعلامة التجارية", formula_avg_KPIs: [] },
    { id: "7.2", title: "عدد المشاركات في الفعاليات والمؤتمرات", formula_avg_KPIs: [] },
    { id: "7.3", title: "معدل التفاعل الرقمي", formula_avg_KPIs: [] },
    { id: "7.4", title: "عدد الحملات التسويقية المنفذة سنوياً", formula_avg_KPIs: [] },
   ],
  },
 ],
};

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

 function sampleValueForVar(code: string) {
  switch (code) {
    case "value":
      return 68.5;
    case "impressions":
      return 85000;
    case "engagements":
      return 3400;
    case "participants":
      return 215;
    case "employees_total":
      return 280;
    case "subsidiaries_adopted":
      return 7;
    case "subsidiaries_total":
      return 10;
    default:
      return 100;
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

  const headInvestment = await ensureUser({
    orgId: org.id,
    email: "investment@almousa.local",
    password,
    name: "مدير الاستثمار",
    role: Role.MANAGER,
    managerId: ceo.id,
    title: "Head of Investment",
  });

  const deptKpiNameToMeta = new Map<string, { unit?: string; frequency?: string }>();
  const orderedDeptKpiNames: string[] = [];

  for (const obj of strategicObjectivesSeed.strategic_objectives_map) {
    for (const okpi of obj.strategic_kpis) {
      for (const link of okpi.formula_avg_KPIs ?? []) {
        const name = String(link.department_kpi_name ?? "").trim();
        if (!name) continue;
        if (!deptKpiNameToMeta.has(name)) {
          deptKpiNameToMeta.set(name, { unit: link.unit, frequency: link.frequency });
          orderedDeptKpiNames.push(name);
        }
      }
    }
  }

  // Target is 10 department KPIs (under Investment department)
  const deptKpiNames: string[] = orderedDeptKpiNames.slice(0, 10);
  while (deptKpiNames.length < 10) {
    deptKpiNames.push(`مؤشر مؤقت ${deptKpiNames.length + 1}`);
  }

  const deptKpiKeyByName = new Map<string, string>();
  const deptKpiKeys: string[] = [];

  for (let i = 0; i < deptKpiNames.length; i++) {
    const name = deptKpiNames[i];
    const key = `dept_investment_kpi_${String(i + 1).padStart(2, "0")}`;
    deptKpiKeyByName.set(name, key);
    deptKpiKeys.push(key);

    const meta = deptKpiNameToMeta.get(name);
    const periodType = periodTypeFromFrequency(meta?.frequency);
    const variableDataType = dataTypeFromUnit(meta?.unit);

    const deptKpi = await ensureEntity({
      orgId: org.id,
      orgEntityTypeId: kpiTypeId,
      key,
      title: name,
      titleAr: name,
      ownerUserId: headInvestment.id,
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType,
      unit: meta?.unit ?? null,
      unitAr: meta?.unit ?? null,
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
      variableValues: { value: 0 },
    });
  }

  await ensureEntity({
    orgId: org.id,
    orgEntityTypeId: deptTypeId,
    key: "dept_investment",
    title: "Investment Department",
    titleAr: "إدارة الاستثمار",
    ownerUserId: headInvestment.id,
    status: Status.ACTIVE,
    sourceType: KpiSourceType.DERIVED,
    periodType: KpiPeriodType.YEARLY,
    unit: "score",
    unitAr: "score",
    formula: buildAvgGetFormula(deptKpiKeys),
  });

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
          ? "0"
          : buildWeightedAvgGetFormula(links.map((l) => ({ key: l.deptKey as string, weight: l.weight })));

      await ensureEntity({
        orgId: org.id,
        orgEntityTypeId: kpiTypeId,
        key: okpi.id,
        title: okpi.title,
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
      title: obj.goal_title,
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
