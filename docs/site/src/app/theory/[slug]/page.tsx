import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import { join } from "path";
import { DocPage } from "@/components/DocPage";

interface TheoryPageProps {
  params: Promise<{ slug: string }>;
}

// List of valid theory documentation files
const validTheoryDocs = [
  "01-strategy-execution-foundations",
  "02-kpi-design-and-measurement",
  "03-performance-management-frameworks",
  "04-governance-and-approvals",
  "05-organizational-health-and-rag",
];

export async function generateStaticParams() {
  return validTheoryDocs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: TheoryPageProps) {
  const { slug } = await params;
  const titles: Record<string, string> = {
    "01-strategy-execution-foundations": "أسس تنفيذ الاستراتيجية",
    "02-kpi-design-and-measurement": "تصميم مؤشرات الأداء وقياسها",
    "03-performance-management-frameworks": "أطر إدارة الأداء",
    "04-governance-and-approvals": "حوكمة البيانات والاعتمادات",
    "05-organizational-health-and-rag": "الصحة المؤسسية ونظام التصنيف اللوني",
  };

  return {
    title: `${titles[slug] || slug} - الخلفية النظرية -  المؤشرات KPI`,
  };
}

export default async function TheoryDocumentationPage({ params }: TheoryPageProps) {
  const { slug } = await params;

  if (!validTheoryDocs.includes(slug)) {
    notFound();
  }

  const filePath = join(
    process.cwd(),
    "..",
    "user-docs",
    "theory",
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
    "01-strategy-execution-foundations": "أسس تنفيذ الاستراتيجية",
    "02-kpi-design-and-measurement": "تصميم مؤشرات الأداء وقياسها",
    "03-performance-management-frameworks": "أطر إدارة الأداء",
    "04-governance-and-approvals": "حوكمة البيانات والاعتمادات",
    "05-organizational-health-and-rag": "الصحة المؤسسية ونظام التصنيف اللوني",
  };

  return <DocPage title={titles[slug] || slug} content={content} />;
}
