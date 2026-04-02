"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExecutiveSummaryReport } from "@/components/reports/executive-summary-report";
import { KpiPerformanceReport } from "@/components/reports/kpi-performance-report";
import { StrategicAlignmentReport } from "@/components/reports/strategic-alignment-report";
import { TabularReport } from "@/components/reports/tabular-report";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyOrganizationEntityTypes } from "@/actions/navigation";
import { 
  LayoutDashboard, 
  Building2,
  Activity,
  Table2,
} from "lucide-react";

type EntityType = { code: string; name: string; nameAr: string | null; sortOrder?: number };

export default function ReportsPage() {
  const { locale, t, tr } = useLocale();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("executive");
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  // Fetch entity types from the organization
  const loadEntityTypes = useCallback(async () => {
    if (!user) return;
    setLoadingTypes(true);
    try {
      const types = await getMyOrganizationEntityTypes();
      setEntityTypes(types);
    } catch (error) {
      console.error("Failed to load entity types:", error);
      setEntityTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadEntityTypes();
    }
  }, [user, loadEntityTypes]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("noActiveSession")}</p>
        <Link 
          href={`/${locale}/auth/login`} 
          className="mt-3 inline-flex text-sm font-semibold text-foreground underline"
        >
          {t("goToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={tr("Reports & Analytics", "التقارير والتحليلات")}
          breadcrumbs={[{ label: tr("Reports", "التقارير") }]}
          subtitle={tr(
            "Comprehensive performance reports with visualizations and insights.",
            "تقارير شاملة للأداء مع التصورات البيانية والرؤى."
          )}
          icon={<Icon name="tabler:report-analytics" className="h-5 w-5" />}
        />
      </div>

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" dir={locale === "ar" ? "rtl" : "ltr"}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:w-fit">
          <TabsTrigger value="executive" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">{tr("Executive", "تنفيذي")}</span>
          </TabsTrigger>
          <TabsTrigger value="strategic" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{tr("Strategic", "استراتيجي")}</span>
          </TabsTrigger>
          <TabsTrigger value="kpi" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">{tr("KPIs", "المؤشرات")}</span>
          </TabsTrigger>
          <TabsTrigger value="tabular" className="gap-2">
            <Table2 className="h-4 w-4" />
            <span className="hidden sm:inline">{tr("Tabular", "جدولي")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Executive Summary Tab */}
        <TabsContent value="executive" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{tr("Executive Summary", "الملخص التنفيذي")}</h2>
            <p className="text-sm text-muted-foreground ms-2">
              {tr("High-level overview of organizational performance", "نظرة عامة عالية المستوى على أداء المؤسسة")}
            </p>
          </div>
          {loadingTypes ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          ) : (
            <ExecutiveSummaryReport entityTypes={entityTypes} />
          )}
        </TabsContent>

        {/* Strategic Alignment Tab */}
        <TabsContent value="strategic" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{tr("Strategic Alignment", "المحاذاة الاستراتيجية")}</h2>
            <p className="text-sm text-muted-foreground ms-2">
              {tr("Pillar and objective achievement tracking", "تتبع إنجاز الركائز والأهداف")}
            </p>
          </div>
          {loadingTypes ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <StrategicAlignmentReport entityTypes={entityTypes} />
          )}
        </TabsContent>

        {/* KPI Performance Tab */}
        <TabsContent value="kpi" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{tr("KPI Performance", "أداء المؤشرات")}</h2>
            <p className="text-sm text-muted-foreground ms-2">
              {tr("Detailed KPI analysis with trends", "تحليل مفصل للمؤشرات مع الاتجاهات")}
            </p>
          </div>
          {loadingTypes ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          ) : (
            <KpiPerformanceReport entityTypes={entityTypes} />
          )}
        </TabsContent>

        {/* Tabular Report Tab */}
        <TabsContent value="tabular" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Table2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{tr("Tabular Report", "التقرير الجدولي")}</h2>
            <p className="text-sm text-muted-foreground ms-2">
              {tr("Cross-entity KPI performance view with filters and export", "عرض أداء المؤشرات عبر العناصر مع التصفية والتصدير")}
            </p>
          </div>
          {loadingTypes ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <TabularReport entityTypes={entityTypes} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
