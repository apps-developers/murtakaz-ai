"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function PrivacyPage() {
  const { locale, t } = useLocale();

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-16">
      <PageHeader
        title={t("privacyTitle")}
        subtitle={t("privacySubtitle")}
        icon="tabler:shield-lock"
      />

      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="font-semibold">{t("privacySummaryTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("privacySummaryDesc")}</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>{t("privacyBulletMinCollection")}</li>
            <li>{t("privacyBulletRbac")}</li>
            <li>{t("privacyBulletAudit")}</li>
          </ul>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="underline hover:text-foreground">
          {t("backToHome")}
        </Link>
      </p>
    </div>
  );
}
