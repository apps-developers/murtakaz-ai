"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/providers/locale-provider";
import { recalculateAllDerivedEntities } from "@/actions/entities";
import { getOrgAdminOrganizationSettings } from "@/actions/org-admin";
import { getMyNotifications } from "@/actions/notifications";
import { Loader2, Calculator, Building2, Users, Activity } from "lucide-react";

interface OrgData {
  name: string;
  nameAr: string | null;
  domain: string | null;
  _count: {
    users: number;
  };
}

interface Notification {
  id: string;
  type: string;
  message: string;
  messageAr: string | null;
  entityId: string | null;
  entityValueId: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const { t, locale } = useLocale();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<{ calculated: number } | null>(null);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [orgResult, notifResult] = await Promise.all([
        getOrgAdminOrganizationSettings(),
        getMyNotifications(),
      ]);
      
      if (orgResult.org) {
        setOrgData(orgResult.org as OrgData);
      }
      setNotifications(notifResult.slice(0, 5));
      setIsLoading(false);
    }
    loadData();
  }, []);

  async function handleRecalculate() {
    setIsRecalculating(true);
    try {
      const result = await recalculateAllDerivedEntities();
      if (result.success) {
        setRecalcResult({ calculated: result.calculated });
      }
    } finally {
      setIsRecalculating(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("admin")}
        subtitle={t("adminSubtitle")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Organization Card - Real Data */}
        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t("organization")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">{t("basicDetailsAndGovernanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-foreground">
            {isLoading ? (
              <>
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </>
            ) : orgData ? (
              <>
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("orgName")}</p>
                  <p className="mt-1 text-foreground font-medium">{orgData.name}</p>
                  {orgData.nameAr && <p className="mt-1 text-muted-foreground text-xs">{orgData.nameAr}</p>}
                </div>
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("domain")}</p>
                  <p className="mt-1 text-foreground">{orgData.domain || "—"}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("userManagement")}</p>
                      <p className="mt-1 text-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {orgData._count.users} users
                      </p>
                    </div>
                    <Link
                      href={`/${locale}/admin/users`}
                      className="text-sm font-semibold text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary/70"
                    >
                      {t("openUsers")}
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No organization data available</p>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed - Real Notifications */}
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
                            {t("recentActivity") || "Recent Activity"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Latest updates and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            {isLoading ? (
              <>
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </>
            ) : notifications.length > 0 ? (
              notifications.map((notif) => (
                <div key={notif.id} className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="font-semibold text-foreground line-clamp-1">{notif.type.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {locale === "ar" && notif.messageAr ? notif.messageAr : notif.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {new Date(notif.createdAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center">
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI Calculations Card */}
        <Card className="border-border bg-card/50 shadow-sm lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              {t("kpiCalculations")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t("recalculateDerivedDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="w-full sm:w-auto"
            >
              {isRecalculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("recalculating") || "Recalculating..."}
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  {t("recalculateAll")}
                </>
              )}
            </Button>
            {recalcResult && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm">
                <p className="text-green-700">
                  ✅ Calculated {recalcResult.calculated} entities
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
