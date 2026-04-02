"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, ChevronLeft, ChevronRight, FileText, GraduationCap, Home, Menu, Printer, X } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  file: string;
  isTheory?: boolean;
}

const navItems: NavItem[] = [
  { title: "الرئيسية", href: "/", file: "" },
  { title: "البدء والدخول", href: "/01-getting-started", file: "01-getting-started.md" },
  { title: "الأدوار والصلاحيات", href: "/02-roles-and-permissions", file: "02-roles-and-permissions.md" },
  { title: "صفحة النظرة العامة", href: "/03-overview-page", file: "03-overview-page.md" },
  { title: "الكيانات ومؤشرات الأداء", href: "/04-entities-and-kpis", file: "04-entities-and-kpis.md" },
  { title: "إدخال قيم مؤشرات الأداء", href: "/05-entering-kpi-values", file: "05-entering-kpi-values.md" },
  { title: "الاعتمادات", href: "/06-approvals", file: "06-approvals.md" },
  { title: "لوحات المتابعة", href: "/07-dashboards", file: "07-dashboards.md" },
  { title: "دليل المسؤول", href: "/08-admin-guide", file: "08-admin-guide.md" },
  { title: "المسرد", href: "/09-glossary", file: "09-glossary.md" },
  { title: "التقارير والتحليلات", href: "/10-reports", file: "10-reports.md" },
  { title: "المسؤوليات", href: "/11-responsibilities", file: "11-responsibilities.md" },
  { title: "الإدارات", href: "/12-departments", file: "12-departments.md" },
  { title: "المشاريع", href: "/13-projects", file: "13-projects.md" },
  { title: "المخاطر", href: "/14-risks", file: "14-risks.md" },
  { title: "الركائز والأهداف", href: "/15-pillars-and-objectives", file: "15-pillars-and-objectives.md" },
  { title: "المؤسسة", href: "/16-organization", file: "16-organization.md" },
  { title: "سير عمل الموافقات", href: "/17-approval-workflow", file: "17-approval-workflow.md" },
  { title: "المساعد الذكي (AI)", href: "/18-ai-assistant", file: "18-ai-assistant.md" },
];

const theoryItems: NavItem[] = [
  { title: "أسس تنفيذ الاستراتيجية", href: "/theory/01-strategy-execution-foundations", file: "01-strategy-execution-foundations.md", isTheory: true },
  { title: "تصميم مؤشرات الأداء", href: "/theory/02-kpi-design-and-measurement", file: "02-kpi-design-and-measurement.md", isTheory: true },
  { title: "أطر إدارة الأداء", href: "/theory/03-performance-management-frameworks", file: "03-performance-management-frameworks.md", isTheory: true },
  { title: "الحوكمة والاعتمادات", href: "/theory/04-governance-and-approvals", file: "04-governance-and-approvals.md", isTheory: true },
  { title: "الصحة المؤسسية وRAG", href: "/theory/05-organizational-health-and-rag", file: "05-organizational-health-and-rag.md", isTheory: true },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const currentIndex = navItems.findIndex((item) => item.href === pathname);
  const prevItem = currentIndex > 0 ? navItems[currentIndex - 1] : null;
  const nextItem = currentIndex < navItems.length - 1 ? navItems[currentIndex + 1] : null;

  return (
    <>
      {/* Mobile Header */}
      <div className="no-print fixed top-0 right-0 left-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <BookOpen className="h-5 w-5" />
          <span>دليل مرتكز KPI</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="rounded-md p-2 hover:bg-slate-100"
            aria-label="Print"
          >
            <Printer className="h-5 w-5" />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md p-2 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="no-print fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 transform overflow-y-auto border-l bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 lg:transform-none",
          mobileOpen ? "translate-x-0" : "translate-x-full",
          className
        )}
      >
        <div className="no-print flex h-full flex-col">
          {/* Header */}
          <div className="border-b px-4 py-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-900">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <span>دليل مرتكز KPI</span>
            </Link>
            <p className="mt-1 text-sm text-slate-600">منصة إدارة الأداء المؤسسي</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      pathname === item.href
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {item.href === "/" ? (
                      <Home className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    <span>{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Theory Docs Section */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="px-3 mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  الخلفية النظرية
                </span>
              </div>
              <ul className="space-y-1">
                {theoryItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                        pathname === item.href
                          ? "bg-amber-50 text-amber-700 font-medium"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <GraduationCap className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <button
              onClick={handlePrint}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" />
              <span>طباعة الصفحة</span>
            </button>

            {/* Prev/Next Navigation */}
            {(prevItem || nextItem) && (
              <div className="mt-4 flex items-center justify-between text-sm">
                {prevItem ? (
                  <Link
                    href={prevItem.href}
                    className="flex items-center gap-1 text-slate-600 hover:text-slate-900"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="truncate max-w-[80px]">{prevItem.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {nextItem && (
                  <Link
                    href={nextItem.href}
                    className="flex items-center gap-1 text-slate-600 hover:text-slate-900"
                  >
                    <span className="truncate max-w-[80px]">{nextItem.title}</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
