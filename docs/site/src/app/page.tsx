import { Sidebar } from "@/components/Sidebar";
import { BookOpen, FileText, ChevronLeft } from "lucide-react";
import Link from "next/link";

const docs = [
  { title: "البدء والدخول", href: "/01-getting-started", desc: "تسجيل الدخول، تغيير اللغة، التنقل الرئيسي، المساعد الذكي" },
  { title: "الأدوار والصلاحيات", href: "/02-roles-and-permissions", desc: "ما يمكن لكل دور رؤيته وتنفيذه" },
  { title: "صفحة النظرة العامة", href: "/03-overview-page", desc: "قراءة ملخصك التنفيذي الشخصي" },
  { title: "الكيانات ومؤشرات الأداء", href: "/04-entities-and-kpis", desc: "تصفح مؤشرات الأداء وعناصر الاستراتيجية" },
  { title: "إدخال قيم مؤشرات الأداء", href: "/05-entering-kpi-values", desc: "دورة عمل: مسودة ← إرسال ← اعتماد" },
  { title: "الاعتمادات", href: "/06-approvals", desc: "مراجعة قيم مؤشرات الأداء المُرسَلة" },
  { title: "لوحات المتابعة", href: "/07-dashboards", desc: "جميع لوحات المتابعة المتاحة" },
  { title: "التقارير والتحليلات", href: "/10-reports", desc: "التقارير التحليلية والتصدير" },
  { title: "المسؤوليات", href: "/11-responsibilities", desc: "إدارة تكليفات المستخدمين بالكيانات" },
  { title: "الإدارات", href: "/12-departments", desc: "إدارة الهيكل التنظيمي والأقسام" },
  { title: "المشاريع", href: "/13-projects", desc: "إدارة محفظة المشاريع" },
  { title: "المخاطر", href: "/14-risks", desc: "إدارة سجل المخاطر المؤسسية" },
  { title: "الركائز والأهداف", href: "/15-pillars-and-objectives", desc: "التخطيط الاستراتيجي" },
  { title: "المؤسسة", href: "/16-organization", desc: "إعدادات وإدارة المؤسسة" },
  { title: "دليل المسؤول", href: "/08-admin-guide", desc: "إدارة المستخدمين والإعدادات المتقدمة" },
  { title: "المسرد", href: "/09-glossary", desc: "المصطلحات والمفاهيم الأساسية" },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 lg:mr-72">
        {/* Mobile Spacing */}
        <div className="h-14 lg:hidden" />

        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 lg:py-12">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <BookOpen className="h-8 w-8" />
            </div>
            <h1 className="mb-4 text-4xl font-bold text-slate-900">
              دليل مستخدم رافد KPI
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              دليل شامل لاستخدام منصة رافد KPI لإدارة الأداء المؤسسي وتنفيذ الاستراتيجية
            </p>
          </div>

          {/* Quick Start */}
          <div className="mb-12 rounded-xl bg-slate-50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">البدء السريع</h2>
            <ol className="mr-5 list-decimal space-y-2 text-slate-700">
              <li>تصفح الدليل من القائمة على اليمين</li>
              <li>استخدم زر <strong>طباعة الصفحة</strong> للحصول على نسخة ورقية</li>
              <li>جميع الصفحات متوافقة مع الطباعة ومحسّنة للقراءة</li>
            </ol>
          </div>

          {/* Documentation Grid */}
          <div className="mb-12">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">محتويات الدليل</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {docs.map((doc) => (
                <Link
                  key={doc.href}
                  href={doc.href}
                  className="group flex items-start gap-3 rounded-lg border bg-white p-4 transition-colors hover:border-blue-300 hover:bg-blue-50"
                >
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-700">
                      {doc.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">{doc.desc}</p>
                  </div>
                  <ChevronLeft className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-blue-600" />
                </Link>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="mb-12 grid gap-6 sm:grid-cols-3">
            <div className="rounded-lg border bg-white p-4 text-center">
              <div className="mb-2 text-2xl">📱</div>
              <h3 className="font-semibold text-slate-900">متوافق مع الجوال</h3>
              <p className="mt-1 text-sm text-slate-600">تصفح الدليل على أي جهاز</p>
            </div>
            <div className="rounded-lg border bg-white p-4 text-center">
              <div className="mb-2 text-2xl">🖨️</div>
              <h3 className="font-semibold text-slate-900">جاهز للطباعة</h3>
              <p className="mt-1 text-sm text-slate-600">نسخة ورقية منظمة</p>
            </div>
            <div className="rounded-lg border bg-white p-4 text-center">
              <div className="mb-2 text-2xl">🔍</div>
              <h3 className="font-semibold text-slate-900">بحث سريع</h3>
              <p className="mt-1 text-sm text-slate-600">ابحث في جميع الصفحات</p>
            </div>
          </div>

          {/* Footer */}
          <footer className="border-t pt-8 text-center text-sm text-slate-600 no-print">
            <p>دليل استخدام منصة رافد KPI © 2025</p>
            <p className="mt-1">جميع الحقوق محفوظة</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
