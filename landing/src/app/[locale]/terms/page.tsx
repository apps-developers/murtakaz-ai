"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function TermsPage() {
  const { locale, t } = useLocale();

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-16">
      <PageHeader
        title={t("termsTitle")}
        subtitle={t("termsSubtitle")}
        icon="tabler:file-text"
      />

      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="font-semibold">{t("termsGeneralTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("termsGeneralDesc")}</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>{t("termsBulletAuthorizedUse")}</li>
            <li>{t("termsBulletRbac")}</li>
            <li>{t("termsBulletAudit")}</li>
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
