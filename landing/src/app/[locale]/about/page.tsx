"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function AboutPage() {
  const { locale, t } = useLocale();

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-16">
      <PageHeader
        title={t("aboutTitle")}
        subtitle={t("aboutProductDesc")}
        icon="tabler:info-circle"
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardContent className="p-6 space-y-2">
            <h3 className="font-semibold">{t("vision")}</h3>
            <p className="text-sm text-muted-foreground">{t("executiveClarity")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-2">
            <h3 className="font-semibold">{t("approach")}</h3>
            <p className="text-sm text-muted-foreground">{t("hierarchyDesc")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-2">
            <h3 className="font-semibold">{t("governance")}</h3>
            <p className="text-sm text-muted-foreground">{t("auditableDecisions")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-2">
            <h3 className="font-semibold">{t("alternatives")}</h3>
            <p className="text-sm text-muted-foreground">{t("bilingualRtlSupport")}</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="underline hover:text-foreground">
          {t("backToHome")}
        </Link>
      </p>
    </div>
  );
}
