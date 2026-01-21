"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CreateKpiPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();

  useEffect(() => {
    const locale = String(params?.locale ?? "en");
    router.replace(`/${locale}/entities/kpi/new`);
  }, [params?.locale, router]);

  return null;
}
