"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function KPIDetailPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; kpiId: string }>();

  useEffect(() => {
    const locale = String(params?.locale ?? "en");
    const kpiId = String(params?.kpiId ?? "");
    if (!kpiId) return;
    router.replace(`/${locale}/entities/kpi/${kpiId}`);
  }, [params?.kpiId, params?.locale, router]);

  return null;
}
