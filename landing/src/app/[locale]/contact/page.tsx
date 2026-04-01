"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function ContactPage() {
  const { locale, t } = useLocale();

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-16">
      <PageHeader
        title={t("contactTitle")}
        subtitle={t("contactSubtitle")}
        icon="tabler:mail"
      />

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold">{t("contactForm")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input placeholder={t("fullName")} />
            <Input placeholder={t("email")} type="email" />
          </div>
          <Textarea placeholder={t("describeNeeds")} rows={4} />
          <Button className="w-full sm:w-auto">{t("send")}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-2">
          <h3 className="font-semibold">{t("quickDemoLinks")}</h3>
          <p className="text-sm text-muted-foreground">{t("signInWithDemoPersonas")}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <a href={`${APP_URL}/${locale}/auth/login`}>
              <Button variant="outline" size="sm">{t("executive")}</Button>
            </a>
            <a href={`${APP_URL}/${locale}/auth/login`}>
              <Button variant="outline" size="sm">{t("strategyOffice")}</Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
