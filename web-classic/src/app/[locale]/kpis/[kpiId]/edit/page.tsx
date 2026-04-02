"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditKpiPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; kpiId: string }>();

  useEffect(() => {
    const locale = String(params?.locale ?? "en");
    const kpiId = String(params?.kpiId ?? "");
    if (!kpiId) return;
    router.replace(`/${locale}/entities/kpi/${kpiId}/edit`);
  }, [params?.kpiId, params?.locale, router]);

  return null;
}
