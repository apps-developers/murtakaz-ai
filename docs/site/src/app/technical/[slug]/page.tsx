import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import { join } from "path";
import { DocPage } from "@/components/DocPage";

interface TechDocPageProps {
  params: Promise<{ slug: string }>;
}

// List of valid technical documentation files
const validTechDocs = [
  "01-tech-stack",
  "02-architecture",
  "03-development",
  "04-deployment",
  "05-api",
  "06-data-model",
  "07-operations",
  "08-troubleshooting",
];

export async function generateStaticParams() {
  return validTechDocs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: TechDocPageProps) {
  const { slug } = await params;
  const titles: Record<string, string> = {
    "01-tech-stack": "نظرة على التقنية المستخدمة",
    "02-architecture": "معمارية النظام",
    "03-development": "دليل التطوير",
    "04-deployment": "دليل النشر",
    "05-api": "وثائق API",
    "06-data-model": "نموذج البيانات",
    "07-operations": "دليل التشغيل",
    "08-troubleshooting": "استكشاف الأخطاء التقنية",
  };

  return {
    title: `${titles[slug] || slug} - التوثيق التقني - دليل  المؤشرات KPI`,
  };
}

export default async function TechnicalDocumentationPage({ params }: TechDocPageProps) {
  const { slug } = await params;

  if (!validTechDocs.includes(slug)) {
    notFound();
  }

  const filePath = join(
    process.cwd(),
    "..",
    "technical",
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
    "01-tech-stack": "نظرة على التقنية المستخدمة",
    "02-architecture": "معمارية النظام",
    "03-development": "دليل التطوير",
    "04-deployment": "دليل النشر",
    "05-api": "وثائق API",
    "06-data-model": "نموذج البيانات",
    "07-operations": "دليل التشغيل",
    "08-troubleshooting": "استكشاف الأخطاء التقنية",
  };

  return <DocPage title={titles[slug] || slug} content={content} />;
}
