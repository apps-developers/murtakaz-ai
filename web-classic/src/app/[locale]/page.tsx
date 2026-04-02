"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";

export default function RootPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(`/${locale}/overview`);
    } else {
      router.replace(`/${locale}/auth/login`);
    }
  }, [user, loading, locale, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}