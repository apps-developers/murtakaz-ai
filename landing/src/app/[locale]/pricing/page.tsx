"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function PricingPage() {
  const { locale, t } = useLocale();

  const tiers = [
    {
      name: t("strategyOffice"),
      features: [t("coreFeatures"), t("roleBasedDashboards"), t("governanceAndApprovals")],
    },
    {
      name: t("executive"),
      features: [t("executiveDashboard"), t("exportsAndReporting"), t("bilingualRtlSupport")],
    },
    {
      name: t("enterprise"),
      features: [t("ssoIntegrationsMultiOrg"), t("executiveDashboardsAndGovernance"), t("initiativesAndKpiGovernance")],
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-16">
      <PageHeader
        title={t("pricingTitle")}
        subtitle={t("pricingSubtitle")}
        icon="tabler:currency-dollar"
      />

      <div className="grid gap-6 sm:grid-cols-3">
        {tiers.map((tier) => (
          <Card key={tier.name}>
            <CardHeader>
              <CardTitle>{tier.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {tier.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <a href={`${APP_URL}/${locale}/auth/login`}>
                <Button className="w-full">{t("requestDemo")}</Button>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
