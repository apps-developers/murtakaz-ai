"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function CareersPage() {
  const { locale, t, isArabic } = useLocale();

  const roles = [
    { title: isArabic ? "مهندس واجهة أمامية" : "Frontend Engineer", type: isArabic ? "عن بُعد" : "Remote" },
    { title: isArabic ? "مهندس خلفية" : "Backend Engineer", type: isArabic ? "عن بُعد" : "Remote" },
    { title: isArabic ? "مصمم منتجات" : "Product Designer", type: isArabic ? "هجين" : "Hybrid" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-16">
      <PageHeader
        title={isArabic ? "الوظائف" : "Careers"}
        subtitle={isArabic ? "انضم إلى فريقنا" : "Join our team"}
        icon="tabler:briefcase"
      />

      <div className="space-y-4">
        {roles.map((role) => (
          <Card key={role.title}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="font-semibold">{role.title}</p>
                <p className="text-sm text-muted-foreground">{role.type}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="underline hover:text-foreground">
          {t("backToHome")}
        </Link>
      </p>
    </div>
  );
}
