"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useLocale } from "@/providers/locale-provider";
import faqs from "@/content/faqs.json";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function FaqPage() {
  const { locale, t, isArabic } = useLocale();

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-16">
      <PageHeader
        title={t("faq")}
        subtitle={t("faqSubtitle")}
        icon="tabler:help-circle"
      />

      <div className="space-y-4">
        {faqs.map((item) => (
          <details
            key={item.id}
            className="group rounded-lg border border-border bg-card/50 px-5 py-4"
          >
            <summary className="cursor-pointer font-medium text-foreground">
              {isArabic ? item.questionAr : item.question}
            </summary>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {isArabic ? item.answerAr : item.answer}
            </p>
          </details>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <Link href={`/${locale}`} className="text-muted-foreground underline hover:text-foreground">
          {t("backToHome")}
        </Link>
        <a href={`${APP_URL}/${locale}/auth/login`} className="text-muted-foreground underline hover:text-foreground">
          {t("startTheDemo")}
        </a>
      </div>
    </div>
  );
}
