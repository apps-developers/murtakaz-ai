import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import { join } from "path";
import { DocPage } from "@/components/DocPage";

interface DocPageProps {
  params: Promise<{ slug: string }>;
}

// List of valid documentation files
const validDocs = [
  "00-quick-reference",
  "01-getting-started",
  "02-roles-and-permissions",
  "03-overview-page",
  "04-entities-and-kpis",
  "05-entering-kpi-values",
  "06-approvals",
  "07-dashboards",
  "08-admin-guide",
  "09-glossary",
  "10-reports",
  "11-responsibilities",
  "12-departments",
  "13-projects",
  "14-risks",
  "15-pillars-and-objectives",
  "16-organization",
  "17-approval-workflow",
  "18-ai-assistant",
  "19-app-pages",
  "20-data-management",
  "21-user-journeys",
  "22-formulas-guide",
  "23-troubleshooting",
];

export async function generateStaticParams() {
  return validDocs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: DocPageProps) {
  const { slug } = await params;
  const titles: Record<string, string> = {
    "00-quick-reference": "المرجع السريع",
    "01-getting-started": "البدء والدخول",
    "02-roles-and-permissions": "الأدوار والصلاحيات",
    "03-overview-page": "صفحة النظرة العامة",
    "04-entities-and-kpis": "الكيانات ومؤشرات الأداء",
    "05-entering-kpi-values": "إدخال قيم مؤشرات الأداء",
    "06-approvals": "الاعتمادات",
    "07-dashboards": "لوحات المتابعة",
    "08-admin-guide": "دليل المسؤول",
    "09-glossary": "المسرد",
    "10-reports": "التقارير والتحليلات",
    "11-responsibilities": "المسؤوليات",
    "12-departments": "الإدارات",
    "13-projects": "المشاريع",
    "14-risks": "المخاطر",
    "15-pillars-and-objectives": "الركائز والأهداف",
    "16-organization": "المؤسسة",
    "17-approval-workflow": "سير عمل الموافقات",
    "18-ai-assistant": "المساعد الذكي (AI)",
    "19-app-pages": "صفحات التطبيق",
    "20-data-management": "إدارة البيانات",
    "21-user-journeys": "رحلات المستخدم",
    "22-formulas-guide": "دليل الصيغ الحسابية",
    "23-troubleshooting": "استكشاف الأخطاء",
  };

  return {
    title: `${titles[slug] || slug} - دليل  المؤشرات KPI`,
  };
}

export default async function DocumentationPage({ params }: DocPageProps) {
  const { slug } = await params;

  if (!validDocs.includes(slug)) {
    notFound();
  }

  const filePath = join(
    process.cwd(),
    "..",
    "user-docs",
    "ar",
    `${slug}.md`
  );

  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch {
    notFound();
  }

  const titles: Record<string, string> = {
    "00-quick-reference": "المرجع السريع",
    "01-getting-started": "البدء والدخول",
    "02-roles-and-permissions": "الأدوار والصلاحيات",
    "03-overview-page": "صفحة النظرة العامة",
    "04-entities-and-kpis": "الكيانات ومؤشرات الأداء",
    "05-entering-kpi-values": "إدخال قيم مؤشرات الأداء",
    "06-approvals": "الاعتمادات",
    "07-dashboards": "لوحات المتابعة",
    "08-admin-guide": "دليل المسؤول",
    "09-glossary": "المسرد",
    "10-reports": "التقارير والتحليلات",
    "11-responsibilities": "المسؤوليات",
    "12-departments": "الإدارات",
    "13-projects": "المشاريع",
    "14-risks": "المخاطر",
    "15-pillars-and-objectives": "الركائز والأهداف",
    "16-organization": "المؤسسة",
    "17-approval-workflow": "سير عمل الموافقات",
    "18-ai-assistant": "المساعد الذكي (AI)",
    "19-app-pages": "صفحات التطبيق",
    "20-data-management": "إدارة البيانات",
    "21-user-journeys": "رحلات المستخدم",
    "22-formulas-guide": "دليل الصيغ الحسابية",
    "23-troubleshooting": "استكشاف الأخطاء",
  };

  return <DocPage title={titles[slug] || slug} content={content} />;
}
