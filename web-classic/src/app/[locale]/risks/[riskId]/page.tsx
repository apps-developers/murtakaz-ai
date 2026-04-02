"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/providers/locale-provider";
import { getOrgEntityDetail } from "@/actions/entities";

type EntityDetail = NonNullable<Awaited<ReturnType<typeof getOrgEntityDetail>>>;

export default function RiskDetailPage() {
  const params = useParams<{ riskId: string }>();
  const { locale, isArabic, t } = useLocale();
  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getOrgEntityDetail({ entityId: params.riskId })
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [params.riskId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-foreground">
        <p className="text-sm text-muted-foreground">{t("loadingRisk")}</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-foreground">
        <p className="text-sm text-muted-foreground">{t("riskNotFound")}</p>
        <Link
          href={`/${locale}/risks`}
          className="mt-3 inline-flex text-sm font-semibold text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary/70"
        >
          {t("backToRisks")}
        </Link>
      </div>
    );
  }

  const { entity } = detail;
  const title = isArabic ? entity.titleAr ?? entity.title : entity.title;
  const description = isArabic ? entity.descriptionAr ?? entity.description : entity.description;

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        subtitle={`${entity.orgEntityType.name} • ${entity.status}`}
        icon={<Icon name="tabler:shield-exclamation" className="h-5 w-5" />}
      />

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="border border-border bg-card/50">
          <TabsTrigger value="summary" className="data-[state=active]:bg-muted/30 data-[state=active]:text-foreground">
            {t("summary")}
          </TabsTrigger>
          <TabsTrigger value="values" className="data-[state=active]:bg-muted/30 data-[state=active]:text-foreground">
            {t("values")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:info-circle" className="h-4 w-4 text-foreground" />
                {t("summary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("status")}</p>
                <p className="mt-1">{entity.status}</p>
              </div>
              {entity.key && (
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("code")}</p>
                  <p className="mt-1">{entity.key}</p>
                </div>
              )}
              {description && (
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("description")}</p>
                  <p className="mt-1">{description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:bolt" className="h-4 w-4 text-foreground" />
                {t("quickLinks")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link
                href={`/${locale}/risks`}
                className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
              >
                <p className="font-semibold text-foreground">{t("backToRisks")}</p>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="values">
          <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:history" className="h-4 w-4 text-foreground" />
                {t("history")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {entity.values.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noItemsYet")}</p>
              ) : (
                entity.values.map((v) => (
                  <div key={v.id} className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">
                      {v.finalValue ?? v.calculatedValue ?? v.actualValue ?? "—"}
                      {entity.unit ? ` ${entity.unit}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {v.status} • {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
